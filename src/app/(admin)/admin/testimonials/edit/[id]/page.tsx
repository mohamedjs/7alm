"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTestimonialsManager } from "@/features/testimonials/testimonials.hooks";
import { TestimonialForm } from "@/components/admin/testimonials/TestimonialForm";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { TestimonialInput } from "@/features/testimonials/testimonials.api";

export default function EditTestimonialPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { t } = useLocale();

  const {
    testimonials,
    isLoading,
    editingTestimonial,
    setEditingTestimonial,
    formData,
    setFormData,
    saveTestimonial,
    updateState,
  } = useTestimonialsManager();

  useEffect(() => {
    if (!isLoading && testimonials.length > 0) {
      const testimonial = testimonials.find((item) => item.id === id);
      if (testimonial) {
        setEditingTestimonial(testimonial);
        setFormData({
          name_ar: testimonial.name_ar,
          name_en: testimonial.name_en ?? "",
          role_ar: testimonial.role_ar ?? "",
          role_en: testimonial.role_en ?? "",
          text_ar: testimonial.text_ar,
          text_en: testimonial.text_en ?? "",
          rating: testimonial.rating,
          is_active: testimonial.is_active,
        } satisfies TestimonialInput);
      }
    }
  }, [isLoading, testimonials, id, setEditingTestimonial, setFormData]);

  const notFound = !isLoading && testimonials.length > 0 && !testimonials.some((item) => item.id === id);

  const handleSave = async () => {
    try {
      await saveTestimonial(formData);
      router.push("/admin/testimonials");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("testimonials.saveFailed");
      alert(message);
    }
  };

  if (notFound) {
    return (
      <div className="space-y-4 p-8 text-center">
        <p className="text-text-muted">{t("testimonials.notFound")}</p>
        <Link href="/admin/testimonials" className="text-brand-600 hover:underline dark:text-brand-400">
          {t("testimonials.backToTestimonials")}
        </Link>
      </div>
    );
  }

  if (isLoading || !editingTestimonial) {
    return <div className="p-8 text-text-muted">{t("testimonials.loadingData")}</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="mb-2 text-2xl font-bold text-text-primary">{t("testimonials.edit.title")}</h2>
        <p className="text-text-muted">{t("testimonials.edit.subtitle")}</p>
      </div>

      <TestimonialForm
        formData={formData}
        setFormData={setFormData}
        isSaving={updateState.isLoading}
        onSave={handleSave}
        onClose={() => router.push("/admin/testimonials")}
        isEditing={true}
        embedded
      />
    </div>
  );
}
