import { Injectable } from "@nestjs/common";
import { Prisma } from "../../../generated/prisma/client";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { dbOf } from "../../../shared/infrastructure/prisma/unit-of-work";
import { iso } from "../../../shared/infrastructure/prisma/decimal";
import type { Channel, CommentEvent, CommentPlatform, InboundMessageEvent } from "../domain/meta-events";
import type { CommentForReply, ConversationForSend, InboxStore, OutboundMessage } from "../domain/ports";
import { preview } from "../domain/policies";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const messageDto = (m: any) => ({
  id: m.id,
  conversation_id: m.conversation_id,
  direction: m.direction,
  external_id: m.external_id,
  type: m.type,
  body: m.body,
  attachments: m.attachments,
  status: m.status,
  error: m.error,
  sent_by_admin_id: m.sent_by_admin_id,
  sent_at: iso(m.sent_at),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const contactDto = (c: any) => ({
  id: c.id,
  channel: c.channel,
  external_id: c.external_id,
  name: c.name,
  username: c.username,
  avatar_url: c.avatar_url,
  customer: c.customer ? { id: c.customer.id, full_name: c.customer.full_name, phone: c.customer.phone } : null,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const conversationDto = (c: any) => ({
  id: c.id,
  channel: c.channel,
  account_id: c.account_id,
  status: c.status,
  unread_count: c.unread_count,
  last_message_at: iso(c.last_message_at),
  last_message_preview: c.last_message_preview,
  last_inbound_at: iso(c.last_inbound_at),
  contact: contactDto(c.contact),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const commentDto = (c: any) => ({
  id: c.id,
  platform: c.platform,
  external_id: c.external_id,
  parent_external_id: c.parent_external_id,
  post_id: c.post_id,
  author_id: c.author_id,
  author_name: c.author_name,
  body: c.body,
  permalink: c.permalink,
  is_hidden: c.is_hidden,
  is_from_business: c.is_from_business,
  status: c.status,
  private_reply_sent_at: iso(c.private_reply_sent_at),
  replied_at: iso(c.replied_at),
  commented_at: iso(c.commented_at),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replies: (c.replies ?? []).map((r: any) => ({ id: r.id, kind: r.kind, body: r.body, status: r.status, error: r.error, created_at: iso(r.created_at) })),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCommentForReply = (c: any): CommentForReply => ({
  id: c.id,
  platform: c.platform as CommentPlatform,
  externalId: c.external_id,
  commentedAt: c.commented_at,
  privateReplySentAt: c.private_reply_sent_at,
  isFromBusiness: c.is_from_business,
  isHidden: c.is_hidden,
});

@Injectable()
export class InboxRepository implements InboxStore {
  constructor(private readonly prisma: PrismaService) {}

  async recordInbound(e: InboundMessageEvent, profile: { name?: string; username?: string; avatar?: string } | null, customerId: string | null, tx?: unknown) {
    const db = dbOf(this.prisma, tx);
    const contact = await db.inboxContact.upsert({
      where: { channel_account_id_external_id: { channel: e.channel, account_id: e.accountId, external_id: e.contactId } },
      update: {
        ...(e.contactName || profile?.name ? { name: e.contactName ?? profile?.name } : {}),
        ...(profile?.username ? { username: profile.username } : {}),
        ...(profile?.avatar ? { avatar_url: profile.avatar } : {}),
        ...(customerId ? { customer_id: customerId } : {}),
      },
      create: {
        channel: e.channel,
        account_id: e.accountId,
        external_id: e.contactId,
        name: e.contactName ?? profile?.name ?? null,
        username: profile?.username ?? null,
        avatar_url: profile?.avatar ?? null,
        customer_id: customerId,
      },
    });
    const conversation = await db.inboxConversation.upsert({
      where: { channel_account_id_contact_id: { channel: e.channel, account_id: e.accountId, contact_id: contact.id } },
      update: {},
      create: { channel: e.channel, account_id: e.accountId, contact_id: contact.id },
    });
    const existing = await db.inboxMessage.findUnique({ where: { external_id: e.externalId } });
    if (existing) return { conversationId: conversation.id, messageId: existing.id, created: false };

    const message = await db.inboxMessage.create({
      data: {
        conversation_id: conversation.id,
        direction: e.isEcho ? "outbound" : "inbound",
        external_id: e.externalId,
        type: e.type,
        body: e.text,
        attachments: e.attachments as unknown as Prisma.InputJsonValue,
        status: e.isEcho ? "sent" : "received",
        sent_at: e.at,
      },
    });
    await db.inboxConversation.update({
      where: { id: conversation.id },
      data: {
        last_message_at: e.at,
        last_message_preview: preview(e.text, e.type),
        ...(e.isEcho ? {} : { last_inbound_at: e.at, unread_count: { increment: 1 }, status: "open" }),
      },
    });
    return { conversationId: conversation.id, messageId: message.id, created: true };
  }

  async applyStatus(externalId: string, status: string, error?: string) {
    const m = await this.prisma.inboxMessage.findUnique({ where: { external_id: externalId } });
    if (!m) return null;
    const rank: Record<string, number> = { pending: 0, sent: 1, delivered: 2, read: 3, failed: 4 };
    // Statuses can arrive out of order; never move backwards (failed always wins).
    if (status !== "failed" && (rank[status] ?? 0) <= (rank[m.status] ?? 0)) return { conversationId: m.conversation_id, messageId: m.id };
    await this.prisma.inboxMessage.update({ where: { id: m.id }, data: { status, ...(error ? { error } : {}) } });
    return { conversationId: m.conversation_id, messageId: m.id };
  }

  async applyRead(channel: Channel, accountId: string, contactId: string, watermark: Date) {
    const contact = await this.prisma.inboxContact.findUnique({
      where: { channel_account_id_external_id: { channel, account_id: accountId, external_id: contactId } },
      include: { conversations: { select: { id: true } } },
    });
    const conversationId = contact?.conversations[0]?.id;
    if (!conversationId) return null;
    await this.prisma.inboxMessage.updateMany({
      where: { conversation_id: conversationId, direction: "outbound", status: { in: ["sent", "delivered"] }, sent_at: { lte: watermark } },
      data: { status: "read" },
    });
    return conversationId;
  }

  async upsertComment(e: CommentEvent) {
    const existing = await this.prisma.socialComment.findUnique({ where: { external_id: e.commentId } });
    if (e.verb === "add") {
      if (existing) return { commentId: existing.id, created: false };
      const created = await this.prisma.socialComment.create({
        data: {
          platform: e.platform,
          account_id: e.accountId,
          external_id: e.commentId,
          parent_external_id: e.parentId ?? null,
          post_id: e.postId ?? null,
          author_id: e.authorId ?? null,
          author_name: e.authorName ?? null,
          body: e.text,
          permalink: e.permalink ?? null,
          is_from_business: !!e.authorId && e.authorId === e.accountId,
          status: e.authorId && e.authorId === e.accountId ? "done" : "open",
          commented_at: e.at,
        },
      });
      return { commentId: created.id, created: true };
    }
    if (!existing) return { commentId: "", created: false };
    const data =
      e.verb === "edited"
        ? { body: e.text }
        : e.verb === "remove"
          ? { status: "deleted" }
          : { is_hidden: e.verb === "hide" };
    await this.prisma.socialComment.update({ where: { id: existing.id }, data });
    return { commentId: existing.id, created: false };
  }

  async conversationForSend(id: string, tx?: unknown): Promise<ConversationForSend | null> {
    const c = await dbOf(this.prisma, tx).inboxConversation.findUnique({ where: { id }, include: { contact: true } });
    return c ? { id: c.id, channel: c.channel as Channel, accountId: c.account_id, contactExternalId: c.contact.external_id, lastInboundAt: c.last_inbound_at } : null;
  }

  async createOutbound(conversationId: string, body: string, adminId: string | null, meta: OutboundMessage["meta"], tx?: unknown) {
    const db = dbOf(this.prisma, tx);
    const now = new Date();
    const m = await db.inboxMessage.create({
      data: {
        conversation_id: conversationId,
        direction: "outbound",
        type: meta.mode === "template" ? "template" : "text",
        body,
        status: "pending",
        sent_by_admin_id: adminId,
        sent_at: now,
        attachments: meta as Prisma.InputJsonValue,
      },
    });
    await db.inboxConversation.update({ where: { id: conversationId }, data: { last_message_at: now, last_message_preview: preview(body, "text"), unread_count: 0 } });
    return m.id;
  }

  async outbound(messageId: string) {
    const m = await this.prisma.inboxMessage.findUnique({ where: { id: messageId }, include: { conversation: { include: { contact: true } } } });
    if (!m || m.direction !== "outbound") return null;
    const c = m.conversation;
    return {
      id: m.id,
      conversationId: m.conversation_id,
      body: m.body ?? "",
      status: m.status,
      meta: (m.attachments ?? {}) as OutboundMessage["meta"],
      conversation: { id: c.id, channel: c.channel as Channel, accountId: c.account_id, contactExternalId: c.contact.external_id, lastInboundAt: c.last_inbound_at },
    };
  }

  async markSent(messageId: string, externalId: string) {
    await this.prisma.inboxMessage.update({ where: { id: messageId }, data: { status: "sent", external_id: externalId || null, error: null } });
  }

  async markFailed(messageId: string, error: string) {
    await this.prisma.inboxMessage.update({ where: { id: messageId }, data: { status: "failed", error: error.slice(0, 500) } });
  }

  async commentForReply(id: string, tx?: unknown) {
    const c = await dbOf(this.prisma, tx).socialComment.findUnique({ where: { id } });
    return c ? toCommentForReply(c) : null;
  }

  async hasPendingPrivateReply(commentId: string, tx?: unknown) {
    return (await dbOf(this.prisma, tx).commentReply.count({ where: { comment_id: commentId, kind: "private", status: { in: ["pending", "sent"] } } })) > 0;
  }

  async createCommentReply(commentId: string, kind: "public" | "private", body: string, adminId: string | null, tx?: unknown) {
    const r = await dbOf(this.prisma, tx).commentReply.create({ data: { comment_id: commentId, kind, body, admin_id: adminId } });
    return r.id;
  }

  async commentReply(replyId: string) {
    const r = await this.prisma.commentReply.findUnique({ where: { id: replyId }, include: { comment: true } });
    return r ? { id: r.id, kind: r.kind as "public" | "private", body: r.body, status: r.status, comment: toCommentForReply(r.comment) } : null;
  }

  async markReplySent(replyId: string, externalId: string) {
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.commentReply.update({ where: { id: replyId }, data: { status: "sent", external_id: externalId || null, error: null } });
      await tx.socialComment.update({
        where: { id: r.comment_id },
        data: { status: "done", replied_at: new Date(), ...(r.kind === "private" ? { private_reply_sent_at: new Date() } : {}) },
      });
    });
  }

  async markReplyFailed(replyId: string, error: string) {
    await this.prisma.commentReply.update({ where: { id: replyId }, data: { status: "failed", error: error.slice(0, 500) } });
  }

  async setCommentHidden(id: string, hidden: boolean) {
    await this.prisma.socialComment.update({ where: { id }, data: { is_hidden: hidden } });
  }

  async setCommentStatus(id: string, status: "open" | "done") {
    await this.prisma.socialComment.update({ where: { id }, data: { status } });
  }

  async setConversationStatus(id: string, status: "open" | "closed") {
    await this.prisma.inboxConversation.update({ where: { id }, data: { status } });
  }

  async markConversationRead(id: string) {
    await this.prisma.inboxConversation.update({ where: { id }, data: { unread_count: 0 } });
  }

  async listConversations(f: { status?: string; channel?: string; search?: string; limit: number }) {
    const rows = await this.prisma.inboxConversation.findMany({
      where: {
        ...(f.status ? { status: f.status } : {}),
        ...(f.channel ? { channel: f.channel } : {}),
        ...(f.search
          ? {
              OR: [
                { contact: { name: { contains: f.search, mode: "insensitive" } } },
                { contact: { username: { contains: f.search, mode: "insensitive" } } },
                { contact: { external_id: { contains: f.search } } },
                { last_message_preview: { contains: f.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { contact: { include: { customer: true } } },
      orderBy: { last_message_at: { sort: "desc", nulls: "last" } },
      take: f.limit,
    });
    return rows.map(conversationDto);
  }

  async conversationThread(id: string) {
    const c = await this.prisma.inboxConversation.findUnique({
      where: { id },
      include: { contact: { include: { customer: true } }, messages: { orderBy: { sent_at: "asc" }, take: 500 } },
    });
    if (!c) return null;
    return { ...conversationDto(c), messages: c.messages.map(messageDto) };
  }

  async listComments(f: { platform?: string; status?: string; limit: number }) {
    const rows = await this.prisma.socialComment.findMany({
      where: { ...(f.platform ? { platform: f.platform } : {}), ...(f.status ? { status: f.status } : { status: { not: "deleted" } }), is_from_business: false },
      include: { replies: { orderBy: { created_at: "asc" } } },
      orderBy: { commented_at: "desc" },
      take: f.limit,
    });
    return rows.map(commentDto);
  }

  async counts() {
    const [unreadConversations, openComments] = await Promise.all([
      this.prisma.inboxConversation.count({ where: { unread_count: { gt: 0 } } }),
      this.prisma.socialComment.count({ where: { status: "open", is_from_business: false } }),
    ]);
    return { unreadConversations, openComments };
  }
}
