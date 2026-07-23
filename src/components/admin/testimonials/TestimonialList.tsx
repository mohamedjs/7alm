"use client";

import { Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Testimonial } from "@/features/shared/types";
import { useLocale } from "@/features/i18n/i18n.hooks";

interface TestimonialListProps {
  testimonials: Testimonial[];
  isLoading: boolean;
  onDelete: (id: string) => void;
}

export function TestimonialList({ testimonials, isLoading, onDelete }: TestimonialListProps) {
  const { t } = useLocale();

  if (isLoading) {
    return <div className="p-8 text-center text-text-muted">{t("testimonials.list.loading")}</div>;
  }

  if (!testimonials.length) {
    return <div className="p-8 text-center text-text-muted">{t("testimonials.list.empty")}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-start text-sm">
        <thead>
          <tr className="border-b border-border/20 text-text-muted">
            <th className="px-6 py-4 text-start font-medium">{t("testimonials.list.name")}</th>
            <th className="px-6 py-4 text-start font-medium">{t("testimonials.list.role")}</th>
            <th className="px-6 py-4 text-start font-medium">{t("testimonials.list.rating")}</th>
            <th className="px-6 py-4 text-start font-medium">{t("testimonials.list.status")}</th>
            <th className="px-6 py-4 text-end font-medium">{t("testimonials.list.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {testimonials.map((item) => (
            <tr
              key={item.id}
              className="border-b border-border/10 last:border-0 transition-all hover:bg-surface-raised/30"
            >
              <td className="px-6 py-4">
                <div className="font-medium text-text-primary">{item.name_ar}</div>
                {item.name_en && <div className="text-xs text-text-muted">{item.name_en}</div>}
              </td>
              <td className="px-6 py-4 text-text-muted">
                <div>{item.role_ar || "-"}</div>
                {item.role_en && <div className="text-xs">{item.role_en}</div>}
              </td>
              <td className="px-6 py-4">
                <span className="text-warning" aria-label={`${item.rating} / 5`}>
                  {"★".repeat(item.rating)}
                  <span className="text-text-muted">{"★".repeat(Math.max(0, 5 - item.rating))}</span>
                </span>
              </td>
              <td className="px-6 py-4">
                <span
                  className={`rounded-lg px-2 py-1 text-xs neu-pressed-sm ${
                    item.is_active ? "text-success" : "text-text-muted"
                  }`}
                >
                  {item.is_active ? t("testimonials.list.active") : t("testimonials.list.hidden")}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-4">
                  <Link
                    href={`/admin/testimonials/edit/${item.id}`}
                    className="rounded-xl p-2 text-brand-500 transition-all neu-raised-sm hover:neu-raised"
                    title={t("testimonials.list.edit")}
                  >
                    <Edit className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => {
                      if (window.confirm(t("testimonials.list.deleteConfirm"))) {
                        onDelete(item.id);
                      }
                    }}
                    className="rounded-xl p-2 text-danger transition-all neu-raised-sm hover:neu-raised"
                    title={t("testimonials.list.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
