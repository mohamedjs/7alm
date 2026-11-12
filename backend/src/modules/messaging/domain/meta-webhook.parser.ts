import type { Attachment, Channel, CommentEvent, InboundMessageEvent, MetaEvent } from "./meta-events";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const asDate = (v: unknown): Date => {
  if (typeof v === "number") return new Date(v < 1e12 ? v * 1000 : v);
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n) && v.trim() !== "") return new Date(n < 1e12 ? n * 1000 : n);
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
};

const str = (v: unknown): string | undefined => (typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : undefined);

function messengerAttachments(list: unknown): Attachment[] {
  if (!Array.isArray(list)) return [];
  return list.map((a: Json) => ({ type: str(a?.type) ?? "file", url: str(a?.payload?.url) }));
}

/** Messenger (object=page) and Instagram (object=instagram) share the `messaging[]` shape. */
function parseMessaging(channel: "messenger" | "instagram", entry: Json, out: MetaEvent[]) {
  const businessId = str(entry.id);
  for (const m of Array.isArray(entry.messaging) ? entry.messaging : []) {
    const sender = str(m?.sender?.id);
    const recipient = str(m?.recipient?.id);
    if (m.message && sender && recipient) {
      const echo = Boolean(m.message.is_echo) || sender === businessId;
      const msg = m.message as Json;
      if (msg.is_deleted || msg.is_unsupported) continue;
      const attachments = messengerAttachments(msg.attachments);
      const ev: InboundMessageEvent = {
        kind: "message",
        channel,
        accountId: echo ? sender : recipient,
        contactId: echo ? recipient : sender,
        externalId: str(msg.mid) ?? `${sender}:${m.timestamp}`,
        text: str(msg.text) ?? null,
        type: str(msg.text) ? "text" : (attachments[0]?.type ?? "unknown"),
        attachments,
        at: asDate(m.timestamp),
        isEcho: echo,
      };
      out.push(ev);
    } else if (m.read && sender && recipient) {
      out.push({ kind: "read", channel, accountId: recipient, contactId: sender, watermark: asDate(m.read.watermark ?? m.timestamp) });
    } else if (m.delivery && Array.isArray(m.delivery.mids)) {
      for (const mid of m.delivery.mids) {
        if (str(mid)) out.push({ kind: "status", channel, externalId: mid, status: "delivered", at: asDate(m.delivery.watermark ?? m.timestamp) });
      }
    } else if (m.postback && sender && recipient) {
      // Button taps arrive as postbacks; surface them as text so the agent sees them.
      out.push({
        kind: "message",
        channel,
        accountId: recipient,
        contactId: sender,
        externalId: str(m.postback.mid) ?? `postback:${sender}:${m.timestamp}`,
        text: str(m.postback.title) ?? str(m.postback.payload) ?? null,
        type: "postback",
        attachments: [],
        at: asDate(m.timestamp),
        isEcho: false,
      });
    }
  }
}

/** Page `feed` changes: only comments are kept (posts, reactions and shares are ignored). */
function parseFeed(entry: Json, change: Json, out: MetaEvent[]) {
  const v = change.value ?? {};
  if (v.item !== "comment") return;
  const commentId = str(v.comment_id);
  if (!commentId) return;
  const verbs: Record<string, CommentEvent["verb"]> = { add: "add", edited: "edited", edit: "edited", remove: "remove", delete: "remove", hide: "hide", unhide: "unhide" };
  const parentId = str(v.parent_id);
  out.push({
    kind: "comment",
    platform: "facebook",
    accountId: str(entry.id) ?? "",
    verb: verbs[v.verb] ?? "add",
    commentId,
    // On Facebook a top-level comment's parent_id is the post id.
    parentId: parentId && parentId !== str(v.post_id) ? parentId : undefined,
    postId: str(v.post_id),
    authorId: str(v.from?.id),
    authorName: str(v.from?.name),
    text: str(v.message) ?? null,
    permalink: str(v.permalink_url) ?? str(v.post?.permalink_url),
    at: asDate(v.created_time ?? entry.time),
  });
}

/**
 * Instagram `comments` / `live_comments`. The comment id is `comment_id` with
 * Facebook Login for Business and `id` with Business Login for Instagram.
 */
function parseIgComment(entry: Json, change: Json, out: MetaEvent[]) {
  const v = change.value ?? {};
  const commentId = str(v.comment_id) ?? str(v.id);
  if (!commentId) return;
  out.push({
    kind: "comment",
    platform: "instagram",
    accountId: str(entry.id) ?? "",
    verb: "add",
    commentId,
    parentId: str(v.parent_id),
    postId: str(v.media?.id),
    authorId: str(v.from?.id),
    authorName: str(v.from?.username),
    text: str(v.text) ?? null,
    at: asDate(entry.time),
  });
}

function waAttachment(m: Json): Attachment[] {
  const t = str(m.type);
  if (!t || t === "text" || !m[t]) return [];
  const media = m[t] as Json;
  return [{ type: t, mediaId: str(media.id), caption: str(media.caption) }];
}

function waText(m: Json): string | null {
  switch (m.type) {
    case "text":
      return str(m.text?.body) ?? null;
    case "button":
      return str(m.button?.text) ?? null;
    case "interactive":
      return str(m.interactive?.button_reply?.title) ?? str(m.interactive?.list_reply?.title) ?? null;
    case "location":
      return m.location ? `📍 ${m.location.latitude},${m.location.longitude}${m.location.name ? " " + m.location.name : ""}` : null;
    default:
      return str(m[m.type]?.caption) ?? null;
  }
}

/** WhatsApp Cloud API `messages` change: inbound messages and delivery statuses. */
function parseWhatsApp(change: Json, out: MetaEvent[]) {
  const v = change.value ?? {};
  const phoneNumberId = str(v.metadata?.phone_number_id) ?? "";
  const names = new Map<string, string>();
  for (const c of Array.isArray(v.contacts) ? v.contacts : []) {
    const key = str(c?.wa_id) ?? str(c?.user_id);
    if (key && str(c?.profile?.name)) names.set(key, c.profile.name);
  }
  for (const m of Array.isArray(v.messages) ? v.messages : []) {
    // `from` can be absent for users who only have a username: fall back to the BSUID.
    const from = str(m?.from) ?? str(m?.from_user_id);
    const id = str(m?.id);
    if (!from || !id) continue;
    out.push({
      kind: "message",
      channel: "whatsapp",
      accountId: phoneNumberId,
      contactId: from,
      contactName: names.get(from),
      externalId: id,
      text: waText(m),
      type: str(m.type) ?? "unknown",
      attachments: waAttachment(m),
      at: asDate(m.timestamp),
      isEcho: false,
    });
  }
  for (const s of Array.isArray(v.statuses) ? v.statuses : []) {
    const id = str(s?.id);
    const status = s?.status;
    if (!id || !["sent", "delivered", "read", "failed"].includes(status)) continue;
    const err = Array.isArray(s.errors) && s.errors[0] ? `${s.errors[0].code ?? ""} ${s.errors[0].title ?? s.errors[0].message ?? ""}`.trim() : undefined;
    out.push({ kind: "status", channel: "whatsapp", externalId: id, status, error: err, at: asDate(s.timestamp) });
  }
}

/** Turns one Meta webhook delivery (Page, Instagram or WhatsApp) into channel-neutral events. */
export function parseMetaWebhook(body: unknown): MetaEvent[] {
  const out: MetaEvent[] = [];
  if (!body || typeof body !== "object") return out;
  const b = body as Json;
  const entries: Json[] = Array.isArray(b.entry) ? b.entry : [];
  for (const entry of entries) {
    if (b.object === "page") {
      parseMessaging("messenger", entry, out);
      for (const change of Array.isArray(entry.changes) ? entry.changes : []) {
        if (change.field === "feed") parseFeed(entry, change, out);
      }
    } else if (b.object === "instagram") {
      parseMessaging("instagram", entry, out);
      for (const change of Array.isArray(entry.changes) ? entry.changes : []) {
        if (change.field === "comments" || change.field === "live_comments") parseIgComment(entry, change, out);
      }
    } else if (b.object === "whatsapp_business_account") {
      for (const change of Array.isArray(entry.changes) ? entry.changes : []) {
        if (change.field === "messages") parseWhatsApp(change, out);
      }
    }
  }
  return out;
}

export const channelOf = (object: unknown): Channel | null =>
  object === "page" ? "messenger" : object === "instagram" ? "instagram" : object === "whatsapp_business_account" ? "whatsapp" : null;
