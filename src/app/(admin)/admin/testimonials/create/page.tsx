"use client";

import { useRouter } from "next/navigation";
import { useTestimonialsManager } from "@/features/testimonials/testimonials.hooks";
import { TestimonialForm } from "@/components/admin/testimonials/TestimonialForm";
import { useLocale } from "@/features/i18n/i18n.hooks";

/**
 * /admin/testimonials/create — full-page testimonial creation
 */
export default function CreateTestimonialPage() {
  const router = useRouter();
  const { t } = useLocale();
  const { formData, setFormData, saveTestimonial, createState } = useTestimonialsManager();

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

  return (
    <div>
      <div className="mb-8">
        <h2 className="mb-2 text-2xl font-bold text-text-primary">{t("testimonials.create.title")}</h2>
        <p className="text-text-muted">{t("testimonials.create.subtitle")}</p>
      </div>

      <TestimonialForm
        formData={formData}
        setFormData={setFormData}
        isSaving={createState.isLoading}
        onSave={handleSave}
        onClose={() => router.push("/admin/testimonials")}
        isEditing={false}
        embedded
      />
    </div>
  );
}
