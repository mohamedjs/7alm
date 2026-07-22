# Implementation Plan: B2C E-Commerce Storefront ("Dynamic Lookbook")

**Branch**: `007-b2c-ecommerce-storefront` (proposed — current branch is
`feat/categories-landing-redesign`) | **Date**: 2026-07-22 | **Spec**: none
yet — this plan was requested directly; write `spec.md` retroactively via
`/speckit-specify` if the team wants a formal spec artifact before
`/speckit-tasks`.

**Input**: User request to expand 7alm from a single-product checkout
funnel into a multi-category B2C storefront with a premium "Dynamic
Lookbook" homepage, while leaving the existing funnel, admin dashboard, and
brand untouched.

---

## Summary

Add a new, independent storefront surface at the site root (`/`, route
group `(store)`) that lets customers browse 4 categories and many
products (including an all-products listing at `/products`), add several
products to a cart, and check out in one order with multiple line items.
The existing single-product funnel (`(landing)` route group, `/[slug]`)
and the admin dashboard are **not modified in behavior** — only
additively extended where the two surfaces must share data (products,
categories, orders).

The storefront homepage implements the user's "Dynamic Lookbook" brief:
a dark, immersive hero where a large blurred radial glow and the CTA
button's tint smoothly re-color to match the currently-selected featured
product's `theme_color`, switched via a thumbnail row, using CSS
transitions driven by React state (no new animation dependency).

Data model changes are additive only: two new nullable/defaulted columns
on `products` (`theme_color`, `is_featured`) and one new table
(`order_items`) that supplements — never replaces — the existing
`orders.product_id`/`quantity` columns, so every existing read path
(`OrdersTable`, orders analytics, n8n webhooks, the funnel's own order
creation) keeps working unchanged.

## Key Finding — RESOLVED (2026-07-22)

`src/app/(landing)/page.tsx` (the root `/` page) was deleted in commit
`afc551f` ("restructure landing page and admin routes"); until this
feature ships, `/` returns Next.js's framework 404 and only `/[slug]`
serves a product funnel. **User decision: `/` becomes the store
homepage.** The `(store)` route group owns the site root —
`(store)/page.tsx` renders the Dynamic Lookbook homepage at `/`. No route
conflict exists (no other group defines `/`), and `(landing)/[slug]`
keeps serving the funnel at `/{slug}` unchanged.

## Constraints (must NOT change)

- `src/app/(landing)/**` — layout, `[slug]/page.tsx`, `privacy/page.tsx`,
  and every `src/components/landing/*` component — zero behavior change.
  No header/footer, RTL-only, dark bg, Cairo font, single-product-per-page
  funnel semantics stay exactly as they are.
- `src/app/(admin)/admin/**` — dashboard stays fully functional; any admin
  additions (theme color picker, featured toggle) are additive fields on
  existing forms, not structural rewrites.
- Current brand tokens in `src/app/globals.css` (`--color-brand-*` cyan
  scale, `--color-dark-*`, neumorphic/glass/float/pulse-glow utilities)
  are the base identity. Per-product `theme_color` is a *variable layer on
  top*, not a palette replacement.
- `orders.product_id` + `orders.quantity` remain valid and populated for
  single-product funnel orders. No column is dropped or renamed.
- No new runtime dependency unless justified (Constitution V — reuse
  existing primitives). See the framer-motion decision below.
- Layered architecture (Constitution I): Repository → Service → API route
  → `*.api.ts` → `*.hooks.ts` → components, for every new piece of data
  access. No Supabase/service/repository imports in client components.
- `npx tsc --noEmit` and `npm run build` pass at the end of every phase.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 16 (App Router,
Turbopack), Tailwind CSS v4
**Primary Dependencies**: existing stack only — `@reduxjs/toolkit`,
`react-redux`, `@supabase/supabase-js`, `embla-carousel-react`,
`lucide-react`. **No new dependency added** (see Animation Strategy).
**Storage**: Supabase Postgres — additive migrations only (see Data Model).
**Testing**: `npx tsc --noEmit`, `npm run build`, manual QA (desktop/mobile,
RTL, both funnel and store surfaces).
**Target Platform**: Web — new route group `(store)` owning the site root
`/` and the store routes below.
**Constraints**: zero behavior change to `(landing)` and `(admin)`; every
new admin-facing form field uses logical CSS properties per Constitution
III; `order_items` must be purely additive per the backwards-compat
section below.
**Scale/Scope**: 4 categories, target ~20–40 seeded demo products, 1 new
cart/checkout flow, the `/` Lookbook homepage, and an all-products page.

## Constitution Check

- **I. Layered Architecture**: PASS — every new data path follows
  Repository → Service → API route → RTK Query → hooks → components (see
  File Inventory). Cart itself is pure client Redux state (no server
  round-trip needed until checkout), which is consistent with the pattern
  since it introduces no Supabase access on the client.
- **II. TypeScript Strict**: PASS — planned; verified per phase.
- **III. RTL/i18n**: the storefront is Arabic-only RTL like the existing
  funnel (not bilingual like admin), so Principle III's *logical
  properties* rule still applies (no physical `ml-*`/`mr-*`/etc. in new
  store components), but the *dictionary/t(key) i18n* requirement is
  admin-specific and does not apply to `(store)` — mirrors how `(landing)`
  is already exempt (hardcoded Arabic strings are the norm there).
- **IV. No Business Logic in Components**: PASS — cart totals, theme-color
  derivation, and order submission logic live in hooks/services, not JSX.
- **V. Reuse Existing Primitives**: PASS — reuses `.float`, `.glass-dark`,
  `.pulse-glow`, `transition-colors`, `embla-carousel-react` (already a
  dependency, used by the funnel's gallery) instead of adding
  framer-motion; reuses `categories`/`products` repositories rather than
  building a parallel catalog system.
- **VI. State Machine / Factory**: PASS — no change to
  `orderStateMachine.ts` or `shipping.factory.ts`; cart checkout produces a
  normal `orders` row that flows through the existing state machine
  untouched. `order_items` is a line-item annex, not a new status concept.

No violations.

---

## Route Architecture Decision

**Decision (user-confirmed 2026-07-22)**: a new root-layout route group
`src/app/(store)/` that owns the site root `/`.

```
/                          NEW — Dynamic Lookbook storefront homepage
/products                  NEW — all products across all 4 categories
/category/[slug]           NEW — category listing/grid
/product/[slug]            NEW — store product detail (add-to-cart, not direct-buy)
/cart                      NEW — cart review page
/checkout                  NEW — multi-item checkout (address + payment-on-delivery)
/[slug]                    (landing) — untouched, single-product funnel
/privacy                   (landing) — untouched
/admin/*                   (admin) — untouched
```

**Why a sibling root layout, not a shared one**: this codebase already has
*no* `src/app/layout.tsx` — `(landing)/layout.tsx` and
`(admin)/admin/layout.tsx` are each independent root layouts, each
rendering their own `<html>`/`<body>` (Next.js's documented "multiple root
layouts" pattern for route groups with disjoint chrome/fonts/direction
needs). `(store)/layout.tsx` follows the exact same precedent — it is not
a workaround, it's the file already used twice in this repo. `/` belongs
to `(store)` with no conflict: no route group defines a root page today
(the old `(landing)/page.tsx` was deleted in `afc551f`).

**Static vs dynamic precedence — reserved slugs**: the store's
single-segment static routes (`/products`, `/cart`, `/checkout`) and the
existing `/privacy` + `/admin` always win over `(landing)/[slug]`
(Next.js matches static segments before dynamic ones). Consequence: a
product whose slug is `products`, `category`, `product`, `cart`,
`checkout`, `privacy`, or `admin` would have its funnel page shadowed.
Mitigation: reserved-slug validation in `products.service.ts`'s
create/update path (Phase 0) — cheap insurance, no schema change.

**Why `/product/[slug]` does not collide with `/[slug]`**: these are
different route trees (`(landing)/[slug]` vs `(store)/product/[slug]`)
serving the same underlying `products` row for two different intents —
`/[slug]` is the high-conversion single-product funnel (buy now, no
browsing chrome), `/product/[slug]` is a browsable catalog page with site
chrome and "add to cart." A product can be linked from ads as `/{slug}`
(funnel) and discovered organically as `/product/{slug}` (store)
simultaneously. State this explicitly in any follow-up spec so it never
reads as an accidental duplicate route.

**Why not nest the store under `(landing)`**: `(landing)`'s layout hard-codes
no-chrome, single-product semantics (`AGENTS.md` explicitly documents "NO
header/footer"). Reusing it would require conditional chrome logic inside
a layout that today has none — riskier than a parallel route group and
harder to guarantee zero regression on the funnel.

---

## Data Model & Migrations

### Current state (verified against `src/features/shared/types.ts` and
`database/schema.sql`)

- `products` already has `category_id` (FK to `categories.id`) — **category
  assignment already exists**, both in the schema and in
  `ProductForm.tsx` (`handleParentChange`/`handleSubChange`). No migration
  needed for category assignment itself.
- `categories` already supports a tree (`parent_id`), `is_active`,
  `sort_order`, `image` — the admin `/admin/categories` CRUD is complete
  and reusable as-is for storefront category tiles.
- `orders` has a single nullable `product_id` + `quantity` + `total_price`
  — no concept of multiple line items.
- No `theme_color` or `is_featured` column exists on `products` today.
- `database/schema.sql` in the repo is stale (predates `category_id` and
  `quantity_prices`, per `AGENTS.md`'s own migration note) — treat it as
  historical reference, not the live schema; apply migrations via the
  Supabase SQL editor / MCP `apply_migration`, matching how
  `quantity_prices` was added.

### New migrations (additive, backwards-compatible)

```sql
-- 007-a: Dynamic Lookbook fields on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS theme_color TEXT NOT NULL DEFAULT '#06b6d4',
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

-- Optional: cap featured products so the homepage thumbnail row (3-4 items)
-- doesn't silently grow unbounded. Enforce in CategoryService/ProductService
-- validation instead of a DB constraint, to keep this migration reversible.
```

```sql
-- 007-b: order_items — additive line-item table for multi-product carts.
-- orders.product_id / orders.quantity are KEPT for backwards compatibility
-- with the existing single-product funnel, which continues writing them
-- exactly as it does today and never touches order_items.
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all order items"
ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
);
```

### Backwards-compatibility rule (the linchpin of this whole plan)

Every consumer of order line-item data — `OrdersTable`, orders analytics,
n8n notification payloads, `OrderRepository.getAllOrders()` etc. — reads
with a **read-fallback**:

> If the order has rows in `order_items`, treat those as the line items
> (multi-product cart order). If it has none, fall back to the legacy
> `product_id` + `quantity` + `product` join (single-product funnel
> order) — exactly what happens today.

This is implemented once, in `OrderRepository`/`OrderService` (see File
Inventory), as an added `items: OrderItem[]` field on `OrderWithDetails`
that is populated from `order_items` when present and synthesized as a
single-entry array from `product_id`/`quantity` when absent. Existing
components that only read `order.product`/`order.quantity` (funnel-created
orders) need **zero changes** — this is purely additive on the type and on
the repository's select statement.

### Type changes (`src/features/shared/types.ts` — MODIFY, additive only)

```ts
export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product?: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

// Product gains:
//   theme_color: string;       // hex, e.g. "#06b6d4" — Lookbook accent
//   is_featured: boolean;      // hero-eligible on the store homepage

// OrderWithDetails gains:
//   items: OrderItem[];        // always populated (fallback-synthesized for legacy orders)

// CreateOrderInput gains an optional multi-item shape:
//   items?: Array<{ product_id: string; quantity: number }>;
// When `items` is present, the API route/service creates order_items rows
// instead of (not in addition to) the single product_id/quantity path.

// N8nOrderNotification gains (user decision 2026-07-22):
//   items: Array<{ productName: string; quantity: number;
//                  unitPrice: number; totalPrice: number }>;
// ALWAYS populated — a legacy funnel order sends an array of exactly one
// item; a cart order sends N. Existing top-level productName/quantity
// stay populated (from the first item) so the current n8n workflow keeps
// working until it's updated to read items[].
```

---

## Store Homepage — "Dynamic Lookbook" Design

Translating the brief into concrete tokens/components already in this
codebase (`src/app/globals.css`), keeping 7alm's cyan brand as the fixed
identity and `theme_color` as the only variable layer:

| Brief element | 7alm implementation |
|---|---|
| True dark base | `bg-dark-900` (`--color-dark-900: #0f172a`) page background, `bg-dark-950` for deepest panels — already defined, reused from the admin's dark palette, not invented. |
| Persistent brand color | Logo, nav links, cart icon stay `--color-brand-500` (`#06b6d4`) / `--color-brand-400` — the fixed identity layer, never overridden by `theme_color`. |
| Dynamic accent (`themeColor`) | `products.theme_color` (hex) drives **only**: (1) the hero glow's `background-color`, (2) the CTA button's background/ring, (3) an underline/highlight on the eyebrow text. Applied via inline `style={{ backgroundColor: activeItem.theme_color }}` — Tailwind can't do arbitrary runtime colors via class names, so this one element intentionally uses inline style, same as any React app would; everything else stays token-driven Tailwind classes. |
| Radial glow behind product image | New `.lookbook-glow` utility in `globals.css`: `absolute` positioned div, `blur-3xl`, `opacity-25`, `rounded-full`, sized ~600px, `transition-colors duration-500`; color set via inline style from `activeItem.theme_color`. |
| Navbar glassmorphism | Reuses the **existing** `.glass-dark` utility (`rgba(0,0,0,0.3)` + `backdrop-blur(20px)`) — already defined in `globals.css`, not a new pattern. Transparent (no class) at scroll-top, `.glass-dark` applied once `window.scrollY > threshold` (tracked in a hook, see below). |
| Hero split layout | `LookbookHero.tsx`: two-column grid (`grid grid-cols-1 lg:grid-cols-2`), content column first in RTL DOM order (eyebrow, `text-6xl`/`text-7xl` headline in `--font-heading` Cairo, description, CTA), showcase column with the glow + floating product image. |
| Floating product image | Reuses the **existing** `.float` keyframe utility (`translateY`, 6s ease-in-out infinite) — already defined in `globals.css`, exactly matches the brief's 5–6s ask. |
| Thumbnail row | `ProductThumbRow.tsx` — 3–4 `is_featured` products below the content column; `onClick` sets `activeItem` in the parent page's state. |
| Crossfade+scale morph on switch | CSS-only: the showcase image wrapper gets `transition-[opacity,transform] duration-300` and a `key={activeItem.id}`-remounted inner `<img>` with an `animate-in`-style enter class (a new short `lookbook-morph` keyframe: opacity 0→1 + scale 0.96→1, 350ms) — modeled directly on the existing `.animate-in`/`fade-in-up` pattern already in `globals.css`, not a new animation system. |
| Smooth color transitions | `transition-colors duration-500` (Tailwind utility, already used elsewhere in the codebase) on the glow, CTA, and highlight elements. |

### Animation strategy: CSS-first, no framer-motion

`package.json` has **no `framer-motion` dependency today**. Recommendation:
**do not add it.** Every animation the brief asks for — infinite float,
color-morph transitions, a 300–500ms crossfade+scale on thumbnail switch —
is achievable with Tailwind transition utilities + 2 new small `@keyframes`
blocks in `globals.css`, following the exact pattern already established
by `.float`, `.pulse-glow`, and `.animate-in`. This satisfies Constitution
V (reuse over new dependencies) and avoids a ~50KB+ client bundle addition
for a homepage.

The one case where framer-motion would genuinely earn its cost: if the
crossfade+scale needs *orchestrated sequencing* (e.g., old image scales
down and fades out completely before the new one scales in, with spring
physics) rather than a simple simultaneous cross-fade. If manual QA of the
CSS-only version feels visually clunky, revisit — but start CSS-only and
only add the dependency if a concrete implementation attempt falls short.

### Typography

- Arabic headings: keep `--font-heading` (Cairo) — do not replace with
  Space Grotesk. Cairo already has the weight range (400–900) the brief
  wants for "massive headline" impact.
- Arabic body: keep `--font-sans` (`Inter, Noto Sans Arabic, system-ui`).
- Latin/numerals-only accents (price figures formatted with `tabular-nums`,
  a small "NEW" or SKU badge, if any): optionally load **Space Grotesk**
  scoped via a `font-display-latin` utility applied only to those isolated
  Latin/numeral spans — never to Arabic text, never to the primary
  headline. Treat this as a nice-to-have, not required; the primary
  headline stays Cairo either way. Recommend skipping Space Grotesk
  entirely unless the user specifically wants a Latin-numeral accent —
  it's one more Google Fonts request for a marginal effect.

### Component inventory (new)

- `src/components/store/StoreNavbar.tsx` — transparent→glass floating top
  bar; logo, nav links (categories), cart icon with item-count badge.
- `src/components/store/LookbookHero.tsx` — hero split layout container;
  owns `activeItem` state (or receives it from the page if
  `ProductThumbRow` lives outside the hero visually but must stay in sync).
- `src/components/store/LookbookGlow.tsx` — the radial blurred background
  glow; pure presentational, takes `color: string`.
- `src/components/store/ProductThumbRow.tsx` — 3–4 thumbnails; `onSelect`
  callback.
- `src/components/store/CategoryGrid.tsx` — 4-tile category grid section
  below the hero, using `Category.image`.
- `src/components/store/ProductCard.tsx` — grid/listing card (image, name,
  price, compare-at-price, quick add-to-cart button).
- `src/components/store/ProductGrid.tsx` — responsive grid + empty/loading
  states for category and search-ish listing pages.
- `src/components/store/CartDrawer.tsx` — slide-over cart summary
  triggered from `StoreNavbar`'s cart icon.
- `src/components/store/CartLineItem.tsx` — single cart row (qty stepper,
  remove).
- `src/components/store/StoreCheckoutForm.tsx` — multi-item checkout form;
  visually modeled on `src/components/landing/CheckoutForm.tsx` but posts
  `items[]` instead of a single `product_id`.
- `src/components/store/StoreFooter.tsx` — a store-specific footer (kept
  separate from `src/components/landing/Footer.tsx` so the funnel's footer
  can evolve independently — do not share the component across surfaces).

---

## Cart State Approach

**Recommendation: client-side Redux slice + localStorage persistence.
Not a server cart.**

Rationale: 7alm has no customer accounts — `customers` rows are
found-or-created at checkout time by phone number
(`src/features/customers/customers.service.ts`), matching a COD
funnel-style store, not an authenticated e-commerce account model. A
server cart needs a session/identity to hang state on; none exists before
checkout. A client cart needs none.

Model it directly on `src/features/auth/auth.slice.ts`'s hydrate/persist
pattern (same repo, same conventions, already TypeScript-strict and
tested):

- `src/features/cart/cart.slice.ts` — `CartItem { product_id, name, slug,
  main_image, price, quantity, theme_color? }`; reducers `hydrateCart`,
  `addItem`, `removeItem`, `updateQuantity`, `clearCart`; persists to
  `localStorage` (`7alm_cart` key) on every mutating reducer, mirroring
  `auth.slice.ts`'s `TOKEN_KEY`/`USER_KEY` writes.
- `src/features/cart/cart.hooks.ts` — `useCart()`: selectors (items,
  itemCount, subtotal) + bound action dispatchers; no business logic in
  components.
- Register `cart` reducer in `src/lib/redux/store.ts` (plain slice, like
  `auth` — not an RTK Query API, since there's no server round-trip until
  checkout).
- At checkout, `StoreCheckoutForm` (via a new `useCartCheckoutForm` hook in
  `cart.hooks.ts`, modeled on `useCheckoutForm` in
  `src/features/checkout/checkout.hooks.ts`) submits the cart's items as
  `CreateOrderInput.items[]` to `POST /api/orders`, then calls
  `clearCart()` on success.

---

## RTL / Arabic Considerations

- `(store)/layout.tsx` renders `<html lang="ar" dir="rtl">`, matching
  `(landing)`. The storefront is Arabic-only RTL, not bilingual — no
  `useLocale()`/dictionary requirement (that's admin-specific).
- All new store components use logical properties exclusively (`ms-*`,
  `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`) —
  Constitution III applies to any `dir="rtl"`-capable surface, not just
  admin.
- The hero's "content column first" in the brief's LTR mental model means,
  in RTL, the content column sits on the **inline-start** side (visually
  right in RTL) and the showcase/image column on **inline-end** — express
  this with `grid-cols-1 lg:grid-cols-2` and let logical order follow DOM
  order (content markup first) rather than hardcoding `lg:order-1`/`-2`
  with physical assumptions.
- Icons implying direction (cart icon arrow, chevrons in category nav) —
  mirror per Constitution III if directional; a plain cart bag icon
  (`lucide-react`'s `ShoppingBag`) has no direction, no mirroring needed.
- Product thumbnail row and category grid scroll/order should read
  right-to-left naturally from `dir="rtl"` — verify with a manual RTL pass
  in Phase 2/3 QA, since this is exactly the kind of thing that "looks
  fine in the design tool" and breaks in the browser.

---

## Feature-Layer File Inventory

Legend: **NEW** = new file, **MODIFY** = additive change to an existing
file (per the constraints, never a behavior change for existing callers).

### Data layer

| File | Change | Purpose |
|---|---|---|
| `src/features/shared/types.ts` | MODIFY | Add `OrderItem`; extend `Product` (`theme_color`, `is_featured`), `OrderWithDetails` (`items`), `CreateOrderInput` (`items?`). |
| `src/features/products/products.repository.ts` | MODIFY | Add `getActiveProductsByCategory(categoryId)`, `getFeaturedProducts()`, `getAllActiveProducts(filters)` — additive methods, existing methods untouched. |
| `src/features/products/products.service.ts` | MODIFY | Add corresponding service methods; add `validateThemeColor()` (hex format) for admin save path. |
| `src/features/orders/orders.repository.ts` | MODIFY | `createOrderItems(orderId, items[])`; extend `getAllOrders`/`getOrderById`/`getPendingOrders` select strings to also join `order_items(*, product:products(*))`; map into `OrderWithDetails.items` with the read-fallback rule. |
| `src/features/orders/orders.service.ts` | MODIFY | Add `processCartOrder(input: CreateOrderInput)` — branches on `input.items` presence; delegates to existing single-product path when absent (zero change to that path's code). |
| `src/features/categories/categories.repository.ts` | none | Already sufficient (`getActiveCategories()` reused as-is for storefront). |

### API routes

| File | Change | Purpose |
|---|---|---|
| `src/app/api/products/route.ts` | NEW | Public `GET` — list active products with `?category=<slug>`, `?featured=true` query params. Modeled on `src/app/api/products/active/route.ts` / `src/app/api/categories/route.ts` (no auth, thin try/catch → service). |
| `src/app/api/orders/route.ts` | MODIFY | `POST` accepts either legacy `{ product_id, quantity }` or new `{ items: [...] }`; delegates to `orderService.processCartOrder`. Existing funnel callers sending the legacy shape are unaffected. |

### Client state (RTK Query + Redux)

| File | Change | Purpose |
|---|---|---|
| `src/features/store/store.api.ts` | NEW | RTK Query: `getStoreProducts(filters)`, `getFeaturedProducts()`, `getStoreCategories()` (thin wrapper over the existing public `categoriesApi`-style pattern, or reuses `categoriesApi.getCategories` directly — decide during Phase 1 based on whether a public/admin split is worth a second endpoint). |
| `src/features/cart/cart.slice.ts` | NEW | Cart Redux slice — see Cart State Approach. |
| `src/lib/redux/store.ts` | MODIFY | Register `cart` reducer and `storeApi` reducer/middleware, same pattern as the existing 6 registrations. |

### Hooks

| File | Change | Purpose |
|---|---|---|
| `src/features/cart/cart.hooks.ts` | NEW | `useCart()` (selectors + actions), `useCartCheckoutForm()` (submit cart → `POST /api/orders`, then clear). |
| `src/features/store/store.hooks.ts` | NEW | `useLookbookActiveItem(featuredProducts)` — owns `activeItem` state + setter used by hero/thumb-row; `useScrollGlass(threshold?)` — returns boolean for navbar glass toggle. |

### Admin additions

| File | Change | Purpose |
|---|---|---|
| `src/components/admin/products/ProductForm.tsx` | MODIFY | Add a `theme_color` color-picker field (native `<input type="color">` + hex text input, styled with existing `neu-input` utility) and an `is_featured` toggle (reuse existing toggle/checkbox pattern already in the form). Purely additive form fields — existing fields/handlers untouched. |
| `src/features/products/products.api.ts` | MODIFY | Extend `ProductInput` type (or equivalent) to include `theme_color`, `is_featured` in the create/update mutation body. |

### Store pages & components

| File | Change | Purpose |
|---|---|---|
| `src/app/(store)/layout.tsx` | NEW | Root layout for the store surface — own `<html dir="rtl" lang="ar">`, Cairo/Inter fonts, dark bg, `ReduxProvider`. |
| `src/app/(store)/page.tsx` | NEW | Lookbook homepage at `/` — fetches featured products + categories server-side, renders `LookbookHero` + `CategoryGrid`. |
| `src/app/(store)/products/page.tsx` | NEW | All-products page — every active product across all 4 categories, grouped by category section (reuses `ProductGrid`). |
| `src/app/(store)/category/[slug]/page.tsx` | NEW | Category listing — `ProductGrid` filtered by category slug. |
| `src/app/(store)/product/[slug]/page.tsx` | NEW | Store product detail — gallery, price, "add to cart" (not "buy now"). |
| `src/app/(store)/cart/page.tsx` | NEW | Full cart review page (in addition to the `CartDrawer` quick-view). |
| `src/app/(store)/checkout/page.tsx` | NEW | Multi-item checkout — `StoreCheckoutForm`. |
| `src/components/store/*.tsx` | NEW (10 files) | See Component Inventory above. |

---

## Seed Data — 4 Categories

`database/schema.sql` has no category seed data today (categories were
added after the schema file was last updated). Proposed 4 categories,
chosen to fit 7alm's existing general-Arabic-COD-store positioning (the
brief's desk-accessory examples are folded into category 2 as a plausible
subset, not adopted wholesale — a general store selling only monitor
stands and mechanical keyboards would be a narrower pivot than "expand to
B2C storefront" implies):

1. **إلكترونيات وإكسسوارات** (`electronics-accessories`) — gadgets, phone
   accessories, chargers.
2. **المنزل والمكتب** (`home-office`) — desk accessories (monitor stands,
   desk mats, keyboards — the brief's literal examples fit here), home
   organization.
3. **الجمال والعناية الشخصية** (`beauty-personal-care`) — skincare,
   grooming tools.
4. **الرياضة واللياقة** (`sports-fitness`) — fitness accessories, sports
   gear.

**User-confirmed (2026-07-22)**: the 4 categories above are approved
as-is. The single existing demo product (currently generically named
"منتج حلم") belongs in `electronics-accessories` — the user will rename
it to its real mobile/electronics product name; the seed only sets its
`category_id`. Seed ~5–10 demo products per category (20–40 total) with
placeholder images, a spread of prices, `theme_color` values drawn from a
small curated palette (complementary to but distinct from brand cyan —
e.g. amber, rose, violet, emerald), and 3–4 marked `is_featured` for the
homepage hero.

---

## Phased Implementation Order

Each phase leaves the app in a shippable, `tsc`/`build`-clean state.

**Phase 0 — Schema + admin groundwork (non-breaking)**
- Apply migrations 007-a (`theme_color`, `is_featured`) and 007-b
  (`order_items`).
- `shared/types.ts` additions (incl. `N8nOrderNotification.items[]`).
- `ProductForm.tsx` additive fields (color picker, featured toggle).
- Reserved-slug validation in `products.service.ts` (reject `products`,
  `category`, `product`, `cart`, `checkout`, `privacy`, `admin`).
- Verify: `npx tsc --noEmit`, `npm run build`, existing admin product
  CRUD + existing funnel still work manually.

**Phase 1 — Storefront read layer (no UI yet)**
- `products.repository.ts`/`products.service.ts` additive methods.
- `GET /api/products` (public, filtered).
- `src/features/store/store.api.ts`, `store.hooks.ts`.
- Verify: hit the new endpoint directly (curl/Postman-equivalent), confirm
  shape; `tsc`/`build` green.

**Phase 2 — Lookbook homepage at `/`**
- `(store)/layout.tsx`, `(store)/page.tsx` (the site root).
- `LookbookHero`, `LookbookGlow`, `ProductThumbRow`, `StoreNavbar`,
  `CategoryGrid` components; new `globals.css` keyframes
  (`lookbook-morph`) and `.lookbook-glow` utility (additive CSS, no
  existing rule touched).
- Verify: manual RTL/visual QA on `/`; `tsc`/`build` green; confirm
  `/[slug]` and `/privacy` render identically to pre-change (regression
  check).

**Phase 3 — Category & product browsing**
- `ProductCard`, `ProductGrid`, `(store)/category/[slug]/page.tsx`,
  `(store)/product/[slug]/page.tsx`.
- `(store)/products/page.tsx` — all products across all 4 categories,
  grouped by category sections (reuses `ProductGrid` per section).
- Verify: category filtering correctness; empty-category state;
  `/products` shows every active product; `tsc`/`build` green.

**Phase 4 — Cart + multi-item checkout**
- `cart.slice.ts`, `cart.hooks.ts`, register in `store.ts`.
- `CartDrawer`, `CartLineItem`, `(store)/cart/page.tsx`.
- `orders.repository.ts`/`orders.service.ts` additive methods
  (`createOrderItems`, `processCartOrder`) + `order_items` read-fallback
  in `getAllOrders`/`getOrderById`.
- n8n payload: always build `items: [...]` (one element for legacy funnel
  orders, N for cart orders); keep top-level `productName`/`quantity`
  populated from the first item; coordinate the external n8n workflow
  update to consume `items[]`.
- `POST /api/orders` MODIFY to branch on `items[]`.
- `StoreCheckoutForm`, `(store)/checkout/page.tsx`.
- Verify: place a legacy single-product funnel order (still creates
  `orders` row with `product_id`/`quantity`, no `order_items` rows,
  `OrdersTable` renders it correctly) **and** a new cart order (creates
  `orders` + N `order_items` rows, `OrdersTable`/admin order detail
  renders both items via the read-fallback) side by side; `tsc`/`build`
  green.

**Phase 5 — Seed data (categories confirmed 2026-07-22)**
- Insert the 4 confirmed categories + 20–40 demo products via Supabase SQL
  editor or MCP `apply_migration`/`execute_sql`; assign the existing demo
  product to `electronics-accessories`.
- Verify: `/` renders a populated, visually complete Lookbook homepage;
  `/products` and all 4 category pages have products; final full
  regression pass on `(landing)` and `(admin)`.

---

## Risks / Open Questions

1. **RESOLVED (2026-07-22) — `/` is the store homepage.** The user chose
   to make `/` the Lookbook storefront home; see Route Architecture
   Decision.
2. **RESOLVED (2026-07-22) — n8n payload goes multi-item.**
   `N8nOrderNotification` gains an `items: [...]` array that is ALWAYS
   populated — a legacy single-product funnel order sends an array of
   exactly one item, a cart order sends N items. Existing top-level
   `productName`/`quantity` stay populated (from the first item) during
   the transition so the current n8n workflow keeps working; the external
   n8n workflow should be updated to read `items[]` alongside Phase 4.
3. **RESOLVED (2026-07-22) — categories confirmed.** The 4 proposed
   categories ship as-is. The existing demo product belongs in
   `electronics-accessories` (the user will rename it to its real
   mobile/electronics name); seed copy/photography stays placeholder
   quality until real catalog data exists.
4. **Featured-product count isn't DB-constrained** — Phase 0 leaves
   `is_featured` uncapped; if more than ~4–5 products get flagged, the
   homepage thumbnail row needs a `.slice()`/pagination decision in
   `store.hooks.ts` rather than a schema constraint (kept reversible).
5. **`theme_color` contrast on dark background** — an admin could pick a
   color with poor contrast against `--color-dark-900`. Recommend a
   curated preset swatch list in the color-picker UI (Phase 0) rather than
   a fully free-form picker, to keep the Lookbook visually cohesive
   without adding contrast-checking logic.
6. **CSS-only animation may need revisiting** — if the crossfade+scale
   morph reads as visually inferior to a framer-motion implementation
   during Phase 2 QA, that's the point to reconsider adding the
   dependency, not before.
7. **Reserved slugs can shadow funnel pages** — the store's static
   single-segment routes take precedence over `(landing)/[slug]`;
   mitigated by the Phase 0 reserved-slug validation (see Route
   Architecture Decision).

## Verification Steps (every phase)

```bash
npx tsc --noEmit   # must pass, zero `any` escape hatches
npm run build      # must succeed
```

Manual regression checklist (Phase 2 onward, since that's when new routes
first render):
- [ ] `/` renders the Lookbook storefront homepage (user decision
      2026-07-22 — it no longer 404s).
- [ ] `/[slug]` for the existing seeded product still renders identically
      — no header/footer, RTL, dark bg, Cairo font, direct-buy CTA.
- [ ] `/admin/*` — login, product CRUD (including new `theme_color`/
      `is_featured` fields), category CRUD, orders table all function.
- [ ] `/` hero: thumbnail click morphs glow/CTA/highlight color within
      ~300–500ms; floating product image animates continuously; navbar
      turns glassy on scroll.
- [ ] `/products` lists every active product across all 4 categories,
      grouped by category.
- [ ] `/category/[slug]` for each of the 4 categories shows the right
      products.
- [ ] Add 2+ different products to cart, checkout, confirm one `orders`
      row + N `order_items` rows in Supabase, and that the admin orders
      table renders the multi-item order correctly.
- [ ] Legacy single-product order (via `/[slug]`) still creates an
      `orders` row with `product_id`/`quantity` populated and zero
      `order_items` rows, rendering correctly in the admin orders table.
- [ ] n8n notification payload always carries `items: [...]` — one element
      for a funnel order, N elements for a cart order — with legacy
      top-level `productName`/`quantity` still populated.
- [ ] Reserved-slug validation rejects creating a product with slug
      `products`, `category`, `product`, `cart`, `checkout`, `privacy`,
      or `admin`.
- [ ] RTL pass on all new store pages — no physical-direction utilities,
      no mirrored-icon regressions.
