import { Inject, Injectable, Logger } from "@nestjs/common";
import { CACHE, type Cache } from "../../../shared/application/cache.port";
import { CLOCK, type Clock } from "../../../shared/application/clock.port";
import { REALTIME, type Realtime } from "../../../shared/application/realtime.port";
import { UNIT_OF_WORK, type UnitOfWork } from "../../../shared/application/unit-of-work.port";
import { DomainError } from "../../../shared/domain/domain-error";
import type { EventEnvelope } from "../../../shared/domain/domain-event";
import { toLocalEgyptPhone } from "../../../shared/domain/phone";
import { Topics } from "../../../shared/domain/topics";
import { CustomersFacade } from "../../customers";
import { eventKey, type MetaEvent } from "../domain/meta-events";
import { parseMetaWebhook } from "../domain/meta-webhook.parser";
import { assertCanPrivateReply, assertMessageText, decideSendMode } from "../domain/policies";
import { INBOX_STORE, META_SENDER, type InboxStore, type MetaSender } from "../domain/ports";

export const MessagingEvents = {
  webhookReceived: "meta.webhook.received",
  messageReceived: "messaging.message.received",
  sendRequested: "messaging.message.send_requested",
  commentReplyRequested: "messaging.comment_reply.requested",
} as const;

const IDEMPOTENCY_TTL = 7 * 24 * 3600;

/** api side: a verified webhook is written to the outbox and acknowledged immediately (Meta wants 200 within 5 s). */
@Injectable()
export class AcceptMetaWebhook {
  constructor(@Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork) {}

  async execute(body: Record<string, unknown>): Promise<void> {
    await this.uow.publish([{ topic: Topics.metaWebhookReceived, key: String(body.object ?? "meta"), type: MessagingEvents.webhookReceived, payload: body }]);
  }
}

/** worker side: normalises one delivery and applies every event exactly once. */
@Injectable()
export class ProcessMetaWebhook {
  private readonly log = new Logger(ProcessMetaWebhook.name);

  constructor(
    @Inject(INBOX_STORE) private readonly inbox: InboxStore,
    @Inject(META_SENDER) private readonly meta: MetaSender,
    @Inject(CACHE) private readonly cache: Cache,
    @Inject(REALTIME) private readonly realtime: Realtime,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly customers: CustomersFacade,
  ) {}

  async execute(envelope: EventEnvelope): Promise<void> {
    for (const event of parseMetaWebhook(envelope.payload)) {
      const key = `idem:meta:${eventKey(event)}`;
      if (!(await this.cache.firstTime(key, IDEMPOTENCY_TTL))) continue;
      try {
        await this.apply(event);
      } catch (err) {
        await this.cache.release(key);
        throw err;
      }
    }
  }

  private async apply(e: MetaEvent): Promise<void> {
    switch (e.kind) {
      case "message": {
        const profile = e.channel === "whatsapp" || e.isEcho ? null : await this.meta.profile(e.channel, e.contactId);
        let customerId: string | null = null;
        if (e.channel === "whatsapp" && /^\d{8,15}$/.test(e.contactId)) {
          customerId = (await this.customers.findByPhone(toLocalEgyptPhone(e.contactId)))?.id ?? null;
        }
        const r = await this.inbox.recordInbound(e, profile, customerId);
        if (!r.created) return;
        this.realtime.toAdmins("inbox:message", { conversationId: r.conversationId, messageId: r.messageId, channel: e.channel, direction: e.isEcho ? "outbound" : "inbound" });
        if (!e.isEcho) {
          await this.uow.publish([
            {
              topic: Topics.messagingEvents,
              key: r.conversationId,
              type: MessagingEvents.messageReceived,
              payload: { conversationId: r.conversationId, messageId: r.messageId, channel: e.channel, text: e.text },
            },
          ]);
        }
        return;
      }
      case "status": {
        const r = await this.inbox.applyStatus(e.externalId, e.status, e.error);
        if (r) this.realtime.toAdmins("inbox:status", { ...r, status: e.status });
        return;
      }
      case "read": {
        const conversationId = await this.inbox.applyRead(e.channel, e.accountId, e.contactId, e.watermark);
        if (conversationId) this.realtime.toAdmins("inbox:status", { conversationId, status: "read" });
        return;
      }
      case "comment": {
        const r = await this.inbox.upsertComment(e);
        if (r.commentId) this.realtime.toAdmins("inbox:comment", { commentId: r.commentId, platform: e.platform, verb: e.verb });
        return;
      }
    }
  }
}

/** Admin replies in a conversation. The message is stored as `pending` and sent by the worker. */
@Injectable()
export class SendMessage {
  constructor(
    @Inject(INBOX_STORE) private readonly inbox: InboxStore,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject("WHATSAPP_TEMPLATE") private readonly template: string | undefined,
  ) {}

  async execute(conversationId: string, text: string, adminId: string): Promise<{ messageId: string; mode: string }> {
    return this.uow.run(async (tx) => {
      const conversation = await this.inbox.conversationForSend(conversationId, tx);
      if (!conversation) throw DomainError.notFound("Conversation not found");
      const body = assertMessageText(conversation.channel, text);
      const mode = decideSendMode(conversation.channel, conversation.lastInboundAt, this.clock.now(), this.template);
      const messageId = await this.inbox.createOutbound(conversation.id, body, adminId, mode.mode === "template" ? { mode: "template", template: mode.template } : { mode: mode.mode }, tx);
      return {
        result: { messageId, mode: mode.mode },
        events: [{ topic: Topics.messagingReplyRequested, key: conversation.id, type: MessagingEvents.sendRequested, payload: { messageId } }],
      };
    });
  }
}

/** Public or private reply to a FB/IG comment, delivered by the worker. */
@Injectable()
export class ReplyToComment {
  constructor(
    @Inject(INBOX_STORE) private readonly inbox: InboxStore,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(commentId: string, kind: "public" | "private", text: string, adminId: string): Promise<{ replyId: string }> {
    return this.uow.run(async (tx) => {
      const comment = await this.inbox.commentForReply(commentId, tx);
      if (!comment) throw DomainError.notFound("Comment not found");
      const body = assertMessageText(comment.platform === "facebook" ? "messenger" : "instagram", text);
      if (kind === "private") {
        assertCanPrivateReply(comment, this.clock.now());
        if (await this.inbox.hasPendingPrivateReply(comment.id, tx)) throw DomainError.conflict("A private reply is already on its way.");
      }
      const replyId = await this.inbox.createCommentReply(comment.id, kind, body, adminId, tx);
      return {
        result: { replyId },
        events: [{ topic: Topics.messagingReplyRequested, key: comment.id, type: MessagingEvents.commentReplyRequested, payload: { replyId } }],
      };
    });
  }
}

/** worker side: performs the Graph API call for a queued message or comment reply. */
@Injectable()
export class DeliverOutbound {
  private readonly log = new Logger(DeliverOutbound.name);

  constructor(
    @Inject(INBOX_STORE) private readonly inbox: InboxStore,
    @Inject(META_SENDER) private readonly meta: MetaSender,
    @Inject(REALTIME) private readonly realtime: Realtime,
    @Inject("WHATSAPP_TEMPLATE_LANG") private readonly templateLang: string,
  ) {}

  async execute(envelope: EventEnvelope<{ messageId?: string; replyId?: string }>): Promise<void> {
    if (envelope.type === MessagingEvents.sendRequested && envelope.payload.messageId) return this.message(envelope.payload.messageId);
    if (envelope.type === MessagingEvents.commentReplyRequested && envelope.payload.replyId) return this.commentReply(envelope.payload.replyId);
  }

  private async message(id: string) {
    const m = await this.inbox.outbound(id);
    if (!m || m.status !== "pending") return; // already handled (redelivery)
    const c = m.conversation;
    try {
      const externalId =
        c.channel === "whatsapp"
          ? await this.meta.sendWhatsApp(c.contactExternalId, m.body, m.meta.mode === "template" && m.meta.template ? { name: m.meta.template, lang: this.templateLang } : undefined)
          : await this.meta.sendDirect(c.channel, c.contactExternalId, m.body, m.meta.mode === "human_agent");
      await this.inbox.markSent(m.id, externalId);
      this.realtime.toAdmins("inbox:status", { conversationId: c.id, messageId: m.id, status: "sent" });
    } catch (err) {
      if (!isPermanent(err)) throw err; // retried by the consumer, then DLQ
      await this.inbox.markFailed(m.id, errorText(err));
      this.realtime.toAdmins("inbox:status", { conversationId: c.id, messageId: m.id, status: "failed", error: errorText(err) });
    }
  }

  private async commentReply(id: string) {
    const r = await this.inbox.commentReply(id);
    if (!r || r.status !== "pending") return;
    try {
      const externalId =
        r.kind === "public" ? await this.meta.replyPublic(r.comment.platform, r.comment.externalId, r.body) : await this.meta.replyPrivate(r.comment.platform, r.comment.externalId, r.body);
      await this.inbox.markReplySent(r.id, externalId);
      this.realtime.toAdmins("inbox:comment", { commentId: r.comment.id, replyId: r.id, status: "sent" });
    } catch (err) {
      if (!isPermanent(err)) throw err;
      await this.inbox.markReplyFailed(r.id, errorText(err));
      this.realtime.toAdmins("inbox:comment", { commentId: r.comment.id, replyId: r.id, status: "failed", error: errorText(err) });
    }
  }
}

const isPermanent = (err: unknown) => Boolean((err as { permanent?: boolean })?.permanent);
const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Admin inbox reads and small synchronous actions. */
@Injectable()
export class InboxQueries {
  constructor(
    @Inject(INBOX_STORE) private readonly inbox: InboxStore,
    @Inject(META_SENDER) private readonly meta: MetaSender,
  ) {}

  conversations(f: { status?: string; channel?: string; search?: string; limit?: number }) {
    return this.inbox.listConversations({ ...f, limit: Math.min(f.limit ?? 50, 200) });
  }

  async thread(id: string) {
    const t = await this.inbox.conversationThread(id);
    if (!t) throw DomainError.notFound("Conversation not found");
    await this.inbox.markConversationRead(id);
    return t;
  }

  setStatus(id: string, status: "open" | "closed") {
    return this.inbox.setConversationStatus(id, status);
  }

  comments(f: { platform?: string; status?: string; limit?: number }) {
    return this.inbox.listComments({ ...f, limit: Math.min(f.limit ?? 50, 200) });
  }

  counts() {
    return this.inbox.counts();
  }

  setCommentStatus(id: string, status: "open" | "done") {
    return this.inbox.setCommentStatus(id, status);
  }

  /** Hiding is synchronous: the admin expects the spam gone now. */
  async hideComment(id: string, hidden: boolean) {
    const c = await this.inbox.commentForReply(id);
    if (!c) throw DomainError.notFound("Comment not found");
    try {
      await this.meta.setHidden(c.platform, c.externalId, hidden);
    } catch (err) {
      throw DomainError.unavailable(`Meta refused: ${errorText(err)}`);
    }
    await this.inbox.setCommentHidden(id, hidden);
  }
}
