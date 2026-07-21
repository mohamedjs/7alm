"use client";

import { useRouter } from "next/navigation";
import { useCategoriesManager } from "@/features/categories/categories.hooks";
import { CategoryForm } from "@/components/admin/categories/CategoryForm";
import { useLocale } from "@/features/i18n/i18n.hooks";

/**
 * /admin/categories/create — full-page category creation
 */
export default function CreateCategoryPage() {
  const router = useRouter();
  const { t } = useLocale();
  const {
    categories,
    formData,
    setFormData,
    saveCategory,
    createState,
  } = useCategoriesManager();

  const handleSave = async () => {
    try {
      await saveCategory(formData);
      router.push("/admin/categories");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("categories.saveFailed");
      alert(message);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="mb-2 text-2xl font-bold text-text-primary">{t("categories.create.title")}</h2>
        <p className="text-text-muted">{t("categories.create.subtitle")}</p>
      </div>

      <CategoryForm
        formData={formData}
        setFormData={setFormData}
        categories={categories}
        isSaving={createState.isLoading}
        onSave={handleSave}
        onClose={() => router.push("/admin/categories")}
        isEditing={false}
        embedded
      />
    </div>
  );
}
