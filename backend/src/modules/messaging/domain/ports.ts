import type { Channel, CommentEvent, CommentPlatform, InboundMessageEvent } from "./meta-events";

export const META_SENDER = Symbol("META_SENDER");
/** Outbound side of Meta (implemented by GraphApiClient). */
export interface MetaSender {
  sendDirect(channel: "messenger" | "instagram", recipientId: string, text: string, humanAgent: boolean): Promise<string>;
  sendWhatsApp(to: string, text: string, template?: { name: string; lang: string }): Promise<string>;
  replyPublic(platform: CommentPlatform, commentId: string, text: string): Promise<string>;
  replyPrivate(platform: CommentPlatform, commentId: string, text: string): Promise<string>;
  setHidden(platform: CommentPlatform, commentId: string, hidden: boolean): Promise<void>;
  profile(channel: "messenger" | "instagram", id: string): Promise<{ name?: string; username?: string; avatar?: string } | null>;
}

export interface ConversationForSend {
  id: string;
  channel: Channel;
  accountId: string;
  contactExternalId: string;
  lastInboundAt: Date | null;
}

export interface OutboundMessage {
  id: string;
  conversationId: string;
  body: string;
  status: string;
  meta: { mode?: string; template?: string };
}

export interface CommentForReply {
  id: string;
  platform: CommentPlatform;
  externalId: string;
  commentedAt: Date;
  privateReplySentAt: Date | null;
  isFromBusiness: boolean;
  isHidden: boolean;
}

export const INBOX_STORE = Symbol("INBOX_STORE");
export interface InboxStore {
  recordInbound(e: InboundMessageEvent, profile: { name?: string; username?: string; avatar?: string } | null, customerId: string | null, tx?: unknown): Promise<{ conversationId: string; messageId: string; created: boolean }>;
  applyStatus(externalId: string, status: string, error?: string): Promise<{ conversationId: string; messageId: string } | null>;
  applyRead(channel: Channel, accountId: string, contactId: string, watermark: Date): Promise<string | null>;
  upsertComment(e: CommentEvent): Promise<{ commentId: string; created: boolean }>;
  conversationForSend(id: string, tx?: unknown): Promise<ConversationForSend | null>;
  createOutbound(conversationId: string, body: string, adminId: string | null, meta: OutboundMessage["meta"], tx?: unknown): Promise<string>;
  outbound(messageId: string): Promise<(OutboundMessage & { conversation: ConversationForSend }) | null>;
  markSent(messageId: string, externalId: string): Promise<void>;
  markFailed(messageId: string, error: string): Promise<void>;
  commentForReply(id: string, tx?: unknown): Promise<CommentForReply | null>;
  hasPendingPrivateReply(commentId: string, tx?: unknown): Promise<boolean>;
  createCommentReply(commentId: string, kind: "public" | "private", body: string, adminId: string | null, tx?: unknown): Promise<string>;
  commentReply(replyId: string): Promise<{ id: string; kind: "public" | "private"; body: string; status: string; comment: CommentForReply } | null>;
  markReplySent(replyId: string, externalId: string): Promise<void>;
  markReplyFailed(replyId: string, error: string): Promise<void>;
  setCommentHidden(id: string, hidden: boolean): Promise<void>;
  setCommentStatus(id: string, status: "open" | "done"): Promise<void>;
  setConversationStatus(id: string, status: "open" | "closed"): Promise<void>;
  markConversationRead(id: string): Promise<void>;
  listConversations(f: { status?: string; channel?: string; search?: string; limit: number }): Promise<unknown[]>;
  conversationThread(id: string): Promise<unknown | null>;
  listComments(f: { platform?: string; status?: string; limit: number }): Promise<unknown[]>;
  counts(): Promise<{ unreadConversations: number; openComments: number }>;
}
