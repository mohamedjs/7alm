"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { OrderStateMachine } from "@/lib/orderStateMachine";
import { useLocale } from "@/features/i18n/i18n.hooks";
import { orderActionDictKey } from "@/features/orders/orders.hooks";
import type { OrderStatus, OrderWithDetails } from "@/features/orders/orders.api";
import OrderDetailsDrawer from "./OrderDetailsDrawer";

interface OrdersTableProps {
  orders: OrderWithDetails[];
  loading: boolean;
  approvingId: string | null;
  onChangeStatus: (orderId: string, nextStatus: OrderStatus) => void;
}

const platformIcons: Record<string, string> = {
  facebook: "📘",
  instagram: "📸",
  tiktok: "🎵",
  google: "🔍",
  website: "🌐",
};

export default function OrdersTable({
  orders,
  loading,
  approvingId,
  onChangeStatus,
}: OrdersTableProps) {
  const { t } = useLocale();
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);

  if (loading) {
    return (
      <div className="rounded-2xl bg-surface p-12 neu-raised transition-all">
        <div className="flex flex-col items-center justify-center text-text-muted">
          <svg
            className="mb-4 h-8 w-8 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p>{t("orders.loading")}</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl bg-surface p-12 neu-raised transition-all">
        <div className="flex flex-col items-center justify-center text-text-muted">
          <svg
            className="mb-4 h-16 w-16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="text-lg font-medium">{t("orders.empty.title")}</p>
          <p className="mt-1 text-sm">{t("orders.empty.subtitle")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-surface neu-raised transition-all">
      {/* Desktop Table */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/20 text-sm text-text-muted">
              <th className="px-6 py-4 text-start font-medium">{t("orders.table.customer")}</th>
              <th className="px-6 py-4 text-start font-medium">{t("orders.table.zone")}</th>
              <th className="px-6 py-4 text-start font-medium">{t("orders.table.ipInfo")}</th>
              <th className="px-6 py-4 text-start font-medium">{t("orders.table.source")}</th>
              <th className="px-6 py-4 text-start font-medium">{t("orders.table.price")}</th>
              <th className="px-6 py-4 text-start font-medium">{t("orders.table.status")}</th>
              <th className="px-6 py-4 text-start font-medium">{t("orders.table.date")}</th>
              <th className="px-6 py-4 text-end font-medium">{t("orders.table.action")}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="cursor-pointer border-b border-border/10 transition-all hover:bg-surface-raised/50"
                onClick={() => setSelectedOrder(order)}
              >
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-text-primary">
                      {order.customer.full_name}
                    </p>
                    <p className="text-sm text-text-muted">
                      {order.customer.phone}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-text-primary">
                    {order.address?.zone?.english_name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {order.address?.zone?.city?.name}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-mono text-sm text-text-muted">
                    {order.ip_address || "—"}
                  </p>
                  <p className="text-xs text-text-muted">
                    {[order.ip_city, order.ip_country]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-text-muted">
                    {platformIcons[order.platform_source || ""] || "—"}{" "}
                    {order.platform_source || t("orders.direct")}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-text-primary">
                    {order.total_price} EGP
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                      OrderStateMachine[order.status]?.colorClass || OrderStateMachine.pending.colorClass
                    }`}
                  >
                    {t(`orders.status.${order.status}` as const) || order.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-text-muted">
                  {new Date(order.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-6 py-4 text-end" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="rounded px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {t("orders.table.view")}
                    </button>
                    {OrderStateMachine[order.status]?.availableActions.map((action) => (
                      <button
                        key={action.action}
                        onClick={() => onChangeStatus(order.id, action.nextStatus)}
                        disabled={approvingId === order.id}
                        className={`${action.style} flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-50`}
                      >
                        {approvingId === order.id ? (
                          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : null}
                        {t(orderActionDictKey(action.action))}
                      </button>
                    ))}
                    {order.shipping_tracking_id && (
                      <span className="ms-2 mt-2 font-mono text-xs text-text-muted">
                        {order.shipping_tracking_id}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="divide-y divide-border/20 lg:hidden">
        {orders.map((order) => (
          <div
            key={order.id}
            className="cursor-pointer p-4 transition-all hover:bg-surface-raised/50"
            onClick={() => setSelectedOrder(order)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text-primary">
                  {order.customer.full_name}
                </p>
                <p className="text-sm text-text-muted">
                  {order.customer.phone}
                </p>
              </div>
              <div className="text-end">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                    OrderStateMachine[order.status]?.colorClass || OrderStateMachine.pending.colorClass
                  }`}
                >
                  {t(`orders.status.${order.status}` as const) || order.status}
                </span>
                <p className="mt-1 text-xs text-text-muted">
                  {order.total_price} EGP
                </p>
              </div>
            </div>
            {/* Quick address preview */}
            <div className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span className="truncate">
                {order.address?.street_details}, {order.address?.zone?.arabic_name || order.address?.zone?.english_name}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
              {t("orders.table.tapToView")}
              <ArrowRight className="h-3 w-3 rtl:-scale-x-100" />
            </div>
          </div>
        ))}
      </div>

      {/* Details Drawer */}
      <OrderDetailsDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onChangeStatus={onChangeStatus}
        approvingId={approvingId}
      />
    </div>
  );
}
