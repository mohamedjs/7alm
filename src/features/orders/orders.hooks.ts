"use client";

import { useCallback, useState } from "react";
import {
  useGetOrdersQuery,
  useUpdateOrderStatusMutation,
} from "./orders.api";
import type { OrdersFilter, OrderStatus } from "./orders.api";

/**
 * Admin orders listing — handles fetching, filtering, refresh and the
 * "approving" spinner state for status transitions.
 */
export function useOrders(initialFilter: OrdersFilter = "pending") {
  const [filter, setFilter] = useState<OrdersFilter>(initialFilter);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const {
    data: orders,
    isLoading,
    error,
    refetch,
  } = useGetOrdersQuery(filter);

  const [updateStatus, updateStatusState] = useUpdateOrderStatusMutation();

  const changeStatus = useCallback(
    async (orderId: string, nextStatus: OrderStatus | string) => {
      setApprovingId(orderId);
      try {
        await updateStatus({ orderId, status: nextStatus }).unwrap();
      } catch (err: unknown) {
        // Surface the error to the caller; components decide how to display it.
        throw err;
      } finally {
        setApprovingId(null);
      }
    },
    [updateStatus],
  );

  return {
    orders: orders ?? [],
    isLoading,
    error,
    filter,
    setFilter,
    refetch,
    approvingId,
    changeStatus,
    updateStatusState,
  };
}
