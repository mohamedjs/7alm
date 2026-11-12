import { round2 } from "../../../shared/domain/money";

export type CouponType = "percentage" | "fixed" | "free_shipping";

export interface CouponDto {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  min_order_total: number;
  max_discount: number | null;
  first_order_only: boolean;
  per_customer_limit: number | null;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CouponInput {
  code: string;
  type: CouponType;
  value: number;
  min_order_total?: number;
  max_discount?: number | null;
  first_order_only?: boolean;
  per_customer_limit?: number | null;
  usage_limit?: number | null;
  starts_at?: string | null;
  expires_at?: string | null;
  is_active?: boolean;
}

export interface CouponValidationResult {
  valid: boolean;
  discountAmount: number;
  shippingDiscount: number;
  finalShipping: number;
  couponId?: string;
  error?: string;
}

/** Facts about the buyer the rules need; absent when the buyer is anonymous. */
export interface BuyerHistory {
  redemptionsOfThisCoupon: number;
  hasAnyOrder: boolean;
}

export const normaliseCode = (code: string) => code.trim().toUpperCase();

/**
 * Pure coupon rules (v1 parity). The discount never exceeds the subtotal and
 * the shipping discount never exceeds the shipping cost.
 */
export function evaluateCoupon(
  coupon: CouponDto | null,
  subtotalIn: number,
  shippingIn: number,
  now: Date,
  buyer?: BuyerHistory,
): CouponValidationResult {
  const shipping = Number.isFinite(shippingIn) ? Math.max(0, shippingIn) : 0;
  const invalid = (error: string): CouponValidationResult => ({
    valid: false,
    discountAmount: 0,
    shippingDiscount: 0,
    finalShipping: round2(shipping),
    error,
  });

  if (!Number.isFinite(subtotalIn)) return invalid("Invalid order subtotal.");
  const subtotal = Math.max(0, subtotalIn);
  if (!coupon) return invalid("Coupon code not found.");
  if (!coupon.is_active) return invalid("This coupon is no longer active.");
  if (coupon.starts_at && now.getTime() < new Date(coupon.starts_at).getTime()) return invalid("This coupon is not active yet.");
  if (coupon.expires_at && now.getTime() > new Date(coupon.expires_at).getTime()) return invalid("This coupon has expired.");
  if (subtotal < coupon.min_order_total) {
    return invalid(`This coupon requires a minimum order total of ${coupon.min_order_total} EGP.`);
  }
  if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit) return invalid("This coupon has reached its usage limit.");
  if (buyer) {
    if (coupon.per_customer_limit != null && buyer.redemptionsOfThisCoupon >= coupon.per_customer_limit) {
      return invalid("You have already used this coupon the maximum number of times.");
    }
    if (coupon.first_order_only && buyer.hasAnyOrder) return invalid("This coupon is only valid on your first order.");
  }

  let discount = 0;
  let shippingDiscount = 0;
  if (coupon.type === "percentage") {
    const pct = Math.max(0, Math.min(100, coupon.value || 0));
    discount = subtotal * (pct / 100);
    if (coupon.max_discount != null) discount = Math.min(discount, coupon.max_discount);
  } else if (coupon.type === "fixed") {
    discount = coupon.value || 0;
  } else {
    shippingDiscount = shipping;
  }
  const discountAmount = round2(Math.max(0, Math.min(discount, subtotal)));
  shippingDiscount = round2(Math.max(0, Math.min(shippingDiscount, shipping)));
  return {
    valid: true,
    discountAmount,
    shippingDiscount,
    finalShipping: round2(Math.max(0, shipping - shippingDiscount)),
    couponId: coupon.id,
  };
}

export const COUPON_STORE = Symbol("COUPON_STORE");
export interface CouponStore {
  findByCode(code: string, tx?: unknown): Promise<CouponDto | null>;
  list(): Promise<CouponDto[]>;
  create(input: CouponInput): Promise<CouponDto>;
  update(id: string, input: Partial<CouponInput>): Promise<CouponDto>;
  delete(id: string): Promise<void>;
  buyerHistory(couponId: string, customerId: string, tx?: unknown): Promise<BuyerHistory>;
  /** Records the redemption and bumps `used_count`; false when the global limit was hit concurrently. */
  redeem(couponId: string, customerId: string, orderId: string, tx?: unknown): Promise<boolean>;
}
