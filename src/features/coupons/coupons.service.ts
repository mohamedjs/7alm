import { couponRepository } from "./coupons.repository";
import type { Coupon, CouponInput, CouponValidationResult } from "@/features/shared/types";

export interface ValidateAndApplyInput {
  code: string;
  subtotal: number;
  shippingCost: number;
  /** When omitted, per-customer/first-order rules are skipped (customer-independent preview only) — the authoritative, full check always runs at order creation with a resolved customerId. */
  customerId?: string;
}

/** Round to 2 decimal places, guarding against NaN/Infinity. */
function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Coupon business logic: validation/discount computation and admin CRUD
 * passthrough. Never touches Supabase directly — always goes through
 * `coupons.repository.ts`.
 */
export class CouponService {
  /**
   * Validate a coupon code against the current cart state and compute the
   * discount. Enforces: is_active, date window, min_order_total,
   * usage_limit, per_customer_limit, first_order_only. Percentage
   * discounts respect `max_discount`. `free_shipping` zeroes shipping.
   * `discountAmount` is guaranteed to never exceed `subtotal`.
   */
  async validateAndApply(input: ValidateAndApplyInput): Promise<CouponValidationResult> {
    const invalid = (error: string): CouponValidationResult => ({
      valid: false,
      discountAmount: 0,
      shippingDiscount: 0,
      finalShipping: round2(Math.max(0, input.shippingCost || 0)),
      error,
    });

    const code = (input.code || "").trim();
    if (!code) return invalid("Coupon code is required.");

    const subtotal = Number.isFinite(input.subtotal) ? Math.max(0, input.subtotal) : NaN;
    const shippingCost = Number.isFinite(input.shippingCost) ? Math.max(0, input.shippingCost) : 0;
    if (Number.isNaN(subtotal)) return invalid("Invalid order subtotal.");

    const coupon = await couponRepository.getByCode(code);
    if (!coupon) return invalid("Coupon code not found.");

    if (!coupon.is_active) return invalid("This coupon is no longer active.");

    const now = Date.now();
    if (coupon.starts_at && now < new Date(coupon.starts_at).getTime()) {
      return invalid("This coupon is not active yet.");
    }
    if (coupon.expires_at && now > new Date(coupon.expires_at).getTime()) {
      return invalid("This coupon has expired.");
    }

    if (subtotal < coupon.min_order_total) {
      return invalid(
        `This coupon requires a minimum order total of ${coupon.min_order_total} EGP.`
      );
    }

    if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit) {
      return invalid("This coupon has reached its usage limit.");
    }

    if (input.customerId) {
      if (coupon.per_customer_limit != null) {
        const used = await couponRepository.countCustomerRedemptions(coupon.id, input.customerId);
        if (used >= coupon.per_customer_limit) {
          return invalid("You have already used this coupon the maximum number of times.");
        }
      }

      if (coupon.first_order_only) {
        const hasOrder = await couponRepository.customerHasAnyOrder(input.customerId);
        if (hasOrder) {
          return invalid("This coupon is only valid on your first order.");
        }
      }
    }

    return this.computeDiscount(coupon, subtotal, shippingCost);
  }

  /** Pure discount computation for an already-validated, eligible coupon. */
  private computeDiscount(
    coupon: Coupon,
    subtotal: number,
    shippingCost: number
  ): CouponValidationResult {
    let discountAmount = 0;
    let shippingDiscount = 0;

    if (coupon.type === "percentage") {
      const pct = Math.max(0, Math.min(100, coupon.value || 0));
      let raw = subtotal * (pct / 100);
      if (coupon.max_discount != null) {
        raw = Math.min(raw, coupon.max_discount);
      }
      discountAmount = raw;
    } else if (coupon.type === "fixed") {
      discountAmount = coupon.value || 0;
    } else if (coupon.type === "free_shipping") {
      shippingDiscount = shippingCost;
    }

    // Never let the discount exceed the subtotal, never negative, never NaN.
    discountAmount = round2(Math.max(0, Math.min(discountAmount, subtotal)));
    shippingDiscount = round2(Math.max(0, Math.min(shippingDiscount, shippingCost)));
    const finalShipping = round2(Math.max(0, shippingCost - shippingDiscount));

    return {
      valid: true,
      discountAmount,
      shippingDiscount,
      finalShipping,
      couponId: coupon.id,
    };
  }

  /**
   * Record a redemption + bump `used_count`. Best-effort — called AFTER
   * the order row is created; a failure here must never fail the order.
   */
  async redeem(couponId: string, customerId: string, orderId: string): Promise<void> {
    try {
      await couponRepository.recordRedemption(couponId, customerId, orderId);
      await couponRepository.incrementUsedCount(couponId);
    } catch (err) {
      console.error("Failed to redeem coupon (order already created, continuing):", err);
    }
  }

  // --- Admin CRUD passthrough ---

  async getAllCoupons(): Promise<Coupon[]> {
    return couponRepository.getAll();
  }

  async getCouponById(id: string): Promise<Coupon | null> {
    return couponRepository.getById(id);
  }

  async createCoupon(input: CouponInput): Promise<Coupon | null> {
    return couponRepository.create(input);
  }

  async updateCoupon(id: string, input: Partial<CouponInput>): Promise<Coupon | null> {
    return couponRepository.update(id, input);
  }

  async deleteCoupon(id: string): Promise<boolean> {
    return couponRepository.delete(id);
  }
}

export const couponsService = new CouponService();
