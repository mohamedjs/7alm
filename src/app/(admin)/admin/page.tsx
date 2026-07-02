"use client";

import { useMemo } from "react";
import { useAuth } from "@/features/auth/auth.hooks";
import { useGetOrdersQuery } from "@/features/orders/orders.api";

export default function AdminOverviewPage() {
  const { token } = useAuth();
  const { data: orders } = useGetOrdersQuery("all");

  const stats = useMemo(() => {
    const list = orders ?? [];
    return {
      pending: list.filter((o) => o.status === "pending").length,
      total: list.length,
      revenue: list.reduce((sum, o) => sum + (o.total_price || 0), 0),
      approved: list.filter((o) => o.status === "approved").length,
    };
  }, [orders]);

  if (!token) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm font-medium mb-1">Pending Orders</p>
          <p className="text-3xl font-bold text-amber-500">{stats.pending}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm font-medium mb-1">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm font-medium mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-green-600">{stats.revenue.toFixed(0)} EGP</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-sm font-medium mb-1">Approved Orders</p>
          <p className="text-3xl font-bold text-blue-600">{stats.approved}</p>
        </div>
      </div>
    </div>
  );
}
