import { describe, expect, it } from "vitest";
import { evaluateCoupon, type CouponDto } from "./coupon";

const now = new Date("2026-11-12T10:00:00Z");
const coupon = (over: Partial<CouponDto>): CouponDto => ({
  id: "c1",
  code: "SAVE10",
  type: "percentage",
  value: 10,
  min_order_total: 0,
  max_discount: null,
  first_order_only: false,
  per_customer_limit: null,
  usage_limit: null,
  used_count: 0,
  starts_at: null,
  expires_at: null,
  is_active: true,
  created_at: now.toISOString(),
  updated_at: now.toISOString(),
  ...over,
});

describe("evaluateCoupon", () => {
  it("applies a capped percentage", () => {
    const r = evaluateCoupon(coupon({ value: 50, max_discount: 100 }), 500, 50, now);
    expect(r).toMatchObject({ valid: true, discountAmount: 100, finalShipping: 50 });
  });
  it("never discounts more than the subtotal", () => {
    expect(evaluateCoupon(coupon({ type: "fixed", value: 900 }), 300, 0, now).discountAmount).toBe(300);
  });
  it("zeroes shipping for free_shipping", () => {
    expect(evaluateCoupon(coupon({ type: "free_shipping", value: 0 }), 300, 60, now)).toMatchObject({ shippingDiscount: 60, finalShipping: 0 });
  });
  it("rejects expired, exhausted and repeat-buyer cases", () => {
    expect(evaluateCoupon(coupon({ expires_at: "2026-01-01T00:00:00Z" }), 100, 0, now).error).toMatch(/expired/);
    expect(evaluateCoupon(coupon({ usage_limit: 1, used_count: 1 }), 100, 0, now).error).toMatch(/usage limit/);
    expect(evaluateCoupon(coupon({ first_order_only: true }), 100, 0, now, { redemptionsOfThisCoupon: 0, hasAnyOrder: true }).error).toMatch(/first order/);
  });
});
