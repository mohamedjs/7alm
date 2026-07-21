# Tasks: Dashboard Analytics Enhancements

**Input**: Design documents from `specs/002-dashboard-analytics/`
**Prerequisites**: plan.md, spec.md
**Tests**: Not requested — verification is `npx tsc --noEmit` + manual check against known order data.

## Phase 2: Foundational

**Purpose**: Shared join helpers used by more than one widget below.

- [x] T001 [P] In `src/features/orders/orders.analytics.ts`, add small lookup-builder helpers: a `Map<productId, Product>` builder and a `Map<categoryId, Category>` builder (or inline equivalents), so the new aggregation functions below don't each re-implement the join.

**Checkpoint**: Helpers available; no behavior change yet.

---

## Phase 3: User Story 1 - Top-selling products (Priority: P1)

**Goal**: A "Top products" widget on `/admin` showing top 5 by revenue with units sold.
**Independent Test**: Seed orders for 2+ products, load `/admin`, compare widget output to a manual tally.

- [x] T002 [US1] In `src/features/orders/orders.analytics.ts`, add `topProducts(orders: Order[], products: Product[], limit = 5)`: group in-range orders by `product_id`, sum revenue and units per product, resolve product name via the product map from T001 (fallback label `"Unknown product"` if not found), sort by revenue desc, return top `limit`. Depends on: T001.
- [x] T003 [US1] In `src/app/(admin)/admin/page.tsx`: add `useGetProductsQuery()`, call `topProducts(view.inRange, products)` inside the existing `view` `useMemo`, render a new `ChartCard title="Top products"` using `HorizontalBarChart` (rows = product name/revenue, detail = units sold), placed in the existing widgets grid. Depends on: T002.

**Checkpoint**: Top products widget live and correct.

---

## Phase 4: User Story 2 - Revenue by category (Priority: P1)

**Goal**: A "Revenue by category" widget on `/admin`.
**Independent Test**: Seed orders across 2+ categories, load `/admin`, verify the split.

- [x] T004 [US2] In `src/features/orders/orders.analytics.ts`, add `revenueByCategory(orders: Order[], products: Product[], categories: Category[])`: join order→product→top-level category via the maps from T001, sum revenue per top-level category, bucket products with no `category_id` (or an unresolvable one) under `"Uncategorized"`. Depends on: T001.
- [x] T005 [US2] In `src/app/(admin)/admin/page.tsx`: add `useGetCategoriesQuery()`, call `revenueByCategory(view.inRange, products, categories)` in the `view` memo, render a new `ChartCard title="Revenue by category"` using `HorizontalBarChart`. Depends on: T004, T003 (same file — apply after T003's edit).

**Checkpoint**: Both P1 widgets live.

---

## Phase 5: User Story 3 - Average order value + custom date range (Priority: P2)

**Goal**: AOV stat tile + a custom start/end date range option.
**Independent Test**: Pick a custom range; confirm every widget (existing + new) recomputes against it; confirm AOV tile shows correct value + delta.

- [x] T006 [P] [US3] In `src/features/orders/orders.analytics.ts`, add `averageOrderValue(orders: Order[])` returning `revenue / count` (0 when `count === 0`).
- [x] T007 [US3] In `src/app/(admin)/admin/page.tsx`: add an "Avg order value" `StatTile` using `averageOrderValue(view.inRange)` with a delta vs. `averageOrderValue(previous)` (reuse the existing `percentChange` helper). Depends on: T006, T005.
- [x] T008 [US3] In `src/app/(admin)/admin/page.tsx`: extend the range control — add a custom start/end date option alongside `RANGE_PRESETS`; when a custom range is active, compute `inRange`/`previous` from the explicit dates instead of `rangeDays` (keep `filterByRange`/`filterByPreviousRange` working off explicit bounds, extending their signature if needed in `orders.analytics.ts`); block submission when start > end. Depends on: T007.

**Checkpoint**: AOV visible; custom range drives every widget on the page.

---

## Phase 6: User Story 4 - CSV export (Priority: P3)

**Goal**: "Export CSV" downloads the in-range orders.
**Independent Test**: Click export with a non-empty and with an empty range; confirm correct CSV in both cases.

- [x] T009 [P] [US4] In `src/features/orders/orders.analytics.ts`, add `toCsvRows(orders: Order[], products: Product[])` returning row objects `{ id, date, customer, product, quantity, total, status, channel, zone }` (product resolved via the product map, falling back to `"Unknown product"`).
- [x] T010 [US4] In `src/app/(admin)/admin/page.tsx`: add an "Export CSV" button that builds CSV text from `toCsvRows(view.inRange, products)` (header row + escaped rows), wraps it in a `Blob`, and triggers a download via a temporary `<a download>` element — no server endpoint. Depends on: T009, T008.

**Checkpoint**: All four user stories live on the Overview page.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T011 Run `npx tsc --noEmit` from the repo root and fix any type errors across all files touched above.
- [x] T012 Manual verification: confirm all four new widgets/controls against known order data, and confirm the pre-existing widgets (trend, channel, status, zone) still work unchanged and the empty-state ("No orders in this period yet.") still triggers correctly when a range has zero orders. (Verified via `npx tsc --noEmit` + `npm run build` + code-level review of the aggregation logic and JSX gating; a live browser walkthrough against seeded order data was not performed — no admin credentials available in this environment.)

---

## Dependencies & Execution Order

- Phase 2 (T001) blocks Phases 3–6, since every aggregation needs the lookup maps.
- Phases 3, 4 both edit `orders.analytics.ts` (additive, can be written in parallel by different people) but their `admin/page.tsx` edits (T003, T005) must be applied sequentially to the same file.
- Phase 5 depends on Phase 4 completing (T007 depends on T005).
- Phase 6 depends on Phase 5 completing (T010 depends on T008).
- Phase 7 depends on everything above.

## Implementation Strategy

MVP = Phase 3 (Top products) alone is a complete, demoable increment. Then
layer in Phase 4, 5, 6 in priority order; each is independently checkable
against the Overview page before moving on.
