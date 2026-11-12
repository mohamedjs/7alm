import { AggregateRoot } from "../../../shared/domain/domain-event";
import { DomainError } from "../../../shared/domain/domain-error";
import { Topics } from "../../../shared/domain/topics";
import { canTransition, type OrderStatus } from "./order-status";

export const OrderEvents = {
  placed: "ordering.order.placed",
  statusChanged: "ordering.order.status_changed",
} as const;

export interface OrderState {
  id: string;
  status: OrderStatus;
  productLines: Array<{ productId: string | null; quantity: number }>;
  shippingProvider: string | null;
  trackingId: string | null;
  requiresConfirmation: boolean;
  stockReserved: boolean;
}

/**
 * Order aggregate. Every status change goes through `moveTo`, which enforces
 * the state machine and records `ordering.order.status_changed`.
 */
export class Order extends AggregateRoot {
  private constructor(private readonly state: OrderState) {
    super();
  }

  static restore(state: OrderState): Order {
    return new Order({ ...state });
  }

  static placed(orderId: string): { type: string; topic: string; key: string; payload: Record<string, unknown> } {
    return { topic: Topics.orderingEvents, key: orderId, type: OrderEvents.placed, payload: { orderId } };
  }

  get id() {
    return this.state.id;
  }
  get status() {
    return this.state.status;
  }
  get shippingProvider() {
    return this.state.shippingProvider;
  }
  get trackingId() {
    return this.state.trackingId;
  }
  get requiresConfirmation() {
    return this.state.requiresConfirmation;
  }
  get lines() {
    return this.state.productLines;
  }

  private moveTo(to: OrderStatus, extra: Record<string, unknown> = {}) {
    const from = this.state.status;
    if (!canTransition(from, to)) {
      throw DomainError.validation(`Cannot change status from "${from}" to "${to}"`);
    }
    this.state.status = to;
    this.record({ topic: Topics.orderingEvents, key: this.state.id, type: OrderEvents.statusChanged, payload: { orderId: this.state.id, from, to, ...extra } });
  }

  /** Admin approval: pick the courier and whether the customer must confirm on WhatsApp. */
  approve(provider: string, requiresConfirmation: boolean) {
    if (this.state.status !== "pending") throw DomainError.validation(`Order is already ${this.state.status}`);
    this.state.shippingProvider = provider;
    this.state.requiresConfirmation = requiresConfirmation;
    this.state.stockReserved = true;
    // With "ship now" the approved notification is skipped (no reply to wait for).
    this.moveTo("approved", { silent: !requiresConfirmation });
  }

  confirm(trackingId: string | null) {
    if (this.state.status !== "approved") {
      throw DomainError.validation(`Order cannot be confirmed — current status is "${this.state.status}"`);
    }
    if (trackingId) this.state.trackingId = trackingId;
    this.moveTo("confirmed", { trackingId });
  }

  /** Returns the lines whose stock must be put back. */
  cancel(): Array<{ productId: string | null; quantity: number }> {
    if (!["pending", "approved"].includes(this.state.status)) {
      throw DomainError.validation(`Cannot cancel order — current status is "${this.state.status}"`);
    }
    const restock = this.state.status === "approved" && this.state.stockReserved ? this.state.productLines : [];
    this.state.stockReserved = false;
    this.moveTo("cancelled");
    return restock;
  }

  /** Generic transition for shipped / delivered / returned (admin or courier). */
  advance(to: OrderStatus) {
    if (to === "approved" || to === "confirmed" || to === "cancelled") {
      throw DomainError.validation(`Use the dedicated action for "${to}"`);
    }
    this.moveTo(to);
  }

  /** Courier webhooks may repeat or arrive out of order: a disallowed jump is a no-op. */
  advanceIfAllowed(to: OrderStatus): boolean {
    if (!canTransition(this.state.status, to)) return false;
    this.moveTo(to, { source: "courier" });
    return true;
  }

  snapshot(): Readonly<OrderState> {
    return { ...this.state };
  }
}
