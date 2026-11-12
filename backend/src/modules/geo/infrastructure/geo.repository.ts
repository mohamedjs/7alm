import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { dbOf } from "../../../shared/infrastructure/prisma/unit-of-work";
import { num } from "../../../shared/infrastructure/prisma/decimal";
import type { GeoStore, ZoneDto } from "../domain/zone";

const include = { city: { select: { name: true, country: { select: { name: true } } } } } as const;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDto = (z: any): ZoneDto => ({
  id: z.id,
  city_id: z.city_id,
  english_name: z.english_name,
  arabic_name: z.arabic_name,
  shipping_price: num(z.shipping_price),
  city: { name: z.city?.name ?? "", country: { name: z.city?.country?.name ?? "" } },
});

@Injectable()
export class GeoRepository implements GeoStore {
  constructor(private readonly prisma: PrismaService) {}

  async listZones() {
    const rows = await this.prisma.zone.findMany({ include, orderBy: { arabic_name: "asc" } });
    return rows.map(toDto);
  }

  async findZone(id: string, tx?: unknown) {
    const row = await dbOf(this.prisma, tx).zone.findUnique({ where: { id }, include });
    return row ? toDto(row) : null;
  }
}
