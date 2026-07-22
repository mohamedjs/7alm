import { supabase } from "@/lib/supabase";
import type { Product } from "@/features/shared/types";

export class ProductRepository {
  async getActiveProduct(): Promise<Product[] | null> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching product:", error);
      return null;
    }
    return data;
  }

  async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code !== "PGRST116") { // not found — expected, not an error
        console.error("Error fetching product by id:", error);
      }
      return null;
    }
    return data;
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code !== "PGRST116") { // not found — expected, not an error
        console.error("Error fetching product by slug:", error);
      }
      return null;
    }
    return data;
  }

  /**
   * Active products flagged `is_featured` — the Lookbook homepage's
   * hero thumbnail row (Phase 2).
   */
  async getFeaturedProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("featured_sort", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching featured products:", error);
      return [];
    }
    return data || [];
  }

  /**
   * Active products belonging to any of the given category ids.
   */
  async getActiveProductsByCategoryIds(categoryIds: string[]): Promise<Product[]> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .in("category_id", categoryIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching products by category:", error);
      return [];
    }
    return data || [];
  }

  /**
   * Every active product, across all categories — used by `/products`
   * (Phase 3) and the public `/api/products` route (no filter).
   */
  async getAllActiveProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching active products:", error);
      return [];
    }
    return data || [];
  }

  /**
   * Best sellers, ranked by total order count. Tallies `orders.product_id`
   * (legacy single-product funnel orders — where most of the historical
   * order volume actually lives) plus `order_items.product_id` (multi-item
   * cart orders), sums per product, then sorts descending. Only
   * `is_active` products are eligible, and Postgres can't cleanly `GROUP
   * BY` through supabase-js's query builder, so the tally happens in JS
   * over the raw `product_id` columns rather than as SQL aggregation.
   *
   * If fewer than `limit` products have any order history (e.g. a young
   * store), the tail is padded with other active products — newest first
   * (`getAllActiveProducts()`'s own ordering) — so the section is never
   * sparse. Ranked products always come before padding.
   */
  async getBestSellerProducts(limit = 8): Promise<Product[]> {
    const [{ data: orderRows, error: orderError }, { data: itemRows, error: itemError }] =
      await Promise.all([
        supabase.from("orders").select("product_id").not("product_id", "is", null),
        supabase.from("order_items").select("product_id").not("product_id", "is", null),
      ]);

    if (orderError) {
      console.error("Error fetching orders for best sellers:", orderError);
    }
    if (itemError) {
      console.error("Error fetching order_items for best sellers:", itemError);
    }

    const tally = new Map<string, number>();
    for (const row of [...(orderRows ?? []), ...(itemRows ?? [])]) {
      if (!row.product_id) continue;
      tally.set(row.product_id, (tally.get(row.product_id) ?? 0) + 1);
    }

    const activeProducts = await this.getAllActiveProducts();
    if (activeProducts.length === 0) return [];

    const productsById = new Map(activeProducts.map((p) => [p.id, p]));

    const ranked = [...tally.entries()]
      .filter(([id]) => productsById.has(id))
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => productsById.get(id) as Product);

    const rankedIds = new Set(ranked.map((p) => p.id));
    // `activeProducts` is already newest-first (getAllActiveProducts'
    // own ordering) — reused as-is for the padding tail.
    const padding = activeProducts.filter((p) => !rankedIds.has(p.id));

    return [...ranked, ...padding].slice(0, limit);
  }

  async updateStock(
    productId: string,
    quantityChange: number
  ): Promise<boolean> {
    const product = await this.getProductById(productId);
    if (!product) return false;

    const newQuantity = product.quantity + quantityChange;
    const stockStatus =
      newQuantity <= 0
        ? "out_of_stock"
        : newQuantity <= 5
          ? "low_stock"
          : "in_stock";

    const { error } = await supabase
      .from("products")
      .update({
        quantity: Math.max(0, newQuantity),
        stock_status: stockStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (error) {
      console.error("Error updating stock:", error);
      return false;
    }
    return true;
  }
}

export const productRepository = new ProductRepository();
