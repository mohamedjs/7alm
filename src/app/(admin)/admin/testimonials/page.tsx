"use client";

import Link from "next/link";
import { useTestimonialsManager } from "@/features/testimonials/testimonials.hooks";
import { TestimonialList } from "@/components/admin/testimonials/TestimonialList";
import { useLocale } from "@/features/i18n/i18n.hooks";
import { Plus } from "lucide-react";

export default function TestimonialsPage() {
  const { testimonials, isLoading, removeTestimonial } = useTestimonialsManager();
  const { t } = useLocale();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">{t("testimonials.title")}</h1>
        <Link
          href="/admin/testimonials/create"
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-white transition-all neu-btn"
        >
          <Plus className="h-4 w-4" />
          {t("testimonials.add")}
        </Link>
      </div>

      <div className="rounded-2xl bg-surface neu-raised">
        <TestimonialList
          testimonials={testimonials}
          isLoading={isLoading}
          onDelete={removeTestimonial}
        />
      </div>
    </div>
  );
}
