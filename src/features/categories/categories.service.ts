import { categoryRepository } from "./categories.repository";
import type { Category } from "@/features/shared/types";
import { supabase } from "@/lib/supabase";

export class CategoryService {
  async getAllCategories(): Promise<Category[]> {
    return categoryRepository.getAllCategories();
  }

  async getActiveCategories(): Promise<Category[]> {
    return categoryRepository.getActiveCategories();
  }

  async validateCategory(data: Partial<Category>, categoryId?: string): Promise<void> {
    // 1. Check if category is its own parent
    if (categoryId && data.parent_id === categoryId) {
      throw new Error("A category cannot be its own parent.");
    }

    // 2. Prevent cycle
    if (categoryId && data.parent_id) {
      let currentParentId: string | null = data.parent_id;
      const allCategories = await this.getAllCategories();
      const map = new Map(allCategories.map(c => [c.id, c.parent_id]));
      
      while (currentParentId) {
        if (currentParentId === categoryId) {
          throw new Error("Cannot set parent to a descendant, it creates a cycle.");
        }
        currentParentId = map.get(currentParentId) || null;
      }
    }

    // 3. Slug uniqueness
    if (data.slug) {
      const existing = await categoryRepository.getCategoryBySlug(data.slug);
      if (existing && existing.id !== categoryId) {
        throw new Error("Category slug must be unique.");
      }
    }
  }

  // NOTE: Insert/Update operations for admin are typically handled directly in the API route using supabase to apply RLS/Auth easily,
  // but validation is done here or API route.
}

export const categoryService = new CategoryService();
