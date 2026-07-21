"use client";

import { X } from "lucide-react";
import type { CategoryInput } from "@/features/categories/categories.api";
import type { Category } from "@/features/shared/types";
import { useMediaUpload } from "@/features/media/media.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";
import Image from "next/image";

interface CategoryFormProps {
  formData: CategoryInput;
  setFormData: (data: CategoryInput) => void;
  categories: Category[];
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
  isEditing: boolean;
  editingCategoryId?: string;
  /** Render as an inline page card (no fixed overlay/close button) instead of a modal. */
  embedded?: boolean;
}

export function CategoryForm({
  formData,
  setFormData,
  categories,
  isSaving,
  onSave,
  onClose,
  isEditing,
  editingCategoryId,
  embedded = false,
}: CategoryFormProps) {
  const { t } = useLocale();
  // Only top-level categories can be parents, and a category cannot be its own parent
  const parentOptions = categories.filter(
    cat => cat.parent_id === null && cat.id !== editingCategoryId
  );

  const { upload, uploading } = useMediaUpload();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await upload(file);
      setFormData({ ...formData, image: url });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("categories.form.uploadFailed");
      alert(message);
    }
  };

  const fields = (
    <div className={embedded ? "space-y-4" : "p-6 space-y-4"}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-muted mb-1">
            {t("categories.form.nameAr")}
          </label>
          <input
            type="text"
            required
            className="w-full border border-gray-300 dark:border-border rounded-md px-3 py-2 bg-white dark:bg-surface text-gray-900 dark:text-text-primary"
            value={formData.name_ar}
            onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-muted mb-1">
            {t("categories.form.nameEn")}
          </label>
          <input
            type="text"
            required
            className="w-full border border-gray-300 dark:border-border rounded-md px-3 py-2 bg-white dark:bg-surface text-gray-900 dark:text-text-primary"
            value={formData.name_en}
            onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-text-muted mb-1">
          {t("categories.form.slug")}
        </label>
        <input
          type="text"
          required
          dir="ltr"
          className="w-full border border-gray-300 dark:border-border rounded-md px-3 py-2 bg-white dark:bg-surface text-gray-900 dark:text-text-primary"
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-text-muted mb-1">
          {t("categories.form.parentCategory")}
        </label>
        <select
          className="w-full border border-gray-300 dark:border-border rounded-md px-3 py-2 bg-white dark:bg-surface text-gray-900 dark:text-text-primary"
          value={formData.parent_id || ""}
          onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || null })}
        >
          <option value="">{t("categories.form.noneTopLevel")}</option>
          {parentOptions.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name_en} - {cat.name_ar}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-text-muted mb-1">
          {t("categories.form.image")}
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder={t("categories.form.imageUrl")}
            dir="ltr"
            className="flex-1 border border-gray-300 dark:border-border rounded-md px-3 py-2 bg-white dark:bg-surface text-gray-900 dark:text-text-primary"
            value={formData.image || ""}
            onChange={(e) => setFormData({ ...formData, image: e.target.value || null })}
          />
          <label className="bg-gray-100 dark:bg-surface hover:bg-gray-200 dark:hover:bg-border text-gray-700 dark:text-text-primary px-4 py-2 rounded-md cursor-pointer whitespace-nowrap">
            {uploading ? t("common.uploadingEllipsis") : t("common.upload")}
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
            />
          </label>
        </div>
        {formData.image && (
          <div className="w-24 h-24 relative border border-gray-200 dark:border-border rounded overflow-hidden">
            <Image src={formData.image} alt="Category preview" fill className="object-cover" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-muted mb-1">
            {t("categories.form.sortOrder")}
          </label>
          <input
            type="number"
            className="w-full border border-gray-300 dark:border-border rounded-md px-3 py-2 bg-white dark:bg-surface text-gray-900 dark:text-text-primary"
            value={formData.sort_order}
            onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="flex items-center pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-gray-300 dark:border-border text-indigo-600 focus:ring-indigo-500"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
            <span className="text-sm font-medium text-gray-700 dark:text-text-muted">{t("categories.form.active")}</span>
          </label>
        </div>
      </div>
    </div>
  );

  const actions = (
    <div
      className={
        embedded
          ? "flex justify-end gap-3 pt-4 mt-2 border-t"
          : "p-6 border-t border-border bg-gray-50 dark:bg-surface flex justify-end gap-3"
      }
    >
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 border border-gray-300 dark:border-border text-gray-700 dark:text-text-primary rounded-md hover:bg-gray-100 dark:hover:bg-surface"
      >
        {t("common.cancel")}
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
      >
        {isSaving ? t("common.saving") : t("common.save")}
      </button>
    </div>
  );

  if (embedded) {
    return (
      <div className="bg-white dark:bg-surface-raised border border-gray-200 dark:border-border rounded-lg w-full p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary mb-6">
          {isEditing ? t("categories.form.editTitle") : t("categories.form.addTitle")}
        </h2>
        {fields}
        {actions}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-raised rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-border">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">
            {isEditing ? t("categories.form.editTitle") : t("categories.form.addTitle")}
          </h2>
          <button onClick={onClose} className="text-gray-500 dark:text-text-muted hover:text-gray-700 dark:hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>
        {fields}
        {actions}
      </div>
    </div>
  );
}
