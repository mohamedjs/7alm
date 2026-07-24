# Spec: Commerce Growth Phase — Reviews, Review-Request Automation, Coupons, Search

> Status: Approved for implementation · Author: CTO (Opus) · Date: 2026-07-24
> Additive only. Social auto-publish/inbox is DEFERRED (needs real dev apps) — not in this spec.

Four workstreams, built in this order. Conflict boundary is by LAYER, so delegation is:
**@backend** (all migrations/types/repos/services/routes) → then **@frontend** (all UI/i18n/store)
and **@n8n** (automation JSON) in parallel.

Locked product decisions:
- **Reviews: verified buyers only** — a customer may review a product only if they have a
  **delivered** order containing it; **admin-moderated** (hidden until approved).
- **Review-request automation kept**; abandoned-cart dropped.
- **Coupons:** percentage, fixed-amount, free-shipping, plus **per-customer / first-order** usage limits.
- **Storefront product search.**

Repo conventions (mirror exactly): 4-layer (`*.repository.ts`→`*.service.ts`→API route→`*.api.ts`→
`*.hooks.ts`); API envelope `{ success, data?, error? }`; admin auth via `verifyAdmin`/`extractToken`
(`src/lib/auth.ts`); factory template `shipping.factory.ts`; env read LAZILY (never at module import);
RTL + logical CSS props only + theme-aware + all strings via `t()` (dictionary.ts, ar+en); no Supabase
in client. HMAC-token pattern already exists in `social.service.ts` (state signing) — reuse that style.

---

## Workstream 1 — Product Reviews (verified buyers, moderated)

### DB — `product_reviews`
```sql
CREATE TABLE IF NOT EXISTS product_reviews (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id  uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id     uuid REFERENCES orders(id) ON DELETE SET NULL,   -- the delivered order that authorized it
  rating       smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title        text,
  body         text,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, customer_id)   -- one review per customer per product
);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_status
  ON product_reviews (product_id, status);
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;  -- service-role only
```

### Verified-buyer token
- `reviews.service.ts` signs a token (HMAC-SHA256, reuse the `social.service.ts` signing style, keyed by
  a new lazily-read env `REVIEW_TOKEN_SECRET` — fall back to `SOCIAL_TOKEN_ENCRYPTION_KEY` if unset)
  over `{ customerId, productId, orderId, exp }` (e.g. 30-day TTL).
- The **review page link** is `{STORE_BASE}/review/{token}` (STORE base = `SOCIAL_OAUTH_REDIRECT_BASE`
  or a new `STORE_BASE_URL`, lazily read). The token is what makes the web review "verified" without a login.
- `verifyReviewToken(token)` → payload or throws. Also a fallback path: a logged-in-less public submit
  MUST require a valid token OR (customerId resolved from token) — never trust a raw customerId from the client.

### Backend files
- `src/features/reviews/reviews.repository.ts` — `createReview`, `getApprovedByProduct(productId)`,
  `getAggregate(productId)` → `{ average: number; count: number }`, `getAllForModeration(status?)`,
  `setStatus(id, status)`, `hasDeliveredOrder(customerId, productId)` (guard), `existsForCustomerProduct`.
- `src/features/reviews/reviews.service.ts` — `issueReviewToken(customerId, productId, orderId)`,
  `verifyReviewToken`, `submitReview({ token, rating, title, body })` (verify token → assert delivered
  order via repo → **INSERT-ONLY** a `pending` review; on unique-violation (product_id, customer_id)
  return a friendly "already reviewed" — **NEVER upsert/update an existing row**: a resubmit must not
  downgrade an already-approved/rejected review back to pending or overwrite it),
  `listForModeration`, `moderate(id, 'approved'|'rejected')`, `getProductReviews(productId)` (approved +
  aggregate), plus `buildReviewUrl(token)`.
- Types (add to `shared/types.ts`): `ProductReview`, `ReviewStatus`, `ReviewAggregate`,
  `SubmitReviewInput`, `ProductReviewPublic` (id, rating, title, body, author display name, created_at —
  NO customer_id/phone leaked; author name = customer first name or "زبون").
- Routes:
  - `GET  /api/products/[slug]/reviews` — PUBLIC → approved reviews + aggregate for the product.
  - `POST /api/reviews` — PUBLIC → body `{ token, rating, title?, body? }` → submit (token-gated).
  - `GET  /api/admin/reviews?status=pending` — admin → moderation list.
  - `PATCH /api/admin/reviews/[id]` — admin → `{ status }` approve/reject.

### Frontend
- Product page (`src/app/(store)/product/[slug]/page.tsx` + its components): show **rating summary**
  (avg stars + count) near the price, and a **reviews section** (approved reviews list). Fetch via a new
  RTK query. If a `?review={token}` (or the `/review/{token}` route) is present, render the **submit form**
  (star picker + optional title/body). Keep it a small, self-contained star component (no new deps).
- `src/app/(store)/review/[token]/page.tsx` — dedicated review landing (from the WhatsApp link): resolves
  the token's product, shows the submit form, thanks on success.
- Admin: `src/app/(admin)/admin/reviews/page.tsx` + `ReviewModerationList.tsx` — pending queue with
  Approve/Reject. Nav entry `{ key: "nav.reviews", path: "/admin/reviews" }`.
- RTK: `src/features/reviews/reviews.api.ts` (public `getProductReviews`; admin `getModerationReviews`,
  `moderateReview`; public `submitReview`) + `reviews.hooks.ts`. Register in store.

---

## Workstream 2 — Review-Request Automation (post-delivery WhatsApp)

Reuses the existing `notifyN8n` fire-and-forget path in `orders.service.ts` (already fires on EVERY
status change, including `delivered`).

### Backend change
- Extend `N8nOrderNotification` (shared/types.ts) with an optional `reviewUrl?: string`.
- In `orders.service.ts` `notifyN8n`: when `newStatus === 'delivered'` and the order has a `product_id`,
  generate a verified-review token via `reviewsService.issueReviewToken(customer_id, product_id, order_id)`
  and set `payload.reviewUrl = reviewsService.buildReviewUrl(token)`. (Import reviewsService; keep it
  best-effort — a token failure must not block the notification.)
- **v1 scope note:** for multi-item cart orders, `order.product_id` is only the FIRST item (see the
  `processCartOrder` doc comment), so the review request covers just that primary product. Accepted for v1.

### n8n change (`automation/order-notifications-workflow.json`)
- Add a branch for `newStatus === 'delivered'`: send a WhatsApp template asking the customer to rate the
  product, including `{{ $json.reviewUrl }}`. Mirror the existing status templates + Evolution plugin node
  already in that workflow. If `reviewUrl` is empty, fall back to a generic thank-you (no link).
- Do NOT touch the other status branches or the WhatsApp AI workflow.

---

## Workstream 3 — Coupons / Discount Codes

### DB — `coupons`
```sql
CREATE TABLE IF NOT EXISTS coupons (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code               text NOT NULL UNIQUE,               -- store uppercased; match case-insensitively
  type               text NOT NULL CHECK (type IN ('percentage','fixed','free_shipping')),
  value              numeric NOT NULL DEFAULT 0,          -- percent (0-100) or EGP amount; 0 for free_shipping
  min_order_total    numeric NOT NULL DEFAULT 0,          -- minimum subtotal to qualify
  max_discount       numeric,                             -- optional cap for percentage
  first_order_only   boolean NOT NULL DEFAULT false,
  per_customer_limit integer,                             -- max uses per customer (null = unlimited)
  usage_limit        integer,                             -- global max uses (null = unlimited)
  used_count         integer NOT NULL DEFAULT 0,
  starts_at          timestamptz,
  expires_at         timestamptz,
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (code);
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;  -- service-role only
```
Also track redemptions for per-customer/first-order enforcement:
```sql
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id    uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_customer
  ON coupon_redemptions (coupon_id, customer_id);
```

### Order-column additions (`orders`)
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal        numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code     text;
```
(`total_price` stays the final charged amount; `subtotal` = items pre-discount; shipping unchanged unless
`free_shipping`.)

### Backend files
- `src/features/coupons/coupons.repository.ts` — CRUD, `getByCode(code)` (case-insensitive),
  `countCustomerRedemptions(couponId, customerId)`, `customerHasAnyOrder(customerId)` (for first_order_only),
  `recordRedemption`, `incrementUsedCount`.
- `src/features/coupons/coupons.service.ts`:
  - `validateAndApply({ code, subtotal, shippingCost, customerId })` →
    `{ valid, discountAmount, shippingDiscount, finalShipping, couponId, error? }`. Enforces: active,
    date window, `min_order_total`, `usage_limit`/`used_count`, `per_customer_limit`, `first_order_only`
    (via `customerHasAnyOrder`). Percentage respects `max_discount`. `free_shipping` zeroes shipping.
    **Never** let discount exceed subtotal.
  - `redeem(couponId, customerId, orderId)` — insert redemption + increment used_count (best-effort,
    after the order is created).
  - Admin CRUD passthrough.
- Types: `Coupon`, `CouponType`, `CouponInput`, `CouponValidationResult`. Add optional `coupon_code` to
  `CreateOrderInput`; add `subtotal`/`discount_amount`/`coupon_code` to the `Order` type.
- **Order integration** (`orders.service.ts`, BOTH `processNewOrder` and `processCartOrder`): after
  computing the items subtotal and shipping, if `input.coupon_code` is set, call
  `couponsService.validateAndApply(...)`. On invalid coupon → return `{ success:false, error }` (so the
  customer sees why). On valid → set `subtotal`, `discount_amount`, adjust shipping for free_shipping,
  `total_price = subtotal - discount + finalShipping`, persist `coupon_code`, and after `createOrder`
  call `couponsService.redeem(...)`. Keep the existing tiered-pricing math intact — coupon applies on
  top of the resolved subtotal.
  - **MUST also extend `orderRepository.createOrder`** to accept and INSERT the three new columns
    (`subtotal`, `discount_amount`, `coupon_code`) — the current fixed field set drops them, so without
    this the discount is computed and then lost (columns stay null). Thread them through the params AND
    the Supabase `.insert(...)`.
  - **Coupon invalid at final submit** (e.g. it hit `usage_limit` between preview and submit): **fail
    loud** — return `{ success:false, error }` with a specific message so the customer knows the code is
    no longer valid and can retry without it. (Chosen over silently charging full price.)
- Routes:
  - `POST /api/coupons/validate` — PUBLIC → `{ code, subtotal, shippingCost, phone? }` →
    returns `CouponValidationResult` for live checkout preview. (Resolve customerId from phone if given,
    else validate the customer-independent rules; final authoritative check still happens server-side at
    order creation.)
  - `GET/POST /api/admin/coupons`, `PUT/DELETE /api/admin/coupons/[id]` — admin CRUD (mirror categories).

### Frontend
- Checkout (`CheckoutForm.tsx` and the `(store)` checkout): a **coupon code field** with an Apply button
  that calls `/api/coupons/validate` and shows the discount line + new total (optimistic preview). Pass
  the applied `coupon_code` into the order submission. Handle invalid-coupon errors inline.
- Admin: `src/app/(admin)/admin/coupons/page.tsx` + `CouponList.tsx` + `CouponForm.tsx` (create/edit,
  all fields + type selector). Nav `{ key: "nav.coupons", path: "/admin/coupons" }`.
- RTK `coupons.api.ts` (public `validateCoupon`; admin CRUD) + `coupons.hooks.ts`. Register in store.
- Order detail/summary UI: `OrderDetailsDrawer` **already derives** a discount from `compare_at_price`
  (`baseTotal - total_price`). Now that an explicit `discount_amount`/`coupon_code` exists, **reconcile**
  the two so the drawer shows ONE coherent discount line (prefer the explicit coupon line when present) —
  do not double-count or render two conflicting discount rows.

---

## Workstream 4 — Storefront Product Search

### Backend
- `products.repository.ts`: add `searchActiveProducts(query, limit=20)` — case-insensitive match on
  `name` (and optionally description) via Supabase `.ilike`, active products only, ordered sensibly.
- `products.service.ts`: `search(query)` (trim, min length 2, empty → []).
- Route: `GET /api/products/search?q=...` — PUBLIC → `Product[]` (or a lean `ProductSearchResult` DTO:
  id, name, slug, price, main_image).

### Frontend
- A **search bar** in the store header/nav (find the store layout/header component via ctx_search).
  Debounced input → `/api/products/search` → dropdown/results list linking to `/product/{slug}`.
- Optionally a `/products?q=` results view reusing the existing product grid. Keep it minimal and RTL.
- RTK: add a `searchProducts` query to the existing `store.api.ts` (or `products` client api) — reuse the
  existing store API slice rather than creating a new one if one fits. i18n keys for placeholder/empty/error.

---

## Shared / cross-cutting

- One SQL migration file per workstream under `docs/migrations/` (timestamps), each idempotent
  (`IF NOT EXISTS`). Do NOT apply them — the CTO applies via Supabase MCP after review.
- Register any new realtime needs? Not required for these.
- All new admin nav entries go in the single `navLinks` array in `AdminLayoutClient.tsx`.

## Acceptance criteria (every agent runs these and reports exact output)
- `npx tsc --noEmit` → exit 0. `npm run build` → exit 0 (new routes appear in the manifest).
- Reviews: only delivered-buyer (valid token) can submit; reviews are `pending` until admin approves;
  product page shows only approved + correct aggregate; no customer PII in the public review DTO.
- Coupons: all four behaviors correct; discount never exceeds subtotal; per-customer/first-order/usage
  limits enforced server-side at order creation (not just in the preview endpoint).
- Search: query < 2 chars → empty; results link to the right product; RTL intact.
- RTL + logical props only + theme-aware + all strings via `t()` (ar+en); no Supabase in client;
  env reads lazy; no new npm dependencies.

## Delegation split
- **@backend**: WS1 backend, WS2 backend change (reviewUrl in notifyN8n), WS3 backend + order integration,
  WS4 backend; all migrations + shared types. Do NOT edit client/store/dictionary/nav.
- **@frontend**: WS1/WS3/WS4 UI, admin pages, nav entries, i18n (ar+en), store registration, consuming
  the backend routes + DTOs. Do NOT edit services/repositories/migrations.
- **@n8n**: WS2 workflow branch only (`automation/order-notifications-workflow.json`). No tsc/build gate
  applies to a JSON workflow — verify manually: the file stays valid JSON and the new branch mirrors an
  existing status branch's node wiring + Evolution plugin node.
- Contract = the shared types + route shapes above; @frontend and @n8n build against them.
