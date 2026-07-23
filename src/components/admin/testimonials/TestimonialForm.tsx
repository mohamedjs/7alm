"use client";

import { X } from "lucide-react";
import type { TestimonialInput } from "@/features/testimonials/testimonials.api";
import { useLocale } from "@/features/i18n/i18n.hooks";

interface TestimonialFormProps {
  formData: TestimonialInput;
  setFormData: (data: TestimonialInput) => void;
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
  isEditing: boolean;
  /** Render as an inline page card (no fixed overlay/close button) instead of a modal. */
  embedded?: boolean;
}

export function TestimonialForm({
  formData,
  setFormData,
  isSaving,
  onSave,
  onClose,
  isEditing,
  embedded = false,
}: TestimonialFormProps) {
  const { t } = useLocale();

  const inputClasses = "w-full neu-input rounded-xl px-3 py-2 transition-all";
  const labelClasses = "block text-sm font-medium text-text-muted mb-1";

  const fields = (
    <div className={embedded ? "space-y-4" : "p-6 space-y-4"}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClasses}>{t("testimonials.form.nameAr")}</label>
          <input
            type="text"
            required
            dir="rtl"
            className={inputClasses}
            value={formData.name_ar}
            onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClasses}>{t("testimonials.form.nameEn")}</label>
          <input
            type="text"
            dir="ltr"
            className={inputClasses}
            value={formData.name_en}
            onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClasses}>{t("testimonials.form.roleAr")}</label>
          <input
            type="text"
            dir="rtl"
            className={inputClasses}
            value={formData.role_ar}
            onChange={(e) => setFormData({ ...formData, role_ar: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClasses}>{t("testimonials.form.roleEn")}</label>
          <input
            type="text"
            dir="ltr"
            className={inputClasses}
            value={formData.role_en}
            onChange={(e) => setFormData({ ...formData, role_en: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className={labelClasses}>{t("testimonials.form.textAr")}</label>
        <textarea
          required
          rows={3}
          dir="rtl"
          className={inputClasses}
          value={formData.text_ar}
          onChange={(e) => setFormData({ ...formData, text_ar: e.target.value })}
        />
      </div>

      <div>
        <label className={labelClasses}>{t("testimonials.form.textEn")}</label>
        <textarea
          rows={3}
          dir="ltr"
          className={inputClasses}
          value={formData.text_en}
          onChange={(e) => setFormData({ ...formData, text_en: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClasses}>{t("testimonials.form.rating")}</label>
          <select
            className={inputClasses}
            value={formData.rating}
            onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value, 10) || 5 })}
          >
            {[1, 2, 3, 4, 5].map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="rounded accent-brand-500 w-4 h-4"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
            <span className="text-sm font-medium text-text-muted">{t("testimonials.form.active")}</span>
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
          {isEditing ? t("testimonials.form.editTitle") : t("testimonials.form.addTitle")}
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
            {isEditing ? t("testimonials.form.editTitle") : t("testimonials.form.addTitle")}
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
