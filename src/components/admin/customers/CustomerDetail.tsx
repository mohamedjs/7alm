"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocale } from "@/features/i18n/i18n.hooks";
import { OrderStateMachine } from "@/lib/orderStateMachine";
import type {
  Address,
  City,
  Customer,
  CustomerStats,
  OrderWithDetails,
  Zone,
} from "@/features/shared/types";

/** Props for {@link CustomerDetail}. */
export interface CustomerDetailProps {
  customer: (Customer & { notes: string | null }) | null;
  stats: CustomerStats | null;
  orders: OrderWithDetails[];
  address: (Address & { zone: Zone & { city: City } }) | null;
  isLoading: boolean;
  onSaveNotes: (notes: string) => Promise<void>;
}

function formatCurrency(value: number, egpLabel: string): string {
  return `${value.toLocaleString()} ${egpLabel}`;
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Full customer profile: contact info, editable notes, aggregate stats,
 * and order history. Rendered on `/admin/customers/[id]` above the
 * WhatsApp chat panel.
 */
export function CustomerDetail({
  customer,
  stats,
  orders,
  address,
  isLoading,
  onSaveNotes,
}: CustomerDetailProps) {
  const { t, locale } = useLocale();
  const [notesDraft, setNotesDraft] = useState(customer?.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNotesDraft(customer?.notes ?? "");
  }, [customer?.notes]);

  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      await onSaveNotes(notesDraft);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !customer) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-surface-raised" />
        <div className="h-40 w-full animate-pulse rounded-2xl bg-surface-raised" />
        <div className="h-40 w-full animate-pulse rounded-2xl bg-surface-raised" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
        {t("crm.back")}
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contact Info */}
        <div className="space-y-4 rounded-2xl bg-surface p-6 neu-raised">
          <h2 className="text-lg font-bold text-text-primary">{t("crm.contactInfo")}</h2>
          <h3 className="text-xl font-semibold text-text-primary">{customer.full_name}</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <dt className="w-20 shrink-0 text-text-muted">{t("crm.phone")}</dt>
              <dd className="text-text-primary">{customer.phone}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="w-20 shrink-0 text-text-muted">{t("crm.email")}</dt>
              <dd className="text-text-primary">{customer.email || "—"}</dd>
            </div>
            <div className="flex items-start gap-2">
              <dt className="w-20 shrink-0 text-text-muted">{t("crm.address")}</dt>
              <dd className="text-text-primary">
                {address
                  ? `${address.street_details}, ${address.zone.arabic_name || address.zone.english_name}, ${address.zone.city.name}`
                  : "—"}
              </dd>
            </div>
          </dl>

          <div className="space-y-2 pt-2">
            <label htmlFor="customer-notes" className="block text-sm font-medium text-text-primary">
              {t("crm.notes")}
            </label>
            <textarea
              id="customer-notes"
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl bg-surface px-3 py-2 text-sm text-text-primary neu-input"
            />
            <button
              type="button"
              onClick={handleSaveNotes}
              disabled={isSaving}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-all neu-btn disabled:opacity-50"
            >
              {t("crm.saveNotes")}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4 rounded-2xl bg-surface p-6 neu-raised">
          <h2 className="text-lg font-bold text-text-primary">{t("crm.stats")}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-surface-raised p-4 neu-raised-sm">
              <p className="text-xs text-text-muted">{t("crm.totalOrders")}</p>
              <p className="mt-1 text-xl font-bold text-text-primary">
                {stats?.total_orders ?? 0}
              </p>
            </div>
            <div className="rounded-xl bg-surface-raised p-4 neu-raised-sm">
              <p className="text-xs text-text-muted">{t("crm.totalSpent")}</p>
              <p className="mt-1 text-xl font-bold text-text-primary">
                {formatCurrency(stats?.total_spent ?? 0, t("crm.egp"))}
              </p>
            </div>
            <div className="rounded-xl bg-surface-raised p-4 neu-raised-sm">
              <p className="text-xs text-text-muted">{t("crm.avgOrderValue")}</p>
              <p className="mt-1 text-xl font-bold text-text-primary">
                {formatCurrency(stats?.avg_order_value ?? 0, t("crm.egp"))}
              </p>
            </div>
            <div className="rounded-xl bg-surface-raised p-4 neu-raised-sm">
              <p className="text-xs text-text-muted">{t("crm.firstOrder")}</p>
              <p className="mt-1 text-sm font-semibold text-text-primary">
                {formatDate(stats?.first_order_date ?? null, locale)}
              </p>
            </div>
            <div className="col-span-2 rounded-xl bg-surface-raised p-4 neu-raised-sm">
              <p className="text-xs text-text-muted">{t("crm.lastOrder")}</p>
              <p className="mt-1 text-sm font-semibold text-text-primary">
                {formatDate(stats?.last_order_date ?? null, locale)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Order History */}
      <div className="overflow-hidden rounded-2xl bg-surface neu-raised">
        <h2 className="px-6 pt-6 text-lg font-bold text-text-primary">{t("crm.orderHistory")}</h2>
        {sortedOrders.length === 0 ? (
          <div className="p-12 text-center text-text-muted">{t("crm.noOrders")}</div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/20 text-sm text-text-muted">
                  <th className="px-6 py-3 text-start font-medium">{t("crm.orderNumber")}</th>
                  <th className="px-6 py-3 text-start font-medium">{t("crm.date")}</th>
                  <th className="px-6 py-3 text-start font-medium">{t("crm.product")}</th>
                  <th className="px-6 py-3 text-start font-medium">{t("crm.qty")}</th>
                  <th className="px-6 py-3 text-start font-medium">{t("crm.amount")}</th>
                  <th className="px-6 py-3 text-start font-medium">{t("crm.status")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border/10">
                    <td className="px-6 py-3 font-mono text-sm text-text-primary">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-3 text-sm text-text-muted">
                      {formatDate(order.created_at, locale)}
                    </td>
                    <td className="px-6 py-3 text-sm text-text-primary">
                      {order.product?.name || "—"}
                    </td>
                    <td className="px-6 py-3 text-sm text-text-primary">{order.quantity}</td>
                    <td className="px-6 py-3 text-sm font-medium text-text-primary">
                      {formatCurrency(order.total_price, t("crm.egp"))}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                          OrderStateMachine[order.status]?.colorClass ||
                          OrderStateMachine.pending.colorClass
                        }`}
                      >
                        {t(`orders.status.${order.status}` as const) || order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="h-6" />
      </div>
    </div>
  );
}
