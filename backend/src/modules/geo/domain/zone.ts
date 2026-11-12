export interface ZoneDto {
  id: string;
  city_id: string;
  english_name: string;
  arabic_name: string;
  shipping_price: number;
  city: { name: string; country: { name: string } };
}

export interface ZoneOption {
  id: string;
  arabic_name: string;
  english_name: string;
  city_name: string;
  shipping_price: number;
}

export const toOption = (z: ZoneDto): ZoneOption => ({
  id: z.id,
  arabic_name: z.arabic_name,
  english_name: z.english_name,
  city_name: z.city?.name ?? "",
  shipping_price: z.shipping_price,
});

export const GEO_STORE = Symbol("GEO_STORE");
export interface GeoStore {
  listZones(): Promise<ZoneDto[]>;
  findZone(id: string, tx?: unknown): Promise<ZoneDto | null>;
}
