import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { dbOf } from "../../../shared/infrastructure/prisma/unit-of-work";
import { iso, num } from "../../../shared/infrastructure/prisma/decimal";
import { Order } from "../domain/order";
import type { OrderStatus } from "../domain/order-status";
import type { NewOrder, OrderStore } from "../domain/ports";
import type { OrderDetailsDto, OrderItemDto, OrderReads } from "../domain/order-details";
import { toProductDto } from "../../catalog";

const detailsInclude = {
  customer: true,
  address: { include: { zone: { include: { city: true } } } },
  product: true,
  order_items: { include: { product: true }, orderBy: { created_at: "asc" as const } },
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDetails(o: any): OrderDetailsDto {
  const product = o.product ? toProductDto(o.product) : null;
  const items: OrderItemDto[] = (o.order_items ?? []).map((i: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    id: i.id,
    order_id: i.order_id,
    product_id: i.product_id,
    product: i.product ? toProductDto(i.product) : undefined,
    quantity: i.quantity,
    unit_price: num(i.unit_price),
    total_price: num(i.total_price),
    created_at: iso(i.created_at)!,
  }));
  if (items.length === 0 && o.product_id) {
    items.push({
      id: o.id,
      order_id: o.id,
      product_id: o.product_id,
      product: product ?? undefined,
      quantity: o.quantity,
      unit_price: product ? product.price : num(o.total_price),
      total_price: num(o.subtotal) || num(o.total_price),
      created_at: iso(o.created_at)!,
    });
  }
  const z = o.address.zone;
  return {
    id: o.id,
    customer_id: o.customer_id,
    address_id: o.address_id,
    product_id: o.product_id,
    quantity: o.quantity,
    total_price: num(o.total_price),
    subtotal: num(o.subtotal),
    discount_amount: num(o.discount_amount),
    shipping_cost: num(o.shipping_cost),
    coupon_code: o.coupon_code,
    platform_source: o.platform_source,
    ip_address: o.ip_address,
    ip_country: o.ip_country,
    ip_city: o.ip_city,
    status: o.status as OrderStatus,
    shipping_provider: o.shipping_provider,
    shipping_tracking_id: o.shipping_tracking_id,
    requires_confirmation: o.requires_confirmation,
    last_notified_status: o.last_notified_status,
    last_notified_at: iso(o.last_notified_at),
    created_at: iso(o.created_at)!,
    updated_at: iso(o.updated_at)!,
    customer: {
      id: o.customer.id,
      phone: o.customer.phone,
      email: o.customer.email,
      full_name: o.customer.full_name,
      created_at: iso(o.customer.created_at)!,
    },
    address: {
      id: o.address.id,
      customer_id: o.address.customer_id,
      zone_id: o.address.zone_id,
      street_details: o.address.street_details,
      created_at: iso(o.address.created_at)!,
      zone: {
        id: z.id,
        city_id: z.city_id,
        english_name: z.english_name,
        arabic_name: z.arabic_name,
        shipping_price: num(z.shipping_price),
        city: { id: z.city.id, country_id: z.city.country_id, name: z.city.name },
      },
    },
    product,
    items,
  };
}

interface LockedRow {
  id: string;
  status: string;
  shipping_provider: string | null;
  shipping_tracking_id: string | null;
  requires_confirmation: boolean;
}

@Injectable()
export class OrderRepository implements OrderStore, OrderReads {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: NewOrder, tx: unknown): Promise<string> {
    const db = dbOf(this.prisma, tx);
    const first = input.lines[0];
    const order = await db.order.create({
      data: {
        customer_id: input.customer_id,
        address_id: input.address_id,
        // Legacy single-product readers (n8n v1 fields) read product_id/quantity from the first line.
        product_id: first?.product_id ?? null,
        quantity: first?.quantity ?? 1,
        subtotal: input.subtotal,
        discount_amount: input.discount_amount,
        shipping_cost: input.shipping_cost,
        total_price: input.total_price,
        coupon_code: input.coupon_code,
        platform_source: input.platform_source ?? null,
        ip_address: input.ip_address ?? null,
        ip_country: input.ip_country ?? null,
        ip_city: input.ip_city ?? null,
        status: "pending",
        order_items: { create: input.lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity, unit_price: l.unit_price, total_price: l.total_price })) },
      },
      select: { id: true },
    });
    return order.id;
  }

  private async restore(row: LockedRow, tx?: unknown): Promise<Order> {
    const items = await dbOf(this.prisma, tx).orderItem.findMany({ where: { order_id: row.id }, select: { product_id: true, quantity: true } });
    return Order.restore({
      id: row.id,
      status: row.status as OrderStatus,
      productLines: items.map((i) => ({ productId: i.product_id, quantity: i.quantity })),
      shippingProvider: row.shipping_provider,
      trackingId: row.shipping_tracking_id,
      requiresConfirmation: row.requires_confirmation,
      stockReserved: row.status !== "pending",
    });
  }

  async load(id: string, tx?: unknown): Promise<Order | null> {
    const db = dbOf(this.prisma, tx);
    const rows = await db.$queryRaw<LockedRow[]>`
      SELECT id, status, shipping_provider, shipping_tracking_id, requires_confirmation
      FROM orders WHERE id = ${id}::uuid FOR UPDATE`;
    return rows[0] ? this.restore(rows[0], tx) : null;
  }

  async loadByTracking(trackingId: string, tx?: unknown): Promise<Order | null> {
    const db = dbOf(this.prisma, tx);
    const rows = await db.$queryRaw<LockedRow[]>`
      SELECT id, status, shipping_provider, shipping_tracking_id, requires_confirmation
      FROM orders WHERE shipping_tracking_id = ${trackingId} LIMIT 1 FOR UPDATE`;
    return rows[0] ? this.restore(rows[0], tx) : null;
  }

  async save(order: Order, tx?: unknown): Promise<void> {
    const s = order.snapshot();
    await dbOf(this.prisma, tx).order.update({
      where: { id: s.id },
      data: {
        status: s.status,
        shipping_provider: s.shippingProvider,
        shipping_tracking_id: s.trackingId,
        requires_confirmation: s.requiresConfirmation,
      },
    });
  }

  async markNotifiedIfNew(id: string, status: string): Promise<boolean> {
    const n = await this.prisma.$executeRaw`
      UPDATE orders SET last_notified_status = ${status}, last_notified_at = now()
      WHERE id = ${id}::uuid AND (last_notified_status IS NULL OR last_notified_status <> ${status})`;
    return n === 1;
  }

  async details(id: string) {
    const row = await this.prisma.order.findUnique({ where: { id }, include: detailsInclude });
    return row ? toDetails(row) : null;
  }

  async list(filter: { status?: OrderStatus; customerId?: string; limit?: number }) {
    const rows = await this.prisma.order.findMany({
      where: { ...(filter.status ? { status: filter.status } : {}), ...(filter.customerId ? { customer_id: filter.customerId } : {}) },
      include: detailsInclude,
      orderBy: { created_at: "desc" },
      take: filter.limit ?? 500,
    });
    return rows.map(toDetails);
  }

  async latestApprovedForPhone(phone: string) {
    const row = await this.prisma.order.findFirst({
      where: { status: "approved", customer: { phone } },
      include: detailsInclude,
      orderBy: { created_at: "desc" },
    });
    return row ? toDetails(row) : null;
  }
}
