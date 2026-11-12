/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from "node:crypto";
import { DomainError } from "../../../shared/domain/domain-error";

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface ReviewTokenPayload {
  phone: string;
  productId: string;
  orderId: string;
  exp: number;
}

export const REVIEW_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** `base64url(json).base64url(hmac)` — the link a delivered buyer gets on WhatsApp. */
export function signReviewToken(payload: ReviewTokenPayload, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyReviewToken(token: string, secret: string, now = Date.now()): ReviewTokenPayload {
  const [data, sig] = (token || "").split(".");
  if (!data || !sig) throw DomainError.validation("Malformed review token.");
  const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw DomainError.validation("Invalid review token signature.");
  let payload: ReviewTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch {
    throw DomainError.validation("Malformed review token payload.");
  }
  if (typeof payload.exp !== "number" || payload.exp < now) {
    throw DomainError.validation("Review token has expired — please request a new review link.");
  }
  if (!payload.phone || !payload.productId || !payload.orderId) throw DomainError.validation("Malformed review token payload.");
  return payload;
}

/** Public reviews show only the first name. */
export function authorName(fullName: string | null | undefined): string {
  const first = fullName?.trim().split(/\s+/)[0];
  return first || "زبون";
}

export function aggregate(ratings: number[]) {
  if (ratings.length === 0) return { average: 0, count: 0 };
  return { average: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10, count: ratings.length };
}

export const REVIEW_STORE = Symbol("REVIEW_STORE");
export interface ReviewStore {
  create(input: { product_id: string; customer_id: string; order_id: string; rating: number; title: string | null; body: string | null }): Promise<"created" | "duplicate">;
  hasDeliveredOrder(customerId: string, productId: string): Promise<boolean>;
  approvedForProduct(productId: string): Promise<Array<Record<string, any>>>;
  ratings(productId?: string): Promise<number[]>;
  topApproved(minRating: number, limit: number): Promise<Array<Record<string, any>>>;
  forModeration(status?: ReviewStatus): Promise<Array<Record<string, any>>>;
  setStatus(id: string, status: ReviewStatus): Promise<Record<string, unknown> | null>;
}
