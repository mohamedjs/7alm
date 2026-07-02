import { supabase } from "@/lib/supabase";
import type { Product } from "@/features/shared/types";

export class ProductRepository {
  async getActiveProduct(): Promise<Product | null> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single();

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
      console.error("Error fetching product by id:", error);
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
      console.error("Error fetching product by slug:", error);
      return null;
    }
    return data;
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
