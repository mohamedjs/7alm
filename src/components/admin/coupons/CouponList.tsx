"use client";

import { Edit, Trash2 } from "lucide-react";
import type { Coupon } from "@/features/shared/types";
import { useLocale } from "@/features/i18n/i18n.hooks";

interface CouponListProps {
  coupons: Coupon[];
  isLoading: boolean;
  onEdit: (coupon: Coupon) => void;
  onDelete: (id: string) => void;
}

export function CouponList({ coupons, isLoading, onEdit, onDelete }: CouponListProps) {
  const { t } = useLocale();

  if (isLoading) {
    return <div className="p-8 text-center text-text-muted">{t("coupons.list.loading")}</div>;
  }

  if (coupons.length === 0) {
    return <div className="p-8 text-center text-text-muted">{t("coupons.list.empty")}</div>;
  }

  const typeLabel = (type: Coupon["type"]) => {
    if (type === "percentage") return t("coupons.type.percentage");
    if (type === "fixed") return t("coupons.type.fixed");
    return t("coupons.type.freeShipping");
  };

  const valueLabel = (coupon: Coupon) => {
    if (coupon.type === "percentage") return `${coupon.value}%`;
    if (coupon.type === "fixed") return `${coupon.value} ${t("store.product.currency")}`;
    return "—";
  };

  return (
    <div className="overflow-x-auto rounded-2xl bg-surface">
      <table className="w-full text-start text-sm text-text-muted">
        <thead className="bg-surface text-text-primary">
          <tr>
            <th className="px-6 py-4 font-medium">{t("coupons.list.code")}</th>
            <th className="px-6 py-4 font-medium">{t("coupons.list.type")}</th>
            <th className="px-6 py-4 font-medium">{t("coupons.list.value")}</th>
            <th className="px-6 py-4 font-medium">{t("coupons.list.usage")}</th>
            <th className="px-6 py-4 font-medium">{t("coupons.list.status")}</th>
            <th className="px-6 py-4 font-medium">{t("coupons.list.actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {coupons.map((coupon) => (
            <tr key={coupon.id} className="transition-all hover:bg-surface-raised/50">
              <td className="px-6 py-4">
                <span className="font-mono font-bold text-text-primary" dir="ltr">
                  {coupon.code}
                </span>
              </td>
              <td className="px-6 py-4">{typeLabel(coupon.type)}</td>
              <td className="px-6 py-4 font-medium text-text-primary">{valueLabel(coupon)}</td>
              <td className="px-6 py-4">
                {coupon.used_count}
                {coupon.usage_limit != null ? ` / ${coupon.usage_limit}` : ""}
              </td>
              <td className="px-6 py-4">
                <span
                  className={`rounded-lg px-2 py-1 text-xs font-medium neu-pressed-sm ${
                    coupon.is_active ? "text-success" : "text-text-muted"
                  }`}
                >
                  {coupon.is_active ? t("coupons.list.active") : t("coupons.list.inactive")}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(coupon)}
                    className="rounded-xl p-2 text-brand-500 transition-all neu-raised-sm hover:neu-raised"
                    title={t("coupons.list.edit")}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(t("coupons.list.deleteConfirm"))) onDelete(coupon.id);
                    }}
                    className="rounded-xl p-2 text-danger transition-all neu-raised-sm hover:neu-raised"
                    title={t("coupons.list.delete")}
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
