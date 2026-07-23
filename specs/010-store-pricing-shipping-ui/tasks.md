# 010 Tasks

## Task A — DB: Shipping price on zones + shipping cost on orders [DB/Backend]
- [ ] Add `shipping_price NUMERIC DEFAULT 0` to `zones` table
- [ ] Add `shipping_cost NUMERIC DEFAULT 0` to `orders` table
- [ ] Update `Zone` type in `src/features/shared/types.ts` (add `shipping_price`)
- [ ] Update `geo.repository.ts` to select `shipping_price`
- [ ] Update `geo.api.ts` Zone interface to include `shipping_price`
- [ ] Update `orders.service.ts` to add shipping cost to total
- [ ] Display shipping cost in `StoreCheckoutForm` order summary
- [ ] Display shipping cost in landing `CheckoutForm`

## Task B — DB: Missing Cairo zones [DB]
- [ ] Insert missing Cairo zones with default shipping prices

## Task C — Store: Quantity-tier pricing in ProductDetail [Frontend]
- [ ] Port `QuantityPricing` component pattern to store ProductDetail
- [ ] When tiers exist, show tier selector (like landing page does)
- [ ] Update price display to reflect selected tier
- [ ] Update add-to-cart to use tier price
- [ ] Ensure discount badge works in ProductCard when compare_at_price set

## Task D — UI: Hero image, BestSellers grid, ProductCard image [Frontend]
- [ ] Increase hero image max-width on mobile (240→320px, 280→380px sm, 300→420px lg)
- [ ] BestSellers: remove first-item col-span, make normal grid (grid-cols-2 lg:grid-cols-4)
- [ ] ProductCard: ensure image fills well on mobile (review aspect ratio)

## Task E — Homepage: Product Collections + Testimonials [Frontend]
- [ ] Create `ProductCollections` component — tabbed product browsing section
  - Tabs: "الكل" (All), "أحدث المنتجات" (Latest), "الأكثر مبيعاً" (Best Sellers), "مميزة" (Featured)
  - Each tab filters/sorts products accordingly
  - Shows product cards in 4-col grid (2 on mobile)
  - Section title: "تشكيلة منتجاتنا" / "Our Products Collections"
- [ ] Create `Testimonials` component — "What Our Clients Say" section
  - Card-based horizontal layout with customer photo placeholder, name, role, star rating, review text
  - Neumorphic card styling matching app design system
  - Section title: "ماذا يقول عملاؤنا" / "What Our Clients Say"
- [ ] Add both sections to store homepage `(store)/page.tsx`
- [ ] Add all dictionary keys to `src/features/i18n/dictionary.ts`
