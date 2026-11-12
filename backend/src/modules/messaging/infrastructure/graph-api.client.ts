import { Injectable, Logger } from "@nestjs/common";
import { MetaCredentials } from "./meta-credentials";

export class GraphError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
    /** Meta says retrying will not help (bad token, window closed, permission). */
    readonly permanent = false,
  ) {
    super(message);
  }
}

/** Error codes that will not succeed on retry. */
const PERMANENT = new Set([10, 100, 190, 200, 230, 551, 2018001, 2018278, 131026, 131047, 131051, 132000, 132001]);

type Json = Record<string, unknown>;

/** Minimal Graph API client for the calls the inbox makes. Host: graph.facebook.com (Facebook Login for Business). */
@Injectable()
export class GraphApiClient {
  private readonly log = new Logger(GraphApiClient.name);

  constructor(private readonly creds: MetaCredentials) {}

  private async call<T = Json>(method: "GET" | "POST" | "DELETE", path: string, token: string, body?: Json, query?: Record<string, string>, host = "graph.facebook.com"): Promise<T> {
    const url = new URL(`https://${host}/${this.creds.graphVersion}/${path.replace(/^\//, "")}`);
    for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
    const data = (await res.json().catch(() => ({}))) as Json & { error?: { message?: string; code?: number; error_subcode?: number } };
    if (!res.ok || data.error) {
      const code = data.error?.code;
      const permanent = res.status === 400 || res.status === 401 || res.status === 403 || (code !== undefined && PERMANENT.has(code));
      throw new GraphError(data.error?.message ?? `Graph API ${res.status}`, res.status, code, permanent);
    }
    return data as T;
  }

  private async igCreds() {
    const c = await this.creds.instagram();
    if (!c) throw new GraphError("Instagram is not connected (set META_IG_ACCESS_TOKEN, or link the IG account to the connected Page).", 503, undefined, true);
    return c;
  }

  private async pageCreds() {
    const c = await this.creds.page();
    if (!c) throw new GraphError("Facebook Page is not connected (set META_PAGE_ID + META_PAGE_ACCESS_TOKEN or connect it in Admin → Connections).", 503, undefined, true);
    return c;
  }

  /** Messenger or Instagram DM. `humanAgent` adds the HUMAN_AGENT tag for replies 24 h–7 d after the last message. */
  async sendDirect(channel: "messenger" | "instagram", recipientId: string, text: string, humanAgent: boolean): Promise<string> {
    const body: Json = {
      recipient: { id: recipientId },
      message: { text },
      messaging_type: humanAgent ? "MESSAGE_TAG" : "RESPONSE",
      ...(humanAgent ? { tag: "HUMAN_AGENT" } : {}),
    };
    if (channel === "instagram") {
      const ig = await this.igCreds();
      const res = await this.call<{ message_id?: string }>("POST", `${ig.igId}/messages`, ig.token, body, undefined, ig.host);
      return res.message_id ?? "";
    }
    const c = await this.pageCreds();
    const res = await this.call<{ message_id?: string }>("POST", `${c.pageId}/messages`, c.pageToken, body);
    return res.message_id ?? "";
  }

  async sendWhatsApp(to: string, text: string, template?: { name: string; lang: string }): Promise<string> {
    const c = await this.creds.whatsapp();
    if (!c) throw new GraphError("WhatsApp Cloud API is not connected (META_WHATSAPP_PHONE_NUMBER_ID + META_WHATSAPP_TOKEN).", 503, undefined, true);
    const body: Json = template
      ? { messaging_product: "whatsapp", recipient_type: "individual", to, type: "template", template: { name: template.name, language: { code: template.lang } } }
      : { messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: true, body: text } };
    const res = await this.call<{ messages?: Array<{ id: string }> }>("POST", `${c.phoneNumberId}/messages`, c.token, body);
    return res.messages?.[0]?.id ?? "";
  }

  /** Public reply under the comment. FB: `/{comment-id}/comments`; IG: `/{ig-comment-id}/replies`. */
  async replyPublic(platform: "facebook" | "instagram", commentId: string, text: string): Promise<string> {
    if (platform === "instagram") {
      const ig = await this.igCreds();
      const res = await this.call<{ id?: string }>("POST", `${commentId}/replies`, ig.token, { message: text }, undefined, ig.host);
      return res.id ?? "";
    }
    const c = await this.pageCreds();
    const res = await this.call<{ id?: string }>("POST", `${commentId}/comments`, c.pageToken, { message: text });
    return res.id ?? "";
  }

  /** One private DM to the commenter (Messenger for FB, IG Direct for IG). */
  async replyPrivate(platform: "facebook" | "instagram", commentId: string, text: string): Promise<string> {
    const body = { recipient: { comment_id: commentId }, message: { text } };
    if (platform === "instagram") {
      const ig = await this.igCreds();
      const res = await this.call<{ message_id?: string }>("POST", `${ig.igId}/messages`, ig.token, body, undefined, ig.host);
      return res.message_id ?? "";
    }
    const c = await this.pageCreds();
    const res = await this.call<{ message_id?: string }>("POST", `${c.pageId}/messages`, c.pageToken, body);
    return res.message_id ?? "";
  }

  /** Hide/unhide. FB uses the `is_hidden` field; IG uses the `hide` query parameter. */
  async setHidden(platform: "facebook" | "instagram", commentId: string, hidden: boolean): Promise<void> {
    if (platform === "instagram") {
      const ig = await this.igCreds();
      await this.call("POST", commentId, ig.token, undefined, { hide: String(hidden) }, ig.host);
      return;
    }
    const c = await this.pageCreds();
    await this.call("POST", commentId, c.pageToken, { is_hidden: hidden });
  }

  async deleteComment(commentId: string): Promise<void> {
    const c = await this.pageCreds();
    await this.call("DELETE", commentId, c.pageToken);
  }

  /** Name + avatar for a Messenger PSID / IG IGSID (best effort, cached by the caller). */
  async profile(channel: "messenger" | "instagram", id: string): Promise<{ name?: string; username?: string; avatar?: string } | null> {
    try {
      const fields = channel === "instagram" ? "name,username,profile_pic" : "first_name,last_name,profile_pic";
      const auth = channel === "instagram" ? await this.igCreds() : null;
      const page = auth ? null : await this.pageCreds();
      const p = await this.call<Json>("GET", id, auth ? auth.token : page!.pageToken, undefined, { fields }, auth ? auth.host : undefined);
      const name = channel === "instagram" ? (p.name as string) : [p.first_name, p.last_name].filter(Boolean).join(" ");
      return { name: name || undefined, username: p.username as string | undefined, avatar: p.profile_pic as string | undefined };
    } catch (e) {
      this.log.debug(`profile lookup failed for ${channel}:${id}: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }

  /** Subscribe the Page (and its IG account) to our webhook fields. Called after "Connect Facebook". */
  async subscribePage(pageId: string, pageToken: string): Promise<void> {
    await this.call("POST", `${pageId}/subscribed_apps`, pageToken, undefined, { subscribed_fields: "messages,messaging_postbacks,message_echoes,message_deliveries,message_reads,feed" });
  }
}
