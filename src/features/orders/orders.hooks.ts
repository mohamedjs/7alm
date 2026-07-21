"use client";

import { useCallback, useState } from "react";
import {
  useGetOrdersQuery,
  useUpdateOrderStatusMutation,
} from "./orders.api";
import type { OrdersFilter, OrderStatus } from "./orders.api";
import type { DictKey } from "@/features/i18n/dictionary";

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

/**
 * `OrderState.availableActions[].action` (src/lib/orderStateMachine.ts) is
 * typed as a plain `string`, not a literal union, so it can't be spliced
 * directly into a `DictKey` template. This maps the state machine's action
 * ids to their dictionary keys for display -- the state machine itself
 * (transitions, available actions) stays untouched; only which string is
 * shown for a given action id moves to the i18n dictionary.
 */
const ORDER_ACTION_DICT_KEYS: Record<string, DictKey> = {
  approve: "orders.action.approve",
  cancel: "orders.action.cancel",
  ship: "orders.action.ship",
  deliver: "orders.action.deliver",
  return: "orders.action.return",
};

/** Dictionary key for an order state-machine action id; falls back to "approve"'s key if unrecognized (defensive -- every action in orderStateMachine.ts today is mapped above). */
export function orderActionDictKey(action: string): DictKey {
  return ORDER_ACTION_DICT_KEYS[action] ?? "orders.action.approve";
}
