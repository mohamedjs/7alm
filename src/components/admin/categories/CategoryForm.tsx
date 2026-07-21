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

  const inputClasses = "w-full neu-input rounded-xl px-3 py-2 transition-all";
  const labelClasses = "block text-sm font-medium text-text-muted mb-1";

  const fields = (
    <div className={embedded ? "space-y-4" : "p-6 space-y-4"}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClasses}>
            {t("categories.form.nameAr")}
          </label>
          <input
            type="text"
            required
            className={inputClasses}
            value={formData.name_ar}
            onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClasses}>
            {t("categories.form.nameEn")}
          </label>
          <input
            type="text"
            required
            className={inputClasses}
            value={formData.name_en}
            onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className={labelClasses}>
          {t("categories.form.slug")}
        </label>
        <input
          type="text"
          required
          dir="ltr"
          className={inputClasses}
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
        />
      </div>

      <div>
        <label className={labelClasses}>
          {t("categories.form.parentCategory")}
        </label>
        <select
          className={inputClasses}
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
        <label className={labelClasses}>
          {t("categories.form.image")}
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder={t("categories.form.imageUrl")}
            dir="ltr"
            className={`flex-1 ${inputClasses}`}
            value={formData.image || ""}
            onChange={(e) => setFormData({ ...formData, image: e.target.value || null })}
          />
          <label className="bg-surface text-text-primary px-4 py-2 rounded-xl cursor-pointer whitespace-nowrap neu-btn">
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
          <div className="w-24 h-24 relative rounded-xl overflow-hidden neu-pressed-sm">
            <Image src={formData.image} alt="Category preview" fill className="object-cover" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClasses}>
            {t("categories.form.sortOrder")}
          </label>
          <input
            type="number"
            className={inputClasses}
            value={formData.sort_order}
            onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="flex items-center pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="rounded accent-brand-500 w-4 h-4"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
            <span className="text-sm font-medium text-text-muted">{t("categories.form.active")}</span>
          </label>
        </div>
      </div>
    </div>
  );

  const actions = (
    <div
      className={
        embedded
          ? "flex justify-end gap-3 pt-4 mt-2 border-t border-border/20"
          : "p-6 border-t border-border/20 bg-surface flex justify-end gap-3"
      }
    >
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-text-muted hover:text-text-primary rounded-xl transition-all neu-raised-sm"
      >
        {t("common.cancel")}
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="px-4 py-2 bg-brand-500 text-white rounded-xl transition-all disabled:opacity-50 neu-btn"
      >
        {isSaving ? t("common.saving") : t("common.save")}
      </button>
    </div>
  );

  if (embedded) {
    return (
      <div className="bg-surface rounded-2xl w-full p-6 neu-raised">
        <h2 className="text-xl font-semibold text-text-primary mb-6">
          {isEditing ? t("categories.form.editTitle") : t("categories.form.addTitle")}
        </h2>
        {fields}
        {actions}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto neu-raised">
        <div className="flex items-center justify-between p-6 border-b border-border/20">
          <h2 className="text-xl font-semibold text-text-primary">
            {isEditing ? t("categories.form.editTitle") : t("categories.form.addTitle")}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary rounded-xl p-1 transition-all neu-raised-sm">
            <X className="w-5 h-5" />
          </button>
        </div>
        {fields}
        {actions}
      </div>
    </div>
  );
}
