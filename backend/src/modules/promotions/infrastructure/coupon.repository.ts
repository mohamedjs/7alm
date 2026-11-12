import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { dbOf } from "../../../shared/infrastructure/prisma/unit-of-work";
import { iso, num, numOrNull } from "../../../shared/infrastructure/prisma/decimal";
import { normaliseCode, type CouponDto, type CouponInput, type CouponStore, type CouponType } from "../domain/coupon";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDto = (c: any): CouponDto => ({
  id: c.id,
  code: c.code,
  type: c.type as CouponType,
  value: num(c.value),
  min_order_total: num(c.min_order_total),
  max_discount: numOrNull(c.max_discount),
  first_order_only: c.first_order_only,
  per_customer_limit: c.per_customer_limit,
  usage_limit: c.usage_limit,
  used_count: c.used_count,
  starts_at: iso(c.starts_at),
  expires_at: iso(c.expires_at),
  is_active: c.is_active,
  created_at: iso(c.created_at)!,
  updated_at: iso(c.updated_at)!,
});

const date = (v: string | null | undefined) => (v === undefined ? undefined : v === null ? null : new Date(v));

@Injectable()
export class CouponRepository implements CouponStore {
  constructor(private readonly prisma: PrismaService) {}

  async findByCode(code: string, tx?: unknown) {
    const row = await dbOf(this.prisma, tx).coupon.findFirst({ where: { code: { equals: normaliseCode(code), mode: "insensitive" } } });
    return row ? toDto(row) : null;
  }

  async list() {
    return (await this.prisma.coupon.findMany({ orderBy: { created_at: "desc" } })).map(toDto);
  }

  async create(input: CouponInput) {
    const row = await this.prisma.coupon.create({
      data: {
        code: normaliseCode(input.code),
        type: input.type,
        value: input.value,
        min_order_total: input.min_order_total ?? 0,
        max_discount: input.max_discount ?? null,
        first_order_only: input.first_order_only ?? false,
        per_customer_limit: input.per_customer_limit ?? null,
        usage_limit: input.usage_limit ?? null,
        starts_at: date(input.starts_at) ?? null,
        expires_at: date(input.expires_at) ?? null,
        is_active: input.is_active ?? true,
      },
    });
    return toDto(row);
  }

  async update(id: string, input: Partial<CouponInput>) {
    const row = await this.prisma.coupon.update({
      where: { id },
      data: {
        ...input,
        code: input.code === undefined ? undefined : normaliseCode(input.code),
        starts_at: date(input.starts_at),
        expires_at: date(input.expires_at),
      },
    });
    return toDto(row);
  }

  async delete(id: string) {
    await this.prisma.coupon.delete({ where: { id } });
  }

  async buyerHistory(couponId: string, customerId: string, tx?: unknown) {
    const db = dbOf(this.prisma, tx);
    const [redemptions, orders] = await Promise.all([
      db.couponRedemption.count({ where: { coupon_id: couponId, customer_id: customerId } }),
      db.order.count({ where: { customer_id: customerId, status: { not: "cancelled" } } }),
    ]);
    return { redemptionsOfThisCoupon: redemptions, hasAnyOrder: orders > 0 };
  }

  async redeem(couponId: string, customerId: string, orderId: string, tx?: unknown) {
    const db = dbOf(this.prisma, tx);
    const bumped = await db.$executeRaw`
      UPDATE coupons SET used_count = used_count + 1, updated_at = now()
      WHERE id = ${couponId}::uuid AND (usage_limit IS NULL OR used_count < usage_limit)`;
    if (bumped !== 1) return false;
    await db.couponRedemption.create({ data: { coupon_id: couponId, customer_id: customerId, order_id: orderId } });
    return true;
  }
}
