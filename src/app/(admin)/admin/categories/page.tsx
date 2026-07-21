"use client";

import Link from "next/link";
import { useCategoriesManager } from "@/features/categories/categories.hooks";
import { CategoryList } from "@/components/admin/categories/CategoryList";
import { useLocale } from "@/features/i18n/i18n.hooks";
import { Plus } from "lucide-react";

export default function CategoriesPage() {
  const { tree, isLoading, removeCategory } = useCategoriesManager();
  const { t } = useLocale();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">{t("categories.title")}</h1>
        <Link
          href="/admin/categories/create"
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-white transition-all neu-btn"
        >
          <Plus className="h-4 w-4" />
          {t("categories.add")}
        </Link>
      </div>

      <div className="rounded-2xl bg-surface neu-raised">
        <CategoryList
          tree={tree}
          isLoading={isLoading}
          onDelete={removeCategory}
        />
      </div>
    </div>
  );
}
