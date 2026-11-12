import { Inject, Injectable, Logger } from "@nestjs/common";
import { CACHE, type Cache } from "../../../shared/application/cache.port";
import type { EventEnvelope } from "../../../shared/domain/domain-event";
import { ENV } from "../../../shared/infrastructure/config/config.module";
import type { Env } from "../../../shared/infrastructure/config/env";
import { OrderEvents, OrderQueries, type OrderDetailsDto } from "../../ordering";
import { ReviewsFacade } from "../../reviews";
import { N8nOrderNotifier, ResendEmailSender, type N8nOrderNotification } from "../infrastructure/notifiers";

/**
 * Worker-side reaction to `ordering.events`: customer WhatsApp (via n8n) on
 * every status, admin email on a new order. Idempotent: the order row records
 * the last notified status, and the email is guarded by a Redis key.
 */
@Injectable()
export class OrderNotificationsHandler {
  private readonly log = new Logger(OrderNotificationsHandler.name);

  constructor(
    private readonly orders: OrderQueries,
    private readonly reviews: ReviewsFacade,
    private readonly n8n: N8nOrderNotifier,
    private readonly email: ResendEmailSender,
    @Inject(CACHE) private readonly cache: Cache,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async handle(e: EventEnvelope<{ orderId: string; to?: string; silent?: boolean }>): Promise<void> {
    const order = await this.orders.details(e.payload.orderId);
    if (!order) return;
    if (e.type === OrderEvents.placed) {
      await this.notifyCustomer(order, "pending");
      if (await this.cache.firstTime(`idem:email:new-order:${order.id}`, 7 * 86400)) {
        try {
          await this.sendNewOrderEmail(order);
        } catch (err) {
          await this.cache.release(`idem:email:new-order:${order.id}`);
          throw err;
        }
      }
      return;
    }
    if (e.type === OrderEvents.statusChanged && e.payload.to && !e.payload.silent) {
      await this.notifyCustomer(order, e.payload.to);
    }
  }

  private async notifyCustomer(order: OrderDetailsDto, status: string) {
    if (!this.n8n.enabled) return;
    if (!(await this.orders.claimNotification(order.id, status))) {
      this.log.debug(`skip duplicate notification ${order.id}:${status}`);
      return;
    }
    const payload: N8nOrderNotification = {
      orderId: order.id,
      newStatus: status,
      customerPhone: order.customer.phone,
      customerName: order.customer.full_name,
      productName: order.product?.name ?? "طلبك",
      trackingId: order.shipping_tracking_id,
      totalPrice: order.total_price,
      quantity: order.quantity,
      items: order.items.map((i) => ({
        productName: i.product?.name ?? "طلبك",
        quantity: i.quantity,
        unitPrice: i.unit_price,
        totalPrice: i.total_price,
      })),
    };
    if (status === "delivered" && order.product_id) {
      try {
        payload.reviewUrl = this.reviews.reviewUrl(order.customer.phone, order.product_id, order.id);
      } catch (err) {
        this.log.warn(`no review link: ${err instanceof Error ? err.message : err}`);
      }
    }
    await this.n8n.send(payload);
  }

  private async sendNewOrderEmail(order: OrderDetailsDto) {
    const shortId = order.id.slice(0, 8);
    const lines = order.items.map((i) => `- ${i.product?.name ?? "منتج"} × ${i.quantity} — ${i.total_price} جنيه`).join("\n");
    await this.email.sendToAdmin(
      `طلب جديد #${shortId} — ${order.customer.full_name}`,
      [
        `طلب جديد رقم: ${shortId}`,
        `العميل: ${order.customer.full_name} (${order.customer.phone})`,
        "",
        "المنتجات:",
        lines,
        "",
        `الإجمالي: ${order.total_price} جنيه`,
        "",
        `عرض الطلب: ${this.env.PUBLIC_APP_URL}/admin/orders`,
      ].join("\n"),
    );
  }
}
