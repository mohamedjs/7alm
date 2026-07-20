"use client";

import { X } from "lucide-react";
import type { CategoryInput } from "@/features/categories/categories.api";
import type { Category } from "@/features/shared/types";

interface CategoryFormProps {
  formData: CategoryInput;
  setFormData: (data: CategoryInput) => void;
  categories: Category[];
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
  isEditing: boolean;
  editingCategoryId?: string;
}

export function CategoryForm({
  formData,
  setFormData,
  categories,
  isSaving,
  onSave,
  onClose,
  isEditing,
  editingCategoryId
}: CategoryFormProps) {
  // Only top-level categories can be parents, and a category cannot be its own parent
  const parentOptions = categories.filter(
    cat => cat.parent_id === null && cat.id !== editingCategoryId
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {isEditing ? "Edit Category" : "Add Category"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name (Arabic)
              </label>
              <input
                type="text"
                required
                className="w-full border rounded-md px-3 py-2"
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name (English)
              </label>
              <input
                type="text"
                required
                className="w-full border rounded-md px-3 py-2"
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug
            </label>
            <input
              type="text"
              required
              className="w-full border rounded-md px-3 py-2"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parent Category
            </label>
            <select
              className="w-full border rounded-md px-3 py-2 bg-white"
              value={formData.parent_id || ""}
              onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || null })}
            >
              <option value="">None (Top-Level)</option>
              {parentOptions.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name_en} - {cat.name_ar}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL
            </label>
            <input
              type="text"
              className="w-full border rounded-md px-3 py-2"
              value={formData.image || ""}
              onChange={(e) => setFormData({ ...formData, image: e.target.value || null })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort Order
              </label>
              <input
                type="number"
                className="w-full border rounded-md px-3 py-2"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
