import { Inject, Injectable } from "@nestjs/common";
import { CLOCK, type Clock } from "../../../shared/application/clock.port";
import { DomainError } from "../../../shared/domain/domain-error";
import { COUPON_STORE, evaluateCoupon, type CouponInput, type CouponStore, type CouponValidationResult } from "../domain/coupon";

/** Exported to ordering: price a coupon and redeem it inside the order transaction. */
@Injectable()
export class PromotionsFacade {
  constructor(
    @Inject(COUPON_STORE) private readonly store: CouponStore,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async evaluate(input: { code: string; subtotal: number; shippingCost: number; customerId?: string }, tx?: unknown): Promise<CouponValidationResult> {
    const code = (input.code || "").trim();
    if (!code) {
      return { valid: false, discountAmount: 0, shippingDiscount: 0, finalShipping: Math.max(0, input.shippingCost || 0), error: "Coupon code is required." };
    }
    const coupon = await this.store.findByCode(code, tx);
    const buyer = coupon && input.customerId ? await this.store.buyerHistory(coupon.id, input.customerId, tx) : undefined;
    return evaluateCoupon(coupon, input.subtotal, input.shippingCost, this.clock.now(), buyer);
  }

  async redeem(couponId: string, customerId: string, orderId: string, tx?: unknown): Promise<void> {
    const ok = await this.store.redeem(couponId, customerId, orderId, tx);
    if (!ok) throw DomainError.conflict("This coupon has reached its usage limit.");
  }
}

@Injectable()
export class PromotionsAdmin {
  constructor(@Inject(COUPON_STORE) private readonly store: CouponStore) {}

  list() {
    return this.store.list();
  }
  create(input: CouponInput) {
    return this.store.create(input);
  }
  update(id: string, input: Partial<CouponInput>) {
    return this.store.update(id, input);
  }
  delete(id: string) {
    return this.store.delete(id);
  }
}
