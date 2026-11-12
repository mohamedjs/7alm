export type OrderStatus = "pending" | "approved" | "confirmed" | "shipped" | "delivered" | "cancelled" | "returned";

export const ORDER_STATUSES: OrderStatus[] = ["pending", "approved", "confirmed", "shipped", "delivered", "cancelled", "returned"];

/**
 * The single source of truth for legal status jumps (State Machine pattern).
 * `confirmed → cancelled` is not allowed: a confirmed order already has a
 * live shipment and reserved stock.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["approved", "cancelled"],
  approved: ["confirmed", "cancelled"],
  confirmed: ["shipped"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

export const isOrderStatus = (v: unknown): v is OrderStatus => typeof v === "string" && (ORDER_STATUSES as string[]).includes(v);

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}
