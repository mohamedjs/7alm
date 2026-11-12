import { Inject, Injectable } from "@nestjs/common";
import { DomainError } from "../../../shared/domain/domain-error";
import { ENV } from "../../../shared/infrastructure/config/config.module";
import type { Env } from "../../../shared/infrastructure/config/env";
import { CatalogQueries } from "../../catalog";
import { CustomersFacade } from "../../customers";
import {
  aggregate,
  authorName,
  REVIEW_STORE,
  REVIEW_TOKEN_TTL_MS,
  signReviewToken,
  verifyReviewToken,
  type ReviewStatus,
  type ReviewStore,
} from "../domain/review";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const toPublic = (r: Row) => ({
  id: r.id,
  rating: r.rating,
  title: r.title,
  body: r.body,
  author_name: authorName(r.customer?.full_name),
  created_at: r.created_at,
});

@Injectable()
export class ReviewsFacade {
  constructor(@Inject(ENV) private readonly env: Env) {}

  private secret(): string {
    const s = this.env.REVIEW_TOKEN_SECRET ?? this.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
    if (!s) throw DomainError.unavailable("REVIEW_TOKEN_SECRET is not set");
    return s;
  }

  /** Signed review link for a delivered order (sent by the notifications worker). */
  reviewUrl(phone: string, productId: string, orderId: string): string {
    const token = signReviewToken({ phone, productId, orderId, exp: Date.now() + REVIEW_TOKEN_TTL_MS }, this.secret());
    return `${this.env.PUBLIC_APP_URL}/review/${token}`;
  }

  verify(token: string) {
    return verifyReviewToken(token, this.secret());
  }
}

@Injectable()
export class ReviewsUseCases {
  constructor(
    @Inject(REVIEW_STORE) private readonly store: ReviewStore,
    private readonly tokens: ReviewsFacade,
    private readonly customers: CustomersFacade,
    private readonly catalog: CatalogQueries,
  ) {}

  async submit(input: { token: string; rating: number; title?: string; body?: string }) {
    const payload = this.tokens.verify(input.token);
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      throw DomainError.validation("Rating must be a whole number between 1 and 5.");
    }
    const customer = await this.customers.findByPhone(payload.phone);
    if (!customer) throw DomainError.validation("No matching customer for this review link.");
    if (!(await this.store.hasDeliveredOrder(customer.id, payload.productId))) {
      throw DomainError.forbidden("Only verified buyers with a delivered order can review this product.");
    }
    const result = await this.store.create({
      product_id: payload.productId,
      customer_id: customer.id,
      order_id: payload.orderId,
      rating: input.rating,
      title: input.title?.trim() || null,
      body: input.body?.trim() || null,
    });
    if (result === "duplicate") throw DomainError.conflict("You have already reviewed this product.");
  }

  /** What the review page shows before submitting: the product being reviewed. */
  async describeToken(token: string) {
    const payload = this.tokens.verify(token);
    const all = await this.catalog.allActive();
    const product = all.find((p) => p.id === payload.productId);
    return { productId: payload.productId, productName: product?.name ?? null, productImage: product?.main_image ?? null };
  }

  async forProductSlug(slug: string) {
    const product = await this.catalog.bySlug(slug);
    if (!product) throw DomainError.notFound("Product not found");
    const [rows, ratings] = await Promise.all([this.store.approvedForProduct(product.id), this.store.ratings(product.id)]);
    return { reviews: rows.map(toPublic), aggregate: aggregate(ratings) };
  }

  async showcase(minRating = 4, limit = 12) {
    const [rows, ratings] = await Promise.all([this.store.topApproved(minRating, limit), this.store.ratings()]);
    return {
      reviews: rows.map((r: Row) => ({ ...toPublic(r), product_name: r.product?.name ?? null, product_slug: r.product?.slug ?? null })),
      aggregate: aggregate(ratings),
    };
  }

  moderationList(status?: ReviewStatus) {
    return this.store.forModeration(status);
  }

  async moderate(id: string, status: "approved" | "rejected") {
    const review = await this.store.setStatus(id, status);
    if (!review) throw DomainError.notFound("Review not found");
    return review;
  }
}
