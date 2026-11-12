import type { Order } from "./order";
import type { PricedLine } from "./checkout";

export interface NewOrder {
  customer_id: string;
  address_id: string;
  lines: PricedLine[];
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  total_price: number;
  coupon_code: string | null;
  platform_source?: string;
  ip_address?: string;
  ip_country?: string;
  ip_city?: string;
}

export const ORDER_STORE = Symbol("ORDER_STORE");
export interface OrderStore {
  create(input: NewOrder, tx: unknown): Promise<string>;
  /** Loads the aggregate with a row lock when inside a transaction. */
  load(id: string, tx?: unknown): Promise<Order | null>;
  loadByTracking(trackingId: string, tx?: unknown): Promise<Order | null>;
  save(order: Order, tx?: unknown): Promise<void>;
  /** Atomically claim the right to notify `status` once (idempotent WhatsApp sends). */
  markNotifiedIfNew(id: string, status: string): Promise<boolean>;
}
