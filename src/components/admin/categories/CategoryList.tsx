"use client";

import { Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import type { CategoryTree } from "@/features/shared/types";
import Image from "next/image";
import { useLocale } from "@/features/i18n/i18n.hooks";

interface CategoryListProps {
  tree: CategoryTree[];
  isLoading: boolean;
  onDelete: (id: string) => void;
}

export function CategoryList({ tree, isLoading, onDelete }: CategoryListProps) {
  const { t } = useLocale();

  if (isLoading) {
    return <div className="p-8 text-center text-text-muted">{t("categories.list.loading")}</div>;
  }

  if (!tree.length) {
    return <div className="p-8 text-center text-text-muted">{t("categories.list.empty")}</div>;
  }

  const renderNode = (node: CategoryTree, depth: number = 0) => {
    return (
      <div key={node.id} className="flex flex-col border-b border-border/10 last:border-0">
        <div
          className="flex items-center justify-between py-4 pe-6 transition-all hover:bg-surface-raised/30"
          style={{ paddingInlineStart: `${depth * 2 + 1.5}rem` }}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-surface">
              {node.image ? (
                <Image src={node.image} alt={node.name_en} width={48} height={48} className="object-cover" />
              ) : (
                <span className="text-xs text-text-muted">{t("categories.list.noImg")}</span>
              )}
            </div>
            <div>
              <div className="font-medium text-text-primary">
                {depth > 0 && <span className="me-2 text-text-muted">↳</span>}
                {node.name_ar} ({node.name_en})
              </div>
              <div className="text-sm text-text-muted">{t("categories.list.slug")}: {node.slug}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span
              className={`rounded-lg px-2 py-1 text-xs neu-pressed-sm ${
                node.is_active
                  ? "text-success"
                  : "text-text-muted"
              }`}
            >
              {node.is_active ? t("categories.list.active") : t("categories.list.hidden")}
            </span>
            <Link
              href={`/admin/categories/edit/${node.id}`}
              className="rounded-xl p-2 text-brand-500 transition-all neu-raised-sm hover:neu-raised"
              title={t("categories.list.edit")}
            >
              <Edit className="h-4 w-4" />
            </Link>
            <button
              onClick={() => {
                if (window.confirm(t("categories.list.deleteConfirm"))) {
                  onDelete(node.id);
                }
              }}
              className="rounded-xl p-2 text-danger transition-all neu-raised-sm hover:neu-raised"
              title={t("categories.list.delete")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        {node.subcategories && node.subcategories.length > 0 && (
          <div className="flex flex-col">
            {node.subcategories.map(sub => renderNode(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {tree.map(node => renderNode(node))}
    </div>
  );
}
