"use client";

import OrdersTable from "@/components/admin/orders/OrdersTable";
import { useAuth } from "@/features/auth/auth.hooks";
import { useOrders } from "@/features/orders/orders.hooks";
import { useRealtime } from "@/features/realtime/realtime.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { OrderStatus } from "@/features/orders/orders.api";

export default function OrdersPage() {
  const { token } = useAuth();
  const { t } = useLocale();
  const {
    orders,
    isLoading,
    filter,
    setFilter,
    refetch,
    approvingId,
    changeStatus,
  } = useOrders("pending");

  // Realtime: auto-refresh on any change to the orders table
  const { isConnected, notification } = useRealtime("orders", {
    event: "*",
    showNotification: true,
    onEvent: () => refetch(),
  });

  if (!token) return null;

  const handleChangeStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      await changeStatus(orderId, nextStatus);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("orders.updateFailed");
      alert(message);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:mb-8 sm:flex-row sm:items-center">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-text-primary">{t("orders.title")}</h2>
          <p className="text-text-muted">{t("orders.subtitle")}</p>
        </div>
        {/* Realtime status indicator */}
        <div className="flex items-center gap-2 text-sm">
          <span className={`relative flex h-2.5 w-2.5 ${isConnected ? "" : "opacity-40"}`}>
            {isConnected && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            )}
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                isConnected ? "bg-success" : "bg-text-muted"
              }`}
            />
          </span>
          <span className={isConnected ? "text-success" : "text-text-muted"}>
            {isConnected ? t("orders.live") : t("orders.offline")}
          </span>
        </div>
      </div>

      {/* Realtime notification banner */}
      {notification && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
          <span className="text-lg">🔔</span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter("pending")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            filter === "pending"
              ? "border border-brand-500/20 bg-brand-500/10 text-brand-600 dark:text-brand-400"
              : "border border-border bg-surface-raised text-text-muted hover:bg-surface hover:text-text-primary"
          }`}
        >
          {t("orders.filter.pending")}
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            filter === "all"
              ? "border border-brand-500/20 bg-brand-500/10 text-brand-600 dark:text-brand-400"
              : "border border-border bg-surface-raised text-text-muted hover:bg-surface hover:text-text-primary"
          }`}
        >
          {t("orders.filter.all")}
        </button>

        <button
          onClick={refetch}
          className="ms-auto flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm text-text-muted shadow-sm transition-all hover:bg-surface hover:text-text-primary"
        >
          <svg
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {t("orders.refresh")}
        </button>
      </div>

      {/* Orders Table */}
      <OrdersTable
        orders={orders}
        loading={isLoading}
        approvingId={approvingId}
        onChangeStatus={handleChangeStatus}
      />
    </div>
  );
}
