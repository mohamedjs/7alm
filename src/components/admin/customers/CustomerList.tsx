"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { CustomerWithStats } from "@/features/shared/types";

/**
 * Props for {@link CustomerList}. Mirrors the shape returned by
 * `useCustomersManager()` — the page maps `setSearchQuery`/`setPage` to
 * `onSearchChange`/`onPageChange` when wiring the hook to this component.
 */
export interface CustomerListProps {
  customers: CustomerWithStats[];
  totalCount: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onPageChange: (page: number) => void;
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
 * Paginated, searchable customer table for `/admin/customers`.
 * Rows navigate to the customer detail page on click.
 */
export function CustomerList({
  customers,
  totalCount,
  page,
  pageSize,
  isLoading,
  searchQuery,
  onSearchChange,
  onPageChange,
}: CustomerListProps) {
  const router = useRouter();
  const { t, locale } = useLocale();

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("crm.searchPlaceholder")}
          className="w-full rounded-xl bg-surface px-4 py-2.5 ps-10 text-text-primary neu-input placeholder:text-text-muted"
        />
      </div>

      <div className="overflow-hidden rounded-2xl bg-surface neu-raised">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-14 w-full animate-pulse rounded-xl bg-surface-raised"
              />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-text-muted">
            <Users className="h-12 w-12" />
            <p className="text-lg font-medium">{t("crm.noCustomers")}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/20 text-sm text-text-muted">
                    <th className="px-6 py-4 text-start font-medium">{t("crm.col.name")}</th>
                    <th className="px-6 py-4 text-start font-medium">{t("crm.col.phone")}</th>
                    <th className="px-6 py-4 text-start font-medium">{t("crm.col.email")}</th>
                    <th className="px-6 py-4 text-start font-medium">{t("crm.col.orders")}</th>
                    <th className="px-6 py-4 text-start font-medium">{t("crm.col.spent")}</th>
                    <th className="px-6 py-4 text-start font-medium">{t("crm.col.lastOrder")}</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      onClick={() => router.push(`/admin/customers/${customer.id}`)}
                      className="cursor-pointer border-b border-border/10 transition-all hover:bg-surface-raised/50"
                    >
                      <td className="px-6 py-4 font-medium text-text-primary">
                        {customer.full_name}
                      </td>
                      <td className="px-6 py-4 text-text-muted">{customer.phone}</td>
                      <td className="px-6 py-4 text-text-muted">{customer.email || "—"}</td>
                      <td className="px-6 py-4 text-text-primary">{customer.total_orders}</td>
                      <td className="px-6 py-4 font-medium text-text-primary">
                        {formatCurrency(customer.total_spent, t("crm.egp"))}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-muted">
                        {formatDate(customer.last_order_date, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-border/20 lg:hidden">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => router.push(`/admin/customers/${customer.id}`)}
                  className="cursor-pointer p-4 transition-all hover:bg-surface-raised/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-text-primary">{customer.full_name}</p>
                      <p className="text-sm text-text-muted">{customer.phone}</p>
                    </div>
                    <div className="text-end">
                      <p className="font-medium text-text-primary">
                        {formatCurrency(customer.total_spent, t("crm.egp"))}
                      </p>
                      <p className="text-xs text-text-muted">
                        {customer.total_orders} {t("crm.col.orders")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && customers.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1.5 rounded-xl bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-all neu-btn disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
            {t("crm.previous")}
          </button>
          <span className="text-sm text-text-muted">
            {t("crm.page")} {page} {t("crm.of")} {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1.5 rounded-xl bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-all neu-btn disabled:opacity-40"
          >
            {t("crm.next")}
            <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
          </button>
        </div>
      )}
    </div>
  );
}
