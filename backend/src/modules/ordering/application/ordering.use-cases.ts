import { Inject, Injectable, Logger } from "@nestjs/common";
import { DomainError } from "../../../shared/domain/domain-error";
import { toLocalEgyptPhone } from "../../../shared/domain/phone";
import { UNIT_OF_WORK, type UnitOfWork } from "../../../shared/application/unit-of-work.port";
import { CatalogFacade } from "../../catalog";
import { CustomersFacade } from "../../customers";
import { GeoQueries } from "../../geo";
import { PromotionsFacade } from "../../promotions";
import { ShippingFacade } from "../../shipping";
import { Order } from "../domain/order";
import { orderTotals, priceLines, type RequestedLine } from "../domain/checkout";
import { isOrderStatus, type OrderStatus } from "../domain/order-status";
import { ORDER_STORE, type OrderStore } from "../domain/ports";
import { ORDER_READS, type OrderReads } from "../domain/order-details";

export interface PlaceOrderInput {
  full_name: string;
  phone: string;
  email?: string;
  zone_id: string;
  street_details: string;
  product_id?: string;
  quantity?: number;
  items?: RequestedLine[];
  coupon_code?: string;
  platform_source?: string;
  ip_address?: string;
  ip_country?: string;
  ip_city?: string;
}

/**
 * Checkout: one transaction creates customer, address, order, line items and
 * the coupon redemption, and writes `ordering.order.placed` to the outbox.
 * Customer WhatsApp + admin email are sent by the worker from that event.
 */
@Injectable()
export class PlaceOrderUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(ORDER_STORE) private readonly orders: OrderStore,
    private readonly customers: CustomersFacade,
    private readonly catalog: CatalogFacade,
    private readonly geo: GeoQueries,
    private readonly promotions: PromotionsFacade,
  ) {}

  async execute(input: PlaceOrderInput): Promise<string> {
    const requested: RequestedLine[] =
      input.items && input.items.length > 0
        ? input.items
        : input.product_id
          ? [{ product_id: input.product_id, quantity: input.quantity || 1 }]
          : [];
    if (requested.length === 0) throw DomainError.validation("No product selected");

    return this.uow.run(async (tx) => {
      const zone = await this.geo.zone(input.zone_id, tx);
      if (!zone) throw DomainError.validation("Unknown delivery zone");

      const customer = await this.customers.findOrCreate(input.phone, input.full_name, input.email, tx);
      const address = await this.customers.addAddress(customer.id, zone.id, input.street_details, tx);

      const products = await this.catalog.getProducts([...new Set(requested.map((l) => l.product_id))], tx);
      const lines = priceLines(requested, products);
      const subtotal = lines.reduce((s, l) => s + l.total_price, 0);

      let discount = 0;
      let finalShipping = zone.shipping_price;
      let couponId: string | undefined;
      const couponCode = input.coupon_code?.trim();
      if (couponCode) {
        const coupon = await this.promotions.evaluate({ code: couponCode, subtotal, shippingCost: zone.shipping_price, customerId: customer.id }, tx);
        if (!coupon.valid) throw DomainError.validation(coupon.error || "Invalid coupon code");
        discount = coupon.discountAmount;
        finalShipping = coupon.finalShipping;
        couponId = coupon.couponId;
      }

      const totals = orderTotals(lines, zone.shipping_price, discount, finalShipping);
      const orderId = await this.orders.create(
        {
          customer_id: customer.id,
          address_id: address.id,
          lines,
          ...totals,
          coupon_code: couponCode ? couponCode.toUpperCase() : null,
          platform_source: input.platform_source,
          ip_address: input.ip_address,
          ip_country: input.ip_country,
          ip_city: input.ip_city,
        },
        tx,
      );
      if (couponId) await this.promotions.redeem(couponId, customer.id, orderId, tx);
      return { result: orderId, events: [Order.placed(orderId)] };
    });
  }
}

export interface StatusChangeResult {
  success: boolean;
  trackingId?: string;
  error?: string;
}

/** Admin / customer / courier status changes, all through the Order aggregate. */
@Injectable()
export class ChangeOrderStatusUseCase {
  private readonly log = new Logger(ChangeOrderStatusUseCase.name);

  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(ORDER_STORE) private readonly orders: OrderStore,
    @Inject(ORDER_READS) private readonly reads: OrderReads,
    private readonly catalog: CatalogFacade,
    private readonly shipping: ShippingFacade,
  ) {}

  async change(orderId: string, status: string, provider?: string, requireConfirmation?: boolean): Promise<StatusChangeResult> {
    if (!isOrderStatus(status)) throw DomainError.validation(`Unknown status "${status}"`);
    if (status === "approved") return this.approve(orderId, provider, requireConfirmation ?? false);
    if (status === "confirmed") return this.confirm(orderId);
    if (status === "cancelled") return this.cancel(orderId);
    await this.uow.run(async (tx) => {
      const order = await this.mustLoad(orderId, tx);
      order.advance(status);
      await this.orders.save(order, tx);
      return { result: undefined, events: order.pullEvents() };
    });
    return { success: true };
  }

  private async mustLoad(id: string, tx: unknown): Promise<Order> {
    const order = await this.orders.load(id, tx);
    if (!order) throw DomainError.notFound("Order not found");
    return order;
  }

  /**
   * Approve reserves stock atomically. "Ship now" (requireConfirmation=false)
   * goes straight on to confirm + create the shipment.
   */
  async approve(orderId: string, provider: string | undefined, requireConfirmation: boolean): Promise<StatusChangeResult> {
    const providerName = this.shipping.resolveName(provider);
    await this.uow.run(async (tx) => {
      const order = await this.mustLoad(orderId, tx);
      order.approve(providerName, requireConfirmation);
      for (const line of order.lines) {
        if (!line.productId) continue;
        const ok = await this.catalog.reserveStock(line.productId, line.quantity, tx);
        if (!ok) throw DomainError.conflict("Not enough stock left to approve this order");
      }
      await this.orders.save(order, tx);
      return { result: undefined, events: order.pullEvents() };
    });
    return requireConfirmation ? { success: true } : this.confirm(orderId);
  }

  /** Customer confirmed (or ship-now): book the courier, then move to `confirmed`. */
  async confirm(orderId: string): Promise<StatusChangeResult> {
    const details = await this.reads.details(orderId);
    if (!details) throw DomainError.notFound("Order not found");
    if (details.status !== "approved") {
      throw DomainError.validation(`Order cannot be confirmed — current status is "${details.status}"`);
    }
    const courier = this.shipping.provider(details.shipping_provider);
    const delivery = await courier.createDelivery({
      orderId: details.id,
      customerName: details.customer.full_name,
      customerPhone: details.customer.phone,
      city: details.address.zone.city?.name || "Cairo",
      zone: details.address.zone.english_name,
      streetAddress: details.address.street_details,
      cod: details.total_price,
      notes: details.platform_source ? `Platform: ${details.platform_source}` : undefined,
    });
    if (!delivery.success) this.log.warn(`courier ${courier.name} failed for ${orderId}: ${delivery.error}`);

    await this.uow.run(async (tx) => {
      const order = await this.mustLoad(orderId, tx);
      order.confirm(delivery.success ? (delivery.trackingId ?? null) : null);
      await this.orders.save(order, tx);
      return { result: undefined, events: order.pullEvents() };
    });

    // v1 behaviour: the order is confirmed even if booking failed, so the admin can retry by hand.
    return delivery.success
      ? { success: true, trackingId: delivery.trackingId }
      : { success: false, error: `Order confirmed but shipping failed: ${delivery.error}` };
  }

  async cancel(orderId: string): Promise<StatusChangeResult> {
    await this.uow.run(async (tx) => {
      const order = await this.mustLoad(orderId, tx);
      const restock = order.cancel();
      for (const line of restock) {
        if (line.productId) await this.catalog.releaseStock(line.productId, line.quantity, tx);
      }
      await this.orders.save(order, tx);
      return { result: undefined, events: order.pullEvents() };
    });
    return { success: true };
  }

  /** Courier webhook: idempotent, out-of-order events are ignored. */
  async fromCourier(providerParam: string | undefined, body: Record<string, unknown>): Promise<{ updated: boolean; reason?: string }> {
    const courier = this.shipping.provider(providerParam);
    const { trackingId, status } = courier.parseWebhook(body);
    if (!trackingId || !status) throw DomainError.validation("Missing tracking ID or status");
    const mapped = courier.mapStatus(status) as OrderStatus;
    return this.uow.run(async (tx) => {
      const order = await this.orders.loadByTracking(trackingId, tx);
      if (!order) throw DomainError.notFound("Order not found");
      const moved = order.advanceIfAllowed(mapped);
      if (moved) await this.orders.save(order, tx);
      return { result: { updated: moved, reason: moved ? undefined : `ignored ${order.status} -> ${mapped}` }, events: order.pullEvents() };
    });
  }
}

/** Read side, also exported to notifications and the CRM. */
@Injectable()
export class OrderQueries {
  constructor(
    @Inject(ORDER_READS) private readonly reads: OrderReads,
    @Inject(ORDER_STORE) private readonly store: OrderStore,
  ) {}

  list(status?: string) {
    return this.reads.list({ status: status === "pending" ? "pending" : undefined });
  }

  forCustomer(customerId: string) {
    return this.reads.list({ customerId });
  }

  details(id: string) {
    return this.reads.details(id);
  }

  awaitingConfirmation(rawPhone: string) {
    return this.reads.latestApprovedForPhone(toLocalEgyptPhone(rawPhone));
  }

  claimNotification(orderId: string, status: string) {
    return this.store.markNotifiedIfNew(orderId, status);
  }
}
