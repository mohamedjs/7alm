import crypto from "crypto";
import { reviewRepository } from "./reviews.repository";
import type {
  ProductReview,
  ProductReviewPublic,
  ReviewAggregate,
  ReviewStatus,
  SubmitReviewInput,
} from "@/features/shared/types";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface ReviewTokenPayload {
  customerId: string;
  productId: string;
  orderId: string;
  exp: number; // epoch ms
}

/** Env is read lazily — inside this function, never at module import. */
function getTokenSecret(): string {
  const key = process.env.REVIEW_TOKEN_SECRET || process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "REVIEW_TOKEN_SECRET (or SOCIAL_TOKEN_ENCRYPTION_KEY) is not set — required to sign review tokens."
    );
  }
  return key;
}

/** Env is read lazily — inside this function, never at module import. */
function getStoreBase(): string {
  return (
    process.env.SOCIAL_OAUTH_REDIRECT_BASE ||
    process.env.STORE_BASE_URL ||
    "http://localhost:3000"
  );
}

/** Sign a verified-buyer review token, HMAC-SHA256 — mirrors social.service.ts's signState style. */
function signToken(payload: ReviewTokenPayload): string {
  const json = JSON.stringify(payload);
  const data = Buffer.from(json, "utf8").toString("base64url");
  const signature = crypto.createHmac("sha256", getTokenSecret()).update(data).digest("base64url");
  return `${data}.${signature}`;
}

/** Verify a signed review token, checking signature and expiry. Throws on failure. */
function verifyToken(token: string): ReviewTokenPayload {
  const [data, signature] = (token || "").split(".");
  if (!data || !signature) {
    throw new Error("Malformed review token.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", getTokenSecret())
    .update(data)
    .digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error("Invalid review token signature.");
  }

  const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as ReviewTokenPayload;

  if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
    throw new Error("Review token has expired — please request a new review link.");
  }
  if (!payload.customerId || !payload.productId || !payload.orderId) {
    throw new Error("Malformed review token payload.");
  }

  return payload;
}

/**
 * Public DTO for a review — NO customer_id/phone/email. Author display
 * name is the customer's first name, or "زبون" if unavailable.
 */
function toPublicDto(review: ProductReview): ProductReviewPublic {
  const fullName = review.customer?.full_name?.trim();
  const firstName = fullName ? fullName.split(/\s+/)[0] : undefined;
  return {
    id: review.id,
    rating: review.rating,
    title: review.title,
    body: review.body,
    author_name: firstName || "زبون",
    created_at: review.created_at,
  };
}

/**
 * Orchestration for product reviews: verified-buyer token issuance/verification,
 * insert-only submission, moderation, and public reads. Never touches
 * Supabase directly — always goes through `reviews.repository.ts`.
 */
export class ReviewService {
  /**
   * Issue a 30-day verified-buyer token over
   * `{ customerId, productId, orderId }` — the token itself is what makes
   * the web review "verified" without requiring a login.
   */
  issueReviewToken(customerId: string, productId: string, orderId: string): string {
    return signToken({
      customerId,
      productId,
      orderId,
      exp: Date.now() + TOKEN_TTL_MS,
    });
  }

  /** Verify a review token. Throws on invalid/expired/malformed tokens. */
  verifyReviewToken(token: string): ReviewTokenPayload {
    return verifyToken(token);
  }

  /** `{STORE_BASE}/review/{token}` — the link sent via the post-delivery WhatsApp notification. */
  buildReviewUrl(token: string): string {
    return `${getStoreBase()}/review/${token}`;
  }

  /**
   * Submit a review. Requires a valid, unexpired token — never trusts a
   * raw customerId from the client. INSERT-ONLY: on a unique-violation
   * (product_id, customer_id already reviewed) returns a friendly
   * "already reviewed" error and NEVER upserts/overwrites the existing
   * row (which would downgrade an approved review back to pending).
   */
  async submitReview(input: SubmitReviewInput): Promise<{ success: boolean; error?: string }> {
    let payload: ReviewTokenPayload;
    try {
      payload = verifyToken(input.token);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Invalid review token." };
    }

    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      return { success: false, error: "Rating must be a whole number between 1 and 5." };
    }

    const isVerifiedBuyer = await reviewRepository.hasDeliveredOrder(
      payload.customerId,
      payload.productId
    );
    if (!isVerifiedBuyer) {
      return {
        success: false,
        error: "Only verified buyers with a delivered order can review this product.",
      };
    }

    const { review, isDuplicate } = await reviewRepository.createReview({
      product_id: payload.productId,
      customer_id: payload.customerId,
      order_id: payload.orderId,
      rating: input.rating,
      title: input.title?.trim() || null,
      body: input.body?.trim() || null,
    });

    if (isDuplicate) {
      return { success: false, error: "You have already reviewed this product." };
    }
    if (!review) {
      return { success: false, error: "Failed to submit review." };
    }

    return { success: true };
  }

  /** Admin moderation queue, optionally filtered by status. */
  async listForModeration(status?: ReviewStatus): Promise<ProductReview[]> {
    return reviewRepository.getAllForModeration(status);
  }

  /** Admin approve/reject action. */
  async moderate(id: string, status: "approved" | "rejected"): Promise<ProductReview | null> {
    return reviewRepository.setStatus(id, status);
  }

  /** Public product page data: approved reviews + rating aggregate. */
  async getProductReviews(
    productId: string
  ): Promise<{ reviews: ProductReviewPublic[]; aggregate: ReviewAggregate }> {
    const [reviews, aggregate] = await Promise.all([
      reviewRepository.getApprovedByProduct(productId),
      reviewRepository.getAggregate(productId),
    ]);

    return { reviews: reviews.map(toPublicDto), aggregate };
  }
}

export const reviewsService = new ReviewService();
