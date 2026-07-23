"use client";

import { useState, useEffect } from "react";
import type { Testimonial } from "@/features/shared/types";
import { useLocale } from "@/features/i18n/i18n.hooks";

interface TestimonialFormProps {
  initialData?: Testimonial;
  onSubmit: (data: Omit<Testimonial, "id" | "created_at">) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function TestimonialForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: TestimonialFormProps) {
  const { t } = useLocale();
  const [formData, setFormData] = useState<Omit<Testimonial, "id" | "created_at">>({
    name_ar: "",
    name_en: "",
    role_ar: "",
    role_en: "",
    text_ar: "",
    text_en: "",
    rating: 5,
    is_active: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name_ar: initialData.name_ar,
        name_en: initialData.name_en || "",
        role_ar: initialData.role_ar || "",
        role_en: initialData.role_en || "",
        text_ar: initialData.text_ar,
        text_en: initialData.text_en || "",
        rating: initialData.rating,
        is_active: initialData.is_active,
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
    } else if (name === "rating") {
      setFormData({ ...formData, [name]: parseInt(value, 10) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border bg-surface-hover px-6 py-4">
          <h2 className="text-xl font-bold text-text-primary">
            {initialData ? "Edit Testimonial" : "Create Testimonial"}
          </h2>
          <button
            onClick={onCancel}
            className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6">
          <form id="testimonial-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Name (Arabic) *</label>
                <input
                  type="text"
                  name="name_ar"
                  required
                  value={formData.name_ar}
                  onChange={handleChange}
                  dir="rtl"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2 text-text-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Name (English)</label>
                <input
                  type="text"
                  name="name_en"
                  value={formData.name_en || ""}
                  onChange={handleChange}
                  dir="ltr"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2 text-text-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Role (Arabic)</label>
                <input
                  type="text"
                  name="role_ar"
                  value={formData.role_ar || ""}
                  onChange={handleChange}
                  dir="rtl"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2 text-text-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Role (English)</label>
                <input
                  type="text"
                  name="role_en"
                  value={formData.role_en || ""}
                  onChange={handleChange}
                  dir="ltr"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2 text-text-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-text-primary">Text (Arabic) *</label>
                <textarea
                  name="text_ar"
                  required
                  rows={3}
                  value={formData.text_ar}
                  onChange={handleChange}
                  dir="rtl"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2 text-text-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-text-primary">Text (English)</label>
                <textarea
                  name="text_en"
                  rows={3}
                  value={formData.text_en || ""}
                  onChange={handleChange}
                  dir="ltr"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2 text-text-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Rating</label>
                <select
                  name="rating"
                  value={formData.rating}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2 text-text-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {[1, 2, 3, 4, 5].map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? "Star" : "Stars"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-3 space-x-reverse pt-8">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="h-5 w-5 rounded border-border text-brand-500 focus:ring-brand-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-text-primary">
                  Active (Visible on Store)
                </label>
              </div>
            </div>
          </form>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border bg-surface-hover px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface hover:text-text-primary disabled:opacity-50"
          >
            {t("action.cancel")}
          </button>
          <button
            type="submit"
            form="testimonial-form"
            disabled={isSubmitting}
            className="neu-pressed-sm rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-600 disabled:opacity-50"
          >
            {isSubmitting ? t("action.loading") : t("action.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
