import { supabase } from "@/lib/supabase";
import type { Category } from "@/features/shared/types";

export class CategoryRepository {
  async getAllCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }
    return data || [];
  }

  async getActiveCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching active categories:", error);
      throw error;
    }
    return data || [];
  }

  async getCategoryById(id: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching category by id:", error);
      return null;
    }
    return data;
  }

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      if (error.code !== "PGRST116") { // not found
        console.error("Error fetching category by slug:", error);
      }
      return null;
    }
    return data;
  }
}

export const categoryRepository = new CategoryRepository();
