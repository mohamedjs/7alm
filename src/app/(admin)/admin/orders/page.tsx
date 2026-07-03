"use client";

import OrdersTable from "@/components/admin/orders/OrdersTable";
import { useAuth } from "@/features/auth/auth.hooks";
import { useOrders } from "@/features/orders/orders.hooks";
import type { OrderStatus } from "@/features/orders/orders.api";

export default function OrdersPage() {
  const { token } = useAuth();
  const {
    orders,
    isLoading,
    filter,
    setFilter,
    refetch,
    approvingId,
    changeStatus,
  } = useOrders("pending");

  if (!token) return null;

  const handleChangeStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      await changeStatus(orderId, nextStatus);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to update order status. Please try again.";
      alert(message);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Orders Management</h2>
          <p className="text-gray-600">View and manage customer orders.</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          onClick={() => setFilter("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === "pending"
              ? "bg-amber-50 text-amber-600 border border-amber-200"
              : "bg-white text-gray-600 border border-gray-200 hover:text-gray-900 hover:bg-gray-50"
            }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === "all"
              ? "bg-amber-50 text-amber-600 border border-amber-200"
              : "bg-white text-gray-600 border border-gray-200 hover:text-gray-900 hover:bg-gray-50"
            }`}
        >
          All Orders
        </button>

        <button
          onClick={refetch}
          className="ml-auto bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 shadow-sm"
        >
          <svg
            className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
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
          Refresh
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
