"use client";

import { useCallback, useState } from "react";
import {
  useGetOrdersQuery,
  useUpdateOrderStatusMutation,
} from "./orders.api";
import type { OrdersFilter, OrderStatus } from "./orders.api";
import type { DictKey } from "@/features/i18n/dictionary";
import { OrderStateMachine } from "@/lib/orderStateMachine";

/**
 * Extra options for `changeStatus` / `onChangeStatus` callers. Only
 * `requireConfirmation` exists today -- it is meaningful solely for the
 * `pending -> approved` transition (the two approve modes); every other
 * transition ignores it.
 */
export interface ChangeStatusOptions {
  requireConfirmation?: boolean;
}

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
    async (
      orderId: string,
      nextStatus: OrderStatus | string,
      options?: ChangeStatusOptions,
    ) => {
      setApprovingId(orderId);
      try {
        await updateStatus({
          orderId,
          status: nextStatus,
          ...(options?.requireConfirmation !== undefined
            ? { require_confirmation: options.requireConfirmation }
            : {}),
        }).unwrap();
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
  confirm: "orders.action.confirm",
};

/** Dictionary key for an order state-machine action id; falls back to "approve"'s key if unrecognized (defensive -- every action in orderStateMachine.ts today is mapped above). */
export function orderActionDictKey(action: string): DictKey {
  return ORDER_ACTION_DICT_KEYS[action] ?? "orders.action.approve";
}

/**
 * A single action button to render for an order's current status: label
 * dictionary key, optional hint/tooltip key, neumorphic style classes, the
 * status transition, and (for the two "approve" modes) whether the customer
 * must confirm on WhatsApp before the order ships.
 */
export interface OrderDisplayAction {
  key: string;
  labelKey: DictKey;
  hintKey?: DictKey;
  style: string;
  nextStatus: OrderStatus;
  requireConfirmation?: boolean;
}

/**
 * Per-status action buttons for the admin orders UI (OrdersTable row +
 * OrderDetailsDrawer). `pending` is special-cased into two distinct approve
 * actions -- "ask customer to confirm" vs. "ship now" -- per the
 * order-cycle-redesign spec (§7); every other status maps 1:1 from
 * `OrderStateMachine[status].availableActions` (including the `approved`
 * state's new `confirm` action for manual admin confirm).
 */
export function getOrderDisplayActions(status: OrderStatus): OrderDisplayAction[] {
  if (status === "pending") {
    return [
      {
        key: "approve-ask",
        labelKey: "orders.action.approveAsk",
        hintKey: "orders.action.approveAsk.hint",
        style: "bg-green-500/10 text-green-400 hover:bg-green-500/20 neu-raised-sm",
        nextStatus: "approved",
        requireConfirmation: true,
      },
      {
        key: "approve-ship-now",
        labelKey: "orders.action.approveShipNow",
        hintKey: "orders.action.approveShipNow.hint",
        style:
          "bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 neu-raised-sm border border-emerald-500/30",
        nextStatus: "approved",
        requireConfirmation: false,
      },
      {
        key: "cancel",
        labelKey: "orders.action.cancel",
        style: "bg-red-500/10 text-red-400 hover:bg-red-500/20 neu-raised-sm",
        nextStatus: "cancelled",
      },
    ];
  }

  return (OrderStateMachine[status]?.availableActions ?? []).map((action) => ({
    key: action.action,
    labelKey: orderActionDictKey(action.action),
    style: action.style,
    nextStatus: action.nextStatus,
  }));
}
