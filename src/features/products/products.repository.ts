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
      .order("created_at", { ascending: false });

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
