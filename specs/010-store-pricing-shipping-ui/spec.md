# 010 — Store Pricing, Shipping Zones & UI Fixes

## Problem
1. **Product tiers/discount not shown in store** — Admin manages `quantity_prices` tiers and `compare_at_price` discounts, but the store's `ProductDetail` and `ProductCard` only show flat `price` + simple discount. The landing page has a `QuantityPricing` component for tiers — the store doesn't use it.
2. **No shipping price on zones** — The `zones` table has no `shipping_price` column; orders have no `shipping_cost` field. Shipping cost isn't calculated or displayed at checkout.
3. **Missing Cairo zones** — Only 15 zones exist. Major areas missing: Helwan, El Shorouk, El Obour, Madinet El Salam, El Marg, Matariya, Dar El Salam, Basatin, Garden City, Imbaba, Boulaq, Sayeda Zeinab, etc.
4. **Hero image too small on mobile** — Capped at `max-w-[240px]` on mobile.
5. **BestSellers grid wrong** — First item spans 2 cols. User wants normal grid: 4/row desktop, 2/row mobile.
6. **ProductCard image sizing** — Review for mobile.

## Tasks
- **A**: Add `shipping_price` to zones, `shipping_cost` to orders (DB migration + service + UI)
- **B**: Insert missing Cairo zones with shipping prices
- **C**: Port quantity-tier pricing to store `ProductDetail`
- **D**: Fix hero image mobile size, BestSellers grid, ProductCard image
