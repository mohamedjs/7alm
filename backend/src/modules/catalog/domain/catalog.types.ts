import type { QuantityPriceTier, StockStatus } from "./product";

/** Product read model — identical to the v1 Supabase row the frontend reads. */
export interface ProductDto {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  quantity_prices: QuantityPriceTier[] | null;
  sku: string | null;
  qrcode: string | null;
  quantity: number;
  stock_status: StockStatus;
  main_image: string | null;
  gallery: string[];
  video_url: string | null;
  is_active: boolean;
  theme_color: string;
  is_featured: boolean;
  featured_sort: number | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryDto {
  id: string;
  parent_id: string | null;
  slug: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
  sort_order: number;
  image: string | null;
  created_at: string;
  updated_at: string;
}

/** Writable product fields (admin create / update). */
export interface ProductWrite {
  category_id?: string | null;
  name?: string;
  slug?: string;
  description?: string | null;
  price?: number;
  compare_at_price?: number | null;
  quantity_prices?: unknown[] | null;
  sku?: string | null;
  qrcode?: string | null;
  quantity?: number;
  stock_status?: string;
  main_image?: string | null;
  gallery?: string[];
  video_url?: string | null;
  is_active?: boolean;
  theme_color?: string;
  is_featured?: boolean;
  featured_sort?: number | null;
}

export interface CategoryWrite {
  parent_id?: string | null;
  slug?: string;
  name_ar?: string;
  name_en?: string;
  is_active?: boolean;
  sort_order?: number;
  image?: string | null;
}
