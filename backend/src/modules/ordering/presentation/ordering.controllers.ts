import { Body, Controller, Get, HttpCode, Inject, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import { AdminGuard, N8nGuard } from "../../identity";
import { ZodPipe } from "../../../shared/infrastructure/http/zod.pipe";
import { clientIp, type AppRequest } from "../../../shared/infrastructure/http/request";
import { ENV } from "../../../shared/infrastructure/config/config.module";
import type { Env } from "../../../shared/infrastructure/config/env";
import { safeEqual } from "../../../shared/infrastructure/security/crypto.service";
import { EGYPT_MOBILE } from "../../../shared/domain/phone";
import { ChangeOrderStatusUseCase, OrderQueries, PlaceOrderUseCase } from "../application/ordering.use-cases";

const trimmed = z.string().trim();
export const CheckoutBody = z.object({
  full_name: trimmed.min(2, "Missing required fields: full_name, phone, zone_id, street_details").max(120),
  phone: z
    .string({ message: "Missing required fields: full_name, phone, zone_id, street_details" })
    .transform((p) => p.replace(/\s/g, ""))
    .refine((p) => EGYPT_MOBILE.test(p), "Invalid phone number format"),
  email: z.string().trim().email().optional().or(z.literal("").transform(() => undefined)),
  zone_id: z.string().uuid("Missing required fields: full_name, phone, zone_id, street_details"),
  street_details: trimmed.min(3, "Missing required fields: full_name, phone, zone_id, street_details").max(500),
  product_id: z.string().uuid().optional(),
  quantity: z.coerce.number().int().min(1).max(50).optional(),
  items: z
    .array(z.object({ product_id: z.string().uuid(), quantity: z.coerce.number().int().min(1, "Invalid items[] — each item needs product_id and quantity >= 1").max(50) }))
    .max(30)
    .optional(),
  coupon_code: z.string().trim().max(40).optional(),
  platform_source: z.string().trim().max(80).optional(),
  ip_address: z.string().max(64).optional(),
  ip_country: z.string().max(80).optional(),
  ip_city: z.string().max(80).optional(),
});
type CheckoutBody = z.infer<typeof CheckoutBody>;

const StatusBody = z.object({
  status: z.string().default("approved"),
  shipping_provider: z.string().optional(),
  require_confirmation: z.boolean().optional(),
});

@Controller()
export class OrdersController {
  constructor(
    private readonly place: PlaceOrderUseCase,
    private readonly changeStatus: ChangeOrderStatusUseCase,
    private readonly queries: OrderQueries,
  ) {}

  /** Public checkout (landing funnel + store cart). */
  @Post("orders")
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  async create(@Body(new ZodPipe(CheckoutBody)) body: CheckoutBody, @Req() req: AppRequest) {
    const orderId = await this.place.execute({ ...body, ip_address: body.ip_address ?? clientIp(req) });
    return { success: true, orderId };
  }

  @Get("orders")
  @UseGuards(AdminGuard)
  list(@Query("status") status?: string) {
    return this.queries.list(status);
  }

  @Get("admin/orders/:id")
  @UseGuards(AdminGuard)
  async one(@Param("id", ParseUUIDPipe) id: string) {
    const order = await this.queries.details(id);
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }

  @Patch("orders/:id/status")
  @UseGuards(AdminGuard)
  async status(@Param("id", ParseUUIDPipe) id: string, @Body(new ZodPipe(StatusBody)) body: z.infer<typeof StatusBody>) {
    const result = await this.changeStatus.change(id, body.status, body.shipping_provider, body.require_confirmation);
    if (!result.success) return { success: false, error: result.error };
    return { success: true, trackingId: result.trackingId, message: `Order status changed to ${body.status}` };
  }
}

/** n8n sales/confirmation agent. */
@Controller("n8n/orders")
@UseGuards(N8nGuard)
export class OrdersN8nController {
  constructor(
    private readonly place: PlaceOrderUseCase,
    private readonly queries: OrderQueries,
  ) {}

  @Post()
  async create(@Body(new ZodPipe(CheckoutBody)) body: CheckoutBody) {
    const orderId = await this.place.execute({ ...body, platform_source: body.platform_source ?? "whatsapp-agent" });
    return { success: true, orderId };
  }

  @Get("awaiting-confirmation")
  async awaiting(@Query("phone") phone?: string) {
    if (!phone) throw new NotFoundException("Missing phone parameter");
    const order = await this.queries.awaitingConfirmation(phone);
    if (!order) throw new NotFoundException("No order awaiting confirmation");
    return { orderId: order.id, productName: order.product?.name ?? null, totalPrice: order.total_price, quantity: order.quantity };
  }
}

const OrderAction = z.object({ orderId: z.string().uuid(), action: z.enum(["confirm", "cancel"]) });

/** Inbound webhooks from couriers and n8n (shared-secret authenticated). */
@Controller("webhooks")
export class OrderWebhooksController {
  constructor(
    private readonly changeStatus: ChangeOrderStatusUseCase,
    private readonly queries: OrderQueries,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private n8nSecret(req: AppRequest, querySecret?: string) {
    const provided = (req.headers["x-webhook-secret"] as string | undefined) ?? querySecret;
    if (!safeEqual(provided, this.env.N8N_WEBHOOK_SECRET)) throw new UnauthorizedException("Unauthorized");
  }

  @Post("shipping")
  @HttpCode(200)
  async shipping(@Query("secret") secret: string | undefined, @Query("provider") provider: string | undefined, @Body() body: Record<string, unknown>) {
    if (!safeEqual(secret, this.env.SHIPPING_WEBHOOK_SECRET)) throw new UnauthorizedException("Unauthorized");
    await this.changeStatus.fromCourier(provider, body ?? {});
    return { success: true };
  }

  @Get("n8n")
  async n8nOrder(@Req() req: AppRequest, @Query("secret") secret?: string, @Query("orderId") orderId?: string) {
    this.n8nSecret(req, secret);
    if (!orderId) throw new NotFoundException("Missing orderId parameter");
    const o = await this.queries.details(orderId);
    if (!o) throw new NotFoundException("Order not found");
    return {
      orderId: o.id,
      status: o.status,
      customerName: o.customer.full_name,
      customerPhone: o.customer.phone,
      productName: o.product?.name ?? null,
      productSlug: o.product?.slug ?? null,
      totalPrice: o.total_price,
      quantity: o.quantity,
      trackingId: o.shipping_tracking_id,
      shippingProvider: o.shipping_provider,
      createdAt: o.created_at,
      address: { street: o.address.street_details, zone: o.address.zone.arabic_name || o.address.zone.english_name, city: o.address.zone.city.name },
    };
  }

  @Post("n8n")
  @HttpCode(200)
  n8nCallback(@Req() req: AppRequest, @Query("secret") secret?: string) {
    this.n8nSecret(req, secret);
    return { success: true, message: "Received" };
  }

  @Post("n8n/order-action")
  @HttpCode(200)
  async orderAction(@Req() req: AppRequest, @Query("secret") secret: string | undefined, @Body(new ZodPipe(OrderAction)) body: z.infer<typeof OrderAction>) {
    this.n8nSecret(req, secret);
    const result = body.action === "confirm" ? await this.changeStatus.confirm(body.orderId) : await this.changeStatus.cancel(body.orderId);
    if (!result.success) return { success: false, error: result.error };
    return {
      success: true,
      action: body.action,
      trackingId: result.trackingId,
      message: body.action === "confirm" ? "Order confirmed and shipping initiated" : "Order cancelled successfully",
    };
  }
}
