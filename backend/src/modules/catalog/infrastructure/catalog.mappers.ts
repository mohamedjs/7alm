import { iso, num, numOrNull } from "../../../shared/infrastructure/prisma/decimal";
import type { QuantityPriceTier, StockStatus } from "../domain/product";
import type { CategoryDto, ProductDto } from "../domain/catalog.types";
export type { CategoryDto, ProductDto };



function tiers(raw: unknown): QuantityPriceTier[] | null {
  if (!Array.isArray(raw)) return null;
  return raw
    .map((t) => ({
      min_quantity: Number(t?.min_quantity) || 1,
      price: Number(t?.price) || 0,
      compare_at_price: t?.compare_at_price == null ? null : Number(t.compare_at_price),
      label: String(t?.label ?? ""),
      is_special: Boolean(t?.is_special),
    }))
    .sort((a, b) => a.min_quantity - b.min_quantity);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toProductDto(r: any): ProductDto {
  return {
    id: r.id,
    category_id: r.category_id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    price: num(r.price),
    compare_at_price: numOrNull(r.compare_at_price),
    quantity_prices: tiers(r.quantity_prices),
    sku: r.sku,
    qrcode: r.qrcode,
    quantity: r.quantity,
    stock_status: r.stock_status as StockStatus,
    main_image: r.main_image,
    gallery: Array.isArray(r.gallery) ? (r.gallery as string[]) : [],
    video_url: r.video_url ?? null,
    is_active: r.is_active,
    theme_color: r.theme_color,
    is_featured: r.is_featured,
    featured_sort: r.featured_sort,
    created_at: iso(r.created_at)!,
    updated_at: iso(r.updated_at)!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toCategoryDto(r: any): CategoryDto {
  return {
    id: r.id,
    parent_id: r.parent_id,
    slug: r.slug,
    name_ar: r.name_ar,
    name_en: r.name_en,
    is_active: r.is_active,
    sort_order: r.sort_order,
    image: r.image,
    created_at: iso(r.created_at)!,
    updated_at: iso(r.updated_at)!,
  };
}
