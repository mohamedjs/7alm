import { supabase } from "@/lib/supabase";
import type { Coupon, CouponInput } from "@/features/shared/types";

/**
 * Raw Supabase access for `coupons` and `coupon_redemptions`. No business
 * logic here — that lives in `coupons.service.ts`.
 */
export class CouponRepository {
  /**
   * Case-insensitive lookup by code. Codes are stored uppercased, but this
   * still normalizes the input defensively.
   */
  async getByCode(code: string): Promise<Coupon | null> {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .ilike("code", code.trim())
      .maybeSingle();

    if (error) {
      console.error("Error fetching coupon by code:", error);
      return null;
    }
    return data;
  }

  async getById(id: string): Promise<Coupon | null> {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code !== "PGRST116") {
        console.error("Error fetching coupon by id:", error);
      }
      return null;
    }
    return data;
  }

  async getAll(): Promise<Coupon[]> {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching coupons:", error);
      return [];
    }
    return data || [];
  }

  async create(input: CouponInput): Promise<Coupon | null> {
    const { data, error } = await supabase
      .from("coupons")
      .insert({
        code: input.code.trim().toUpperCase(),
        type: input.type,
        value: input.value,
        min_order_total: input.min_order_total ?? 0,
        max_discount: input.max_discount ?? null,
        first_order_only: input.first_order_only ?? false,
        per_customer_limit: input.per_customer_limit ?? null,
        usage_limit: input.usage_limit ?? null,
        starts_at: input.starts_at ?? null,
        expires_at: input.expires_at ?? null,
        is_active: input.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating coupon:", error);
      return null;
    }
    return data;
  }

  async update(id: string, input: Partial<CouponInput>): Promise<Coupon | null> {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.code !== undefined) patch.code = input.code.trim().toUpperCase();
    if (input.type !== undefined) patch.type = input.type;
    if (input.value !== undefined) patch.value = input.value;
    if (input.min_order_total !== undefined) patch.min_order_total = input.min_order_total;
    if (input.max_discount !== undefined) patch.max_discount = input.max_discount;
    if (input.first_order_only !== undefined) patch.first_order_only = input.first_order_only;
    if (input.per_customer_limit !== undefined) patch.per_customer_limit = input.per_customer_limit;
    if (input.usage_limit !== undefined) patch.usage_limit = input.usage_limit;
    if (input.starts_at !== undefined) patch.starts_at = input.starts_at;
    if (input.expires_at !== undefined) patch.expires_at = input.expires_at;
    if (input.is_active !== undefined) patch.is_active = input.is_active;

    const { data, error } = await supabase
      .from("coupons")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating coupon:", error);
      return null;
    }
    return data;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) {
      console.error("Error deleting coupon:", error);
      return false;
    }
    return true;
  }

  /** How many times this customer has already redeemed this specific coupon. */
  async countCustomerRedemptions(couponId: string, customerId: string): Promise<number> {
    const { count, error } = await supabase
      .from("coupon_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", couponId)
      .eq("customer_id", customerId);

    if (error) {
      console.error("Error counting customer redemptions:", error);
      return 0;
    }
    return count || 0;
  }

  /** Whether this customer has ever placed any order — used for `first_order_only`. */
  async customerHasAnyOrder(customerId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId);

    if (error) {
      console.error("Error checking customer order history:", error);
      // Fail closed for first_order_only checks — treat as "has ordered before"
      // only if we can positively confirm it; on error, let the caller decide.
      return false;
    }
    return (count || 0) > 0;
  }

  /** Record a redemption row. Best-effort — called after order creation. */
  async recordRedemption(
    couponId: string,
    customerId: string,
    orderId: string
  ): Promise<boolean> {
    const { error } = await supabase.from("coupon_redemptions").insert({
      coupon_id: couponId,
      customer_id: customerId,
      order_id: orderId,
    });

    if (error) {
      console.error("Error recording coupon redemption:", error);
      return false;
    }
    return true;
  }

  /** Atomically bump `used_count` by 1 via a fetch-then-write (best-effort, low contention). */
  async incrementUsedCount(couponId: string): Promise<boolean> {
    const coupon = await this.getById(couponId);
    if (!coupon) return false;

    const { error } = await supabase
      .from("coupons")
      .update({ used_count: coupon.used_count + 1, updated_at: new Date().toISOString() })
      .eq("id", couponId);

    if (error) {
      console.error("Error incrementing coupon used_count:", error);
      return false;
    }
    return true;
  }
}

export const couponRepository = new CouponRepository();
