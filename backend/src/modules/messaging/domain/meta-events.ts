/**
 * Channel-neutral events produced from Meta webhook payloads. Everything
 * downstream (persistence, realtime, the inbox UI) works on these shapes,
 * never on raw Graph payloads.
 */
export type Channel = "messenger" | "instagram" | "whatsapp";
export type CommentPlatform = "facebook" | "instagram";

export interface Attachment {
  type: string;
  url?: string;
  mediaId?: string;
  caption?: string;
}

export interface InboundMessageEvent {
  kind: "message";
  channel: Channel;
  /** Business side id: Page id, IG account id, or WhatsApp phone_number_id. */
  accountId: string;
  /** The customer's id on the channel (PSID, IGSID or wa_id). */
  contactId: string;
  contactName?: string;
  contactUsername?: string;
  externalId: string;
  text: string | null;
  type: string;
  attachments: Attachment[];
  at: Date;
  /** Sent by the business from another tool (Meta Business Suite, the IG app). */
  isEcho: boolean;
}

export interface StatusEvent {
  kind: "status";
  channel: Channel;
  externalId: string;
  status: "sent" | "delivered" | "read" | "failed";
  error?: string;
  at: Date;
}

/** Messenger/IG read receipts reference a watermark, not a message id. */
export interface ReadWatermarkEvent {
  kind: "read";
  channel: Channel;
  accountId: string;
  contactId: string;
  watermark: Date;
}

export interface CommentEvent {
  kind: "comment";
  platform: CommentPlatform;
  accountId: string;
  verb: "add" | "edited" | "remove" | "hide" | "unhide";
  commentId: string;
  parentId?: string;
  postId?: string;
  authorId?: string;
  authorName?: string;
  text: string | null;
  permalink?: string;
  at: Date;
}

export type MetaEvent = InboundMessageEvent | StatusEvent | ReadWatermarkEvent | CommentEvent;

/** Stable key for idempotency (Meta retries deliveries). */
export function eventKey(e: MetaEvent): string {
  switch (e.kind) {
    case "message":
      return `msg:${e.channel}:${e.externalId}`;
    case "status":
      return `status:${e.channel}:${e.externalId}:${e.status}`;
    case "read":
      return `read:${e.channel}:${e.accountId}:${e.contactId}:${e.watermark.getTime()}`;
    case "comment":
      return `comment:${e.platform}:${e.commentId}:${e.verb}`;
  }
}
