"use client";

import { useCallback, useState, useMemo } from "react";
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
  useUpdateCategoryMutation,
} from "./categories.api";
import type { CategoryInput } from "./categories.api";
import type { Category, CategoryTree } from "@/features/shared/types";

const EMPTY_FORM: CategoryInput = {
  name_ar: "",
  name_en: "",
  slug: "",
  parent_id: null,
  is_active: true,
  sort_order: 0,
  image: null,
};

export function useCategoryTree(categories: Category[]) {
  return useMemo(() => {
    const map = new Map<string, CategoryTree>();
    const roots: CategoryTree[] = [];

    // Initialize all items
    categories.forEach((cat) => {
      map.set(cat.id, { ...cat, subcategories: [] });
    });

    // Build the tree
    categories.forEach((cat) => {
      const node = map.get(cat.id)!;
      if (cat.parent_id) {
        const parent = map.get(cat.parent_id);
        if (parent) {
          parent.subcategories.push(node);
        } else {
          // Parent not found, treat as root to avoid hiding it
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [categories]);
}

export function useCategoriesManager() {
  const { data: categories, isLoading, error, refetch } = useGetCategoriesQuery();

  const [createCategory, createState] = useCreateCategoryMutation();
  const [updateCategory, updateState] = useUpdateCategoryMutation();
  const [deleteCategory, deleteState] = useDeleteCategoryMutation();

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryInput>(EMPTY_FORM);

  const tree = useCategoryTree(categories || []);

  const saveCategory = useCallback(
    async (data: CategoryInput) => {
      if (editingCategory) {
        await updateCategory({ id: editingCategory.id, ...data }).unwrap();
      } else {
        await createCategory(data).unwrap();
      }
    },
    [createCategory, updateCategory, editingCategory],
  );

  const removeCategory = useCallback(
    async (id: string) => {
      await deleteCategory(id).unwrap();
    },
    [deleteCategory],
  );

  return {
    categories: categories ?? [],
    tree,
    isLoading,
    error,
    refetch,
    editingCategory,
    setEditingCategory,
    formData,
    setFormData,
    saveCategory,
    removeCategory,
    createState,
    updateState,
    deleteState,
  };
}
