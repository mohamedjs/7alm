import { Injectable } from "@nestjs/common";
import { Prisma } from "../../../generated/prisma/client";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { dbOf } from "../../../shared/infrastructure/prisma/unit-of-work";
import { iso } from "../../../shared/infrastructure/prisma/decimal";
import type { AddressDto, CustomerDto, CustomerStatsDto, CustomerStore, CustomerWithStats } from "../domain/customer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDto = (c: any): CustomerDto => ({
  id: c.id,
  phone: c.phone,
  email: c.email,
  full_name: c.full_name,
  notes: c.notes ?? null,
  created_at: iso(c.created_at)!,
});

interface StatsRow {
  customer_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: Date;
  total_orders: number;
  total_spent: number;
  avg_order_value: number;
  first_order_date: Date | null;
  last_order_date: Date | null;
}

const statsOf = (r: StatsRow): CustomerStatsDto => ({
  total_orders: Number(r.total_orders),
  total_spent: Number(r.total_spent),
  avg_order_value: Number(r.avg_order_value),
  first_order_date: iso(r.first_order_date),
  last_order_date: iso(r.last_order_date),
});

@Injectable()
export class CustomerRepository implements CustomerStore {
  constructor(private readonly prisma: PrismaService) {}

  async findByPhone(phone: string, tx?: unknown) {
    const row = await dbOf(this.prisma, tx).customer.findUnique({ where: { phone } });
    return row ? toDto(row) : null;
  }

  async findById(id: string) {
    const row = await this.prisma.customer.findUnique({ where: { id } });
    return row ? toDto(row) : null;
  }

  async create(input: { phone: string; full_name: string; email?: string | null }, tx?: unknown) {
    const db = dbOf(this.prisma, tx);
    // Upsert: two concurrent checkouts with the same phone must not both insert.
    const row = await db.customer.upsert({
      where: { phone: input.phone },
      update: {},
      create: { phone: input.phone, full_name: input.full_name, email: input.email || null },
    });
    return toDto(row);
  }

  async update(id: string, input: { email?: string | null; notes?: string | null; full_name?: string }) {
    return toDto(await this.prisma.customer.update({ where: { id }, data: input }));
  }

  async createAddress(customerId: string, zoneId: string, street: string, tx?: unknown): Promise<AddressDto> {
    const a = await dbOf(this.prisma, tx).address.create({
      data: { customer_id: customerId, zone_id: zoneId, street_details: street },
    });
    return { ...a, created_at: iso(a.created_at)! };
  }

  async listWithStats(page: number, limit: number, search?: string) {
    const offset = (page - 1) * limit;
    const filter = search
      ? Prisma.sql`WHERE full_name ILIKE ${"%" + search + "%"} OR phone ILIKE ${"%" + search + "%"}`
      : Prisma.empty;
    const [rows, count] = await Promise.all([
      this.prisma.$queryRaw<StatsRow[]>`
        SELECT * FROM customer_stats ${filter}
        ORDER BY last_order_date DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}`,
      this.prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*)::bigint AS n FROM customer_stats ${filter}`,
    ]);
    const data: CustomerWithStats[] = rows.map((r) => ({
      id: r.customer_id,
      phone: r.phone,
      email: r.email,
      full_name: r.full_name,
      notes: r.notes,
      created_at: iso(r.created_at)!,
      ...statsOf(r),
    }));
    return { data, totalCount: Number(count[0]?.n ?? 0) };
  }

  async stats(id: string) {
    const rows = await this.prisma.$queryRaw<StatsRow[]>`SELECT * FROM customer_stats WHERE customer_id = ${id}::uuid`;
    return rows[0] ? statsOf(rows[0]) : null;
  }

  async analytics(sinceDays: number) {
    const since = new Date(Date.now() - sinceDays * 86400_000);
    const [totals, top] = await Promise.all([
      this.prisma.$queryRaw<{ total: bigint; fresh: bigint; repeaters: bigint; buyers: bigint }[]>`
        SELECT COUNT(*)::bigint AS total,
               COUNT(*) FILTER (WHERE created_at >= ${since})::bigint AS fresh,
               COUNT(*) FILTER (WHERE total_orders > 1)::bigint AS repeaters,
               COUNT(*) FILTER (WHERE total_orders > 0)::bigint AS buyers
        FROM customer_stats`,
      this.prisma.$queryRaw<{ full_name: string; total_spent: number }[]>`
        SELECT full_name, total_spent FROM customer_stats ORDER BY total_spent DESC LIMIT 5`,
    ]);
    const t = totals[0];
    const buyers = Number(t?.buyers ?? 0);
    return {
      totalCustomers: Number(t?.total ?? 0),
      newCustomers: Number(t?.fresh ?? 0),
      repeatRate: buyers ? Math.round((Number(t?.repeaters ?? 0) / buyers) * 1000) / 10 : 0,
      topCustomers: top.map((r) => ({ full_name: r.full_name, total_spent: Number(r.total_spent) })),
    };
  }
}
