import { z } from "zod";
import { nullableInt, nullableNumber, nullableText, nullableUuid } from "../../../shared/infrastructure/http/form-fields";

const tier = z.object({
  min_quantity: z.coerce.number().int().min(1),
  price: z.coerce.number().min(0),
  compare_at_price: nullableNumber().transform((v) => v ?? null),
  label: z.string().default(""),
  is_special: z.boolean().default(false),
});


/** Admin product body. Unknown keys are dropped (v1 inserted the raw body). */
export const ProductBody = z
  .object({
    category_id: nullableUuid(),
    name: z.string().min(1),
    slug: z.string().min(1),
    description: nullableText(),
    price: z.coerce.number().min(0),
    compare_at_price: nullableNumber(),
    quantity_prices: z.array(tier).nullable().optional(),
    sku: nullableText(),
    qrcode: nullableText(),
    quantity: z.coerce.number().int().min(0),
    stock_status: z.enum(["in_stock", "out_of_stock", "low_stock"]),
    main_image: nullableText(),
    gallery: z.array(z.string()),
    video_url: nullableText(),
    is_active: z.boolean(),
    theme_color: z.string(),
    is_featured: z.boolean(),
    featured_sort: nullableInt(),
  })
  .partial()
  .strip();

export const CategoryBody = z
  .object({
    parent_id: nullableUuid(),
    slug: z.string().min(1),
    name_ar: z.string().min(1),
    name_en: z.string().min(1),
    is_active: z.boolean(),
    sort_order: z.coerce.number().int(),
    image: nullableText(),
  })
  .partial()
  .strip();
