import { supabase } from "@/lib/supabase";
import type { ProductReview, ReviewAggregate, ReviewStatus } from "@/features/shared/types";

interface CreateReviewInput {
  product_id: string;
  customer_id: string;
  order_id: string | null;
  rating: number;
  title?: string | null;
  body?: string | null;
}

/** Postgres unique_violation error code. */
const UNIQUE_VIOLATION = "23505";

export class ReviewRepository {
  /**
   * INSERT-ONLY. Never upserts/updates — a resubmit must not downgrade an
   * already-approved/rejected review back to pending. On a unique
   * violation of (product_id, customer_id), `isDuplicate` is set instead
   * of throwing so the service layer can return a friendly message.
   */
  async createReview(
    input: CreateReviewInput
  ): Promise<{ review: ProductReview | null; isDuplicate: boolean }> {
    const { data, error } = await supabase
      .from("product_reviews")
      .insert({
        product_id: input.product_id,
        customer_id: input.customer_id,
        order_id: input.order_id,
        rating: input.rating,
        title: input.title ?? null,
        body: input.body ?? null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return { review: null, isDuplicate: true };
      }
      console.error("Error creating review:", error);
      throw error;
    }

    return { review: data, isDuplicate: false };
  }

  async getApprovedByProduct(productId: string): Promise<ProductReview[]> {
    const { data, error } = await supabase
      .from("product_reviews")
      .select("*, customer:customers (full_name)")
      .eq("product_id", productId)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching approved reviews:", error);
      return [];
    }
    return data || [];
  }

  async getAggregate(productId: string): Promise<ReviewAggregate> {
    const { data, error } = await supabase
      .from("product_reviews")
      .select("rating")
      .eq("product_id", productId)
      .eq("status", "approved");

    if (error) {
      console.error("Error fetching review aggregate:", error);
      return { average: 0, count: 0 };
    }
    if (!data || data.length === 0) {
      return { average: 0, count: 0 };
    }

    const count = data.length;
    const sum = data.reduce((acc, row) => acc + (row.rating || 0), 0);
    return { average: Math.round((sum / count) * 10) / 10, count };
  }

  async getAllForModeration(status?: ReviewStatus): Promise<ProductReview[]> {
    let query = supabase
      .from("product_reviews")
      .select("*, customer:customers (full_name, phone), product:products (name, slug)")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching reviews for moderation:", error);
      return [];
    }
    return data || [];
  }

  async setStatus(id: string, status: ReviewStatus): Promise<ProductReview | null> {
    const { data, error } = await supabase
      .from("product_reviews")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating review status:", error);
      return null;
    }
    return data;
  }

  async existsForCustomerProduct(customerId: string, productId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("product_reviews")
      .select("id")
      .eq("customer_id", customerId)
      .eq("product_id", productId)
      .limit(1);

    if (error) {
      console.error("Error checking existing review:", error);
      return false;
    }
    return !!data && data.length > 0;
  }

  /**
   * A customer counts as a verified buyer for `productId` if they have an
   * order with status 'delivered' that contains it — either via the
   * legacy `orders.product_id` column (single-product funnel orders) or
   * via `order_items` (multi-item cart orders). Checks both.
   */
  async hasDeliveredOrder(customerId: string, productId: string): Promise<boolean> {
    // 1. Legacy single-product column on `orders` itself.
    const { data: directOrders, error: directError } = await supabase
      .from("orders")
      .select("id")
      .eq("customer_id", customerId)
      .eq("product_id", productId)
      .eq("status", "delivered")
      .limit(1);

    if (directError) {
      console.error("Error checking delivered order (orders.product_id):", directError);
    } else if (directOrders && directOrders.length > 0) {
      return true;
    }

    // 2. Multi-item cart orders: the product lives in `order_items`,
    // which has no customer_id of its own — resolve the customer's
    // delivered order ids first, then check for a matching line item.
    const { data: deliveredOrders, error: ordersError } = await supabase
      .from("orders")
      .select("id")
      .eq("customer_id", customerId)
      .eq("status", "delivered");

    if (ordersError || !deliveredOrders || deliveredOrders.length === 0) {
      return false;
    }

    const orderIds = deliveredOrders.map((o) => o.id);

    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("id")
      .eq("product_id", productId)
      .in("order_id", orderIds)
      .limit(1);

    if (itemsError) {
      console.error("Error checking delivered order (order_items):", itemsError);
      return false;
    }

    return !!items && items.length > 0;
  }
}

export const reviewRepository = new ReviewRepository();
