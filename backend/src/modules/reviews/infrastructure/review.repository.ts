import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { iso } from "../../../shared/infrastructure/prisma/decimal";
import type { ReviewStatus, ReviewStore } from "../domain/review";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const row = (r: any) => ({
  id: r.id,
  product_id: r.product_id,
  customer_id: r.customer_id,
  order_id: r.order_id,
  rating: r.rating,
  title: r.title,
  body: r.body,
  status: r.status,
  created_at: iso(r.created_at),
  updated_at: iso(r.updated_at),
  ...(r.customer ? { customer: r.customer } : {}),
  ...(r.product ? { product: r.product } : {}),
});

@Injectable()
export class ReviewRepository implements ReviewStore {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: { product_id: string; customer_id: string; order_id: string; rating: number; title: string | null; body: string | null }) {
    try {
      await this.prisma.productReview.create({ data: { ...input, status: "pending" } });
      return "created" as const;
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") return "duplicate" as const;
      throw e;
    }
  }

  async hasDeliveredOrder(customerId: string, productId: string) {
    const n = await this.prisma.order.count({
      where: {
        customer_id: customerId,
        status: "delivered",
        OR: [{ product_id: productId }, { order_items: { some: { product_id: productId } } }],
      },
    });
    return n > 0;
  }

  async approvedForProduct(productId: string) {
    const rows = await this.prisma.productReview.findMany({
      where: { product_id: productId, status: "approved" },
      include: { customer: { select: { full_name: true } } },
      orderBy: { created_at: "desc" },
    });
    return rows.map(row);
  }

  async ratings(productId?: string) {
    const rows = await this.prisma.productReview.findMany({
      where: { status: "approved", ...(productId ? { product_id: productId } : {}) },
      select: { rating: true },
    });
    return rows.map((r) => r.rating);
  }

  async topApproved(minRating: number, limit: number) {
    const rows = await this.prisma.productReview.findMany({
      where: { status: "approved", rating: { gte: minRating } },
      include: { customer: { select: { full_name: true } }, product: { select: { name: true, slug: true } } },
      orderBy: { created_at: "desc" },
      take: limit,
    });
    return rows.map(row);
  }

  async forModeration(status?: ReviewStatus) {
    const rows = await this.prisma.productReview.findMany({
      where: status ? { status } : {},
      include: { customer: { select: { full_name: true, phone: true } }, product: { select: { name: true, slug: true, main_image: true } } },
      orderBy: { created_at: "desc" },
    });
    return rows.map(row);
  }

  async setStatus(id: string, status: ReviewStatus) {
    try {
      return row(await this.prisma.productReview.update({ where: { id }, data: { status } }));
    } catch {
      return null;
    }
  }
}
