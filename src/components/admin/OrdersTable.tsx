"use client";

import { useState } from "react";
import { OrderStateMachine } from "@/lib/orderStateMachine";
import type { OrderStatus, OrderWithDetails } from "@/features/orders/orders.api";

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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12">
        <div className="flex flex-col items-center justify-center text-gray-500">
          <svg
            className="animate-spin w-8 h-8 mb-4"
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
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12">
        <div className="flex flex-col items-center justify-center text-gray-500">
          <svg
            className="w-16 h-16 mb-4"
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
          <p className="text-lg font-medium">No orders found</p>
          <p className="text-sm mt-1">
            Orders will appear here when customers submit them
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-sm">
              <th className="text-left px-6 py-4 font-medium">Customer</th>
              <th className="text-left px-6 py-4 font-medium">Zone</th>
              <th className="text-left px-6 py-4 font-medium">IP Info</th>
              <th className="text-left px-6 py-4 font-medium">Source</th>
              <th className="text-left px-6 py-4 font-medium">Price</th>
              <th className="text-left px-6 py-4 font-medium">Status</th>
              <th className="text-left px-6 py-4 font-medium">Date</th>
              <th className="text-right px-6 py-4 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
              >
                <td className="px-6 py-4">
                  <div>
                    <p className="text-white font-medium">
                      {order.customer.full_name}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {order.customer.phone}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-gray-300">
                    {order.address?.zone?.english_name}
                  </p>
                  <p className="text-gray-600 text-xs">
                    {order.address?.zone?.city?.name}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-gray-400 text-sm font-mono">
                    {order.ip_address || "—"}
                  </p>
                  <p className="text-gray-600 text-xs">
                    {[order.ip_city, order.ip_country]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-gray-400 text-sm">
                    {platformIcons[order.platform_source || ""] || "—"}{" "}
                    {order.platform_source || "direct"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-white font-medium">
                    {order.total_price} EGP
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${
                      OrderStateMachine[order.status]?.colorClass || OrderStateMachine.pending.colorClass
                    }`}
                  >
                    {OrderStateMachine[order.status]?.label || order.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500 text-sm">
                  {new Date(order.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex gap-2 justify-end">
                    {OrderStateMachine[order.status]?.availableActions.map((action) => (
                      <button
                        key={action.action}
                        onClick={() => onChangeStatus(order.id, action.nextStatus)}
                        disabled={approvingId === order.id}
                        className={`${action.style} px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-1`}
                      >
                        {approvingId === order.id ? (
                          <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : null}
                        {action.label}
                      </button>
                    ))}
                    {order.shipping_tracking_id && (
                      <span className="text-gray-500 text-xs font-mono ml-2 mt-2">
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
      <div className="lg:hidden divide-y divide-gray-800">
        {orders.map((order) => (
          <div key={order.id} className="p-4">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() =>
                setExpandedId(expandedId === order.id ? null : order.id)
              }
            >
              <div>
                <p className="text-white font-medium">
                  {order.customer.full_name}
                </p>
                <p className="text-gray-500 text-sm">
                  {order.customer.phone}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${
                    OrderStateMachine[order.status]?.colorClass || OrderStateMachine.pending.colorClass
                  }`}
                >
                  {OrderStateMachine[order.status]?.label || order.status}
                </span>
                <p className="text-gray-500 text-xs mt-1">
                  {order.total_price} EGP
                </p>
              </div>
            </div>

            {expandedId === order.id && (
              <div className="mt-4 pt-4 border-t border-gray-800 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Zone</span>
                  <span className="text-gray-300">
                    {order.address?.zone?.english_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Address</span>
                  <span className="text-gray-300 text-right max-w-[200px]">
                    {order.address?.street_details}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">IP</span>
                  <span className="text-gray-400 font-mono text-xs">
                    {order.ip_address || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Source</span>
                  <span className="text-gray-300">
                    {order.platform_source || "direct"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="text-gray-400">
                    {new Date(order.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-2 mt-3 flex-col">
                  {OrderStateMachine[order.status]?.availableActions.map((action) => (
                    <button
                      key={action.action}
                      onClick={() => onChangeStatus(order.id, action.nextStatus)}
                      disabled={approvingId === order.id}
                      className={`w-full ${action.style} py-2 rounded-lg text-sm font-medium`}
                    >
                      {approvingId === order.id ? "Processing..." : action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
