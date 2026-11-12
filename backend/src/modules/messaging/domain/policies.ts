import { DomainError } from "../../../shared/domain/domain-error";
import type { Channel } from "./meta-events";

const HOUR = 3600_000;
/** Free-form replies are allowed within 24 h of the customer's last message (all three channels). */
export const SERVICE_WINDOW_MS = 24 * HOUR;
/** Messenger / Instagram allow a human agent to answer up to 7 days later with the HUMAN_AGENT tag. */
export const HUMAN_AGENT_WINDOW_MS = 7 * 24 * HOUR;
/** A private reply to a comment must be sent within 7 days of the comment, once per comment. */
export const PRIVATE_REPLY_WINDOW_MS = 7 * 24 * HOUR;

export type SendMode = { mode: "free" } | { mode: "human_agent" } | { mode: "template"; template: string };

/**
 * Decides how (and whether) a reply may go out, from Meta's messaging-window
 * rules. Throws a validation error the admin sees when nothing is allowed.
 */
export function decideSendMode(channel: Channel, lastInboundAt: Date | null, now: Date, whatsappTemplate?: string): SendMode {
  const age = lastInboundAt ? now.getTime() - lastInboundAt.getTime() : Infinity;
  if (age <= SERVICE_WINDOW_MS) return { mode: "free" };
  if (channel === "whatsapp") {
    if (whatsappTemplate) return { mode: "template", template: whatsappTemplate };
    throw DomainError.validation("The 24-hour WhatsApp window is closed. Configure META_WHATSAPP_FALLBACK_TEMPLATE to reopen the conversation with an approved template.");
  }
  if (age <= HUMAN_AGENT_WINDOW_MS) return { mode: "human_agent" };
  throw DomainError.validation("More than 7 days since the customer's last message — Meta does not allow a reply until they write again.");
}

export interface CommentFacts {
  commentedAt: Date;
  privateReplySentAt: Date | null;
  isFromBusiness: boolean;
}

export function assertCanPrivateReply(c: CommentFacts, now: Date): void {
  if (c.isFromBusiness) throw DomainError.validation("This comment was written by the page itself.");
  if (c.privateReplySentAt) throw DomainError.conflict("A private reply was already sent for this comment (Meta allows one).");
  if (now.getTime() - c.commentedAt.getTime() > PRIVATE_REPLY_WINDOW_MS) {
    throw DomainError.validation("Private replies are only allowed within 7 days of the comment.");
  }
}

export const MAX_MESSAGE_LENGTH: Record<Channel, number> = { messenger: 2000, instagram: 1000, whatsapp: 4096 };

export function assertMessageText(channel: Channel, text: string): string {
  const t = text.trim();
  if (!t) throw DomainError.validation("Message text is required.");
  if (t.length > MAX_MESSAGE_LENGTH[channel]) throw DomainError.validation(`Message is too long for ${channel} (max ${MAX_MESSAGE_LENGTH[channel]} characters).`);
  return t;
}

export function preview(text: string | null, type: string): string {
  if (text) return text.length > 120 ? text.slice(0, 117) + "…" : text;
  return `[${type}]`;
}
