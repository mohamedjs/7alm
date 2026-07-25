# Spec: Reviews Showcase — Replace Fake Testimonials with Real Customer Reviews

> Status: Approved for implementation · Author: CTO (Opus) · Date: 2026-07-25
> Source plan: `/home/mohamed/.claude/plans/mellow-wishing-finch.md` (source of truth)
> Destructive: deletes the `testimonials` feature end-to-end, including the DB table.

Sequential delegation — the layers overlap on the same files, so **do not parallelize**:
**@backend** (§1 types/repo/service + §5 all Supabase work) → **@frontend** (§2 carousel, §3 admin
tabs, §4 deletions + dictionary) → `/save-session`.

---

## Context / motivation

The store home page renders `Testimonials.tsx`: a 3-column card grid fed by a hand-curated
`testimonials` table with its own admin CRUD (AR+EN name/role/text/rating). It is **invented social
proof** — nothing ties a row to an actual purchase.

Meanwhile the real review system already exists and is fully wired: `product_reviews` table,
HMAC review-token links pushed over WhatsApp when an order hits `delivered`, a public submit form,
and admin moderation. It has **0 rows** and is surfaced only on product detail pages. So the home
page shows fake praise while genuine reviews have nowhere to appear.

**Outcome:** the home page shows real, admin-approved 4★/5★ reviews in a horizontal carousel with an
honest rating-summary header; `testimonials` is deleted end-to-end including the table; `/admin/reviews`
becomes a browsable list across all statuses so there is still one place to read customer feedback;
and the live DB is seeded with 5 real-shaped reviews so the carousel is not empty on day one.

### Locked decisions
- Display **4★ and 5★ only** in the carousel. The summary average/count is computed over **all**
  approved reviews — honest, not cherry-picked.
- **Horizontal Embla carousel.** `embla-carousel-react` + `embla-carousel-autoplay` are already in
  `package.json` — **no new npm dependencies**.
- **Drop** the `testimonials` table, after backing up its 6 rows to the repo.
- Seed by flipping 4 existing orders to `delivered` and inserting 5 approved reviews.

### Non-goals
- No half-star support (`StarRating` renders whole stars; the average is shown numerically).
- No pagination / "load more" — a fixed `limit: 12` window.
- No per-product filtering or product-scoped carousel on the home page.
- No new API route and no new RTK endpoint — the home page is a server component
  (`export const dynamic = "force-dynamic"`) that calls services directly, exactly as it does today.
- No new DB index (`product_reviews` is small; the existing `idx_product_reviews_product_status`
  simply does not cover the showcase query, and that is fine).
- No change to the review-submission flow, the WhatsApp review-request automation, or moderation
  semantics.

Repo conventions (mirror exactly): 4-layer (`*.repository.ts`→`*.service.ts`→[route]→`*.api.ts`→
`*.hooks.ts`); no Supabase in client; env read lazily; RTL + **logical CSS props only** + theme-aware;
every first-party string through `t()` in `dictionary.ts` (**ar + en**); store UI uses semantic tokens
only (`bg-surface`, `text-text-primary`, `text-text-muted`, `border-border`, `text-brand-500`, `neu-*`).

---

## 1. Backend — extend the reviews domain (server) · @backend

`src/features/reviews/reviews.repository.ts` — two new methods beside the existing
`getApprovedByProduct` / `getAggregate` (same style, same service-role client):

- `getTopApproved({ minRating = 4, limit = 12 })` — `status='approved'` AND `rating >= minRating`,
  `.select("id, rating, title, body, created_at, customer:customers (full_name), product:products (name, slug)")`,
  ordered `created_at desc`, `.limit(limit)`. Returns `[]` on error (existing convention).
- `getGlobalAggregate()` — the same JS-side computation as `getAggregate`, with no `product_id` filter.

`src/features/reviews/reviews.service.ts` — add to `ReviewService`:

- `getShowcaseReviews(opts?: { minRating?: number; limit?: number }): Promise<{ reviews: ShowcaseReview[]; aggregate: ReviewAggregate }>`
  — `Promise.all` over the two new repo reads, mapping rows through the **existing private
  `toPublicDto`** (first-name-only author, falls back to `"زبون"`), extended with product name/slug.
  **Must not leak** `customer_id` or `phone`.

`src/features/shared/types.ts`:
- Add, in the reviews block (~L462-508):
  `export interface ShowcaseReview extends ProductReviewPublic { product_name: string | null; product_slug: string | null; }`
- **Delete** the `// --- Testimonials ---` block and the `Testimonial` interface (~L282-294).

---

## 2. Frontend — the home carousel · @frontend

New `src/components/store/home/CustomerReviews.tsx` — `"use client"`, default export,
props `{ reviews: ShowcaseReview[]; aggregate: ReviewAggregate }`, `return null` when
`reviews.length === 0` (matches every other home section).

- **Section shell identical to the other home sections:**
  `<section className="container mx-auto px-6 py-16 lg:py-24">` →
  `<div className="mb-10 text-center">` with `h2.font-heading text-3xl lg:text-4xl font-extrabold text-text-primary mb-3`
  (`t("store.home.reviews")`) + `p.text-text-muted` (`t("store.home.reviewsSubtitle")`).
- **Summary row:** locale-formatted average + `<StarRating value={aggregate.average} />` — **reuse
  `src/components/ui/StarRating.tsx`** (read-only when `onChange` is omitted) — then
  `t("store.home.reviewsCount")` with `{count}` interpolated via `.replace()` (the dictionary's
  established placeholder idiom).
- **Embla**, per the pattern in `src/components/landing/ProductGallery.tsx`:
  `useEmblaCarousel({ loop: true, align: "start" }, [Autoplay({ delay: 5000, stopOnInteraction: true })])`.
  Set **`dir="ltr"` on the viewport div** (ProductGallery's RTL lesson — keeps the travel axis stable)
  and let slide content inherit page direction. Slides:
  `flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]` + `touch-pan-y`.
- **Card:** `neu-raised rounded-2xl bg-surface p-6` → StarRating → optional title → body → footer with
  an initials avatar (`neu-pressed-sm`; reuse the `getInitials` helper being deleted from
  `Testimonials.tsx`), `author_name`, a `<Link href={/product/${product_slug}}>` product name, and
  `created_at` via `toLocaleDateString(locale === "en" ? "en-US" : "ar-EG", …)`.
- **Controls:** prev/next buttons + dot indicators bound to `api.selectedScrollSnap()` /
  `api.scrollTo(i)`. Position with **logical** `start-*`/`end-*`; `rtl:rotate-180` on the chevrons.
  Wire `api.on("select", …)` and `api.on("reInit", …)`; clean up on unmount.
- **Do not** copy ProductGallery's raw `bg-gray-50` / `text-amber-500` — those are landing-page classes
  and break dark mode.
- `aria-label`s on arrows/dots come from the dictionary; stars are `aria-hidden` inside a labelled wrapper.

`src/app/(store)/page.tsx`:
- Replace the `testimonialsService.getActiveTestimonials()` entry in the `Promise.all` with
  `reviewsService.getShowcaseReviews({ minRating: 4, limit: 12 })`.
- Replace `<Testimonials testimonials={testimonials} />` (between `ProductCollections` and
  `StoreFooter`) with `<CustomerReviews reviews={showcase.reviews} aggregate={showcase.aggregate} />`.
- Housekeeping in the same pass: move the misplaced import (currently on L31, below the JSDoc) up with
  the others, delete the dead `CategoryGrid` import, update the JSDoc render-order list.

---

## 3. Admin — make `/admin/reviews` the place to read feedback · @frontend

`src/app/(admin)/admin/reviews/page.tsx` hardcodes `useReviewModeration("pending")`. The hook already
accepts `ReviewStatus | undefined` and the API route already validates `?status=`, so this is UI-only:
- Add filter tabs — **all / pending / approved / rejected** — held in
  `useState<ReviewStatus | undefined>("pending")` and passed to `useReviewModeration(status)`. Style them
  like the existing tab filter in `src/components/store/home/ProductCollections.tsx`.

`src/components/admin/reviews/ReviewModerationList.tsx`:
- Add a **Status** badge column (required now that non-pending rows are visible).
- Render Approve/Reject **only** for `status === "pending"` rows.

`src/features/reviews/reviews.api.ts` — bug fix in the same pass: `moderateReview` invalidates only
`ModerationReview`, so approving a review never refreshes the storefront cache. Add `"ProductReviews"`
to its `invalidatesTags`.

`src/components/admin/dashboard/AdminLayoutClient.tsx` — remove the
`{ key: "nav.testimonials", path: "/admin/testimonials" }` entry (L72). `nav.reviews` stays.

---

## 4. Delete the testimonials feature · @frontend

**Delete outright:** `src/features/testimonials/` (4 files) · `src/app/api/admin/testimonials/`
(2 routes) · `src/app/(admin)/admin/testimonials/` (3 pages) · `src/components/admin/testimonials/`
(2 components) · `src/components/store/home/Testimonials.tsx`.

**Then** edit the touch points — this order avoids transient type errors:
- `src/lib/redux/store.ts` — drop the import, the `[testimonialsApi.reducerPath]` reducer entry, and
  the `.concat(testimonialsApi.middleware)` line.
- `src/features/i18n/dictionary.ts` — `DictKey = keyof typeof en` and `ar: Record<DictKey, string>` mean
  **every key must be removed from BOTH the `en` and `ar` halves or the build breaks.**
  - **Remove:** `nav.testimonials`; the 33-key `testimonials.*` admin block; the orphaned
    `testimonials.subtitle`; `store.home.testimonials` + `store.home.testimonialsSubtitle`; and the 18
    dead `store.testimonial.{1..6}.{name,role,text}` keys.
  - **Add** (AR first — it is the default locale — then EN): `store.home.reviews`,
    `store.home.reviewsSubtitle`, `store.home.reviewsCount` (with a `{count}` placeholder),
    `store.home.reviewsAverage`, `store.home.reviewsPrev`, `store.home.reviewsNext`,
    `reviews.filter.{all,pending,approved,rejected}`, `reviews.list.status`,
    `reviews.status.{pending,approved,rejected}`.
- Stale comment references (cosmetic, no imports): `src/features/coupons/coupons.hooks.ts:28`,
  `src/features/coupons/coupons.api.ts:22`, `src/features/reviews/reviews.api.ts:26`.
- Docs: `.claude/ai-changelog/CHANGELOG.md` gets an entry via `/save-session`. Mentions in
  `specs/010-store-pricing-shipping-ui/tasks.md` are historical — **leave them**.

---

## 5. Database work (Supabase MCP) · @backend

Run in this order, checking row counts between steps.

### 5a. Back up first
`SELECT` the 6 `testimonials` rows and save the JSON to
`docs/migrations/backup_testimonials_20260725.json` **before any destructive step**.

### 5b. Flip 4 existing orders to `delivered`

Verified: these give 4 distinct `(customer_id, product_id)` pairs, colliding neither with each other
nor with the existing delivered order.

| order_id | current status | customer | product |
|---|---|---|---|
| `52cf3720-cf1e-466b-bc80-8b675cf95b50` | approved | moahmed | iPhone 17 Pro Max Silicone Case |
| `d717d0e8-500c-41cf-95a7-2703e8a96d35` | approved | ali | iPhone 17 Pro Max Silicone Case |
| `ebc455bb-01f0-42cf-91a8-876aa8c9e14c` | confirmed | احمد محمد | iPhone 13 Pro Max Silicone Case |
| `54e84f09-ed37-4f18-9538-1a8d674c1308` | approved | moahmed | Samsung S23 Silicone Case |

`UPDATE public.orders SET status='delivered', updated_at=now() WHERE id IN (...)` — there is no
`delivered_at` column.

> ⚠️ **Do this in SQL, never through the admin UI.** The admin path runs `orderStateMachine` and fires
> the n8n webhook, which would **send real WhatsApp messages to these customers' real phone numbers**
> (status notification + the post-delivery review request). SQL also skips the intermediate `shipped`
> step, which is acceptable for seed data.

### 5c. Insert 5 approved reviews
The 4 orders above plus the already-`delivered` `db5568ca-b6b1-4b8d-9d57-694c23b38b70`
(mohamedjs × iPhone 13 Silicone Case). One row per `(product_id, customer_id)` pair (the table has
`UNIQUE (product_id, customer_id)`), `status='approved'`, `rating` a mix of 4 and 5, Arabic
`title`/`body` that read like real Egyptian customer feedback about phone cases, `order_id` set to the
matching order, `created_at` staggered over the last few weeks.

### 5d. Drop the table
`DROP TABLE public.testimonials;` via `apply_migration`, and commit a matching
`docs/migrations/20260725000000_drop_testimonials.sql` for parity with the repo convention.
(Note: no migration ever created this table — it was made by hand in the dashboard.)

---

## Acceptance criteria (every agent runs these and reports exact output)

1. `npx tsc --noEmit` → exit 0. This is the real guard: `DictKey` parity catches any half-removed
   dictionary key, and deleting the `Testimonial` type catches every stale import.
2. `npm run build` → exit 0.
3. `grep -ri testimonial src/` → only the three cosmetic comment hits, or zero if cleaned.
4. Supabase: `SELECT count(*), status FROM product_reviews GROUP BY status` → **5 approved**;
   `SELECT to_regclass('public.testimonials')` → `NULL`.
5. `npm run dev` → `http://localhost:3000/`: the reviews section renders after `ProductCollections`
   with the summary header (average + star row), 3 cards per row on desktop / 1 on mobile, autoplay
   advancing, arrows + dots working. Toggle **EN/AR and dark/light** and confirm carousel direction,
   arrow rotation, and neu tokens all behave. No console errors.
6. `http://localhost:3000/admin/reviews`: four filter tabs work; `approved` shows the 5 seeded rows with
   a status badge and **no** Approve/Reject buttons; `pending` is empty. `/admin/testimonials` 404s and
   the nav item is gone.
7. Regression: a product page for `iPhone 13 Silicone Case` shows `ProductRatingSummary` +
   `ProductReviewsSection` populated with the seeded review (both were empty before).
8. Optional end-to-end: approve/reject in admin and confirm the storefront reflects it — this is what
   the `ProductReviews` tag fix in §3 enables.

---

## Files touched

### Added
- `src/components/store/home/CustomerReviews.tsx`
- `docs/migrations/20260725000000_drop_testimonials.sql`
- `docs/migrations/backup_testimonials_20260725.json`
- `docs/specs/reviews-showcase.md` (this file)

### Modified
- `src/features/reviews/reviews.repository.ts` — `getTopApproved`, `getGlobalAggregate`
- `src/features/reviews/reviews.service.ts` — `getShowcaseReviews`
- `src/features/reviews/reviews.api.ts` — `ProductReviews` invalidation fix + stale comment
- `src/features/shared/types.ts` — `+ShowcaseReview`, `-Testimonial`
- `src/app/(store)/page.tsx` — service swap, component swap, import housekeeping
- `src/app/(admin)/admin/reviews/page.tsx` — status filter tabs
- `src/components/admin/reviews/ReviewModerationList.tsx` — status badge column, conditional actions
- `src/components/admin/dashboard/AdminLayoutClient.tsx` — drop `nav.testimonials`
- `src/features/i18n/dictionary.ts` — remove ~55 testimonial keys, add ~13 review keys (ar + en)
- `src/lib/redux/store.ts` — deregister `testimonialsApi`
- `src/features/coupons/coupons.hooks.ts`, `src/features/coupons/coupons.api.ts` — stale comments
- `.claude/ai-changelog/CHANGELOG.md` — via `/save-session`

### Deleted
- `src/features/testimonials/` (4 files)
- `src/app/api/admin/testimonials/` (2 routes)
- `src/app/(admin)/admin/testimonials/` (3 pages)
- `src/components/admin/testimonials/` (2 components)
- `src/components/store/home/Testimonials.tsx`
- DB table `public.testimonials`
