"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useCategoriesManager } from "@/features/categories/categories.hooks";
import { CategoryForm } from "@/components/admin/categories/CategoryForm";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { CategoryInput } from "@/features/categories/categories.api";

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { t } = useLocale();

  const {
    categories,
    isLoading,
    editingCategory,
    setEditingCategory,
    formData,
    setFormData,
    saveCategory,
    updateState,
  } = useCategoriesManager();

  useEffect(() => {
    if (!isLoading && categories.length > 0) {
      const category = categories.find((c) => c.id === id);
      if (category) {
        setEditingCategory(category);
        setFormData(category as CategoryInput);
      }
    }
  }, [isLoading, categories, id, setEditingCategory, setFormData]);

  const notFound = !isLoading && categories.length > 0 && !categories.some((c) => c.id === id);

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

  if (notFound) {
    return (
      <div className="space-y-4 p-8 text-center">
        <p className="text-text-muted">{t("categories.notFound")}</p>
        <Link href="/admin/categories" className="text-brand-600 hover:underline dark:text-brand-400">
          {t("categories.backToCategories")}
        </Link>
      </div>
    );
  }

  if (isLoading || !editingCategory) {
    return <div className="p-8 text-text-muted">{t("categories.loadingData")}</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="mb-2 text-2xl font-bold text-text-primary">{t("categories.edit.title")}</h2>
        <p className="text-text-muted">{t("categories.edit.subtitle")}</p>
      </div>

      <CategoryForm
        formData={formData}
        setFormData={setFormData}
        categories={categories}
        isSaving={updateState.isLoading}
        onSave={handleSave}
        onClose={() => router.push("/admin/categories")}
        isEditing={true}
        editingCategoryId={editingCategory.id}
        embedded
      />
    </div>
  );
}
