# Implementation Plan: Dashboard Analytics Enhancements

**Branch**: `002-dashboard-analytics` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/002-dashboard-analytics/spec.md`

## Summary

Extend `AdminOverviewPage` with four additions: top-products widget,
revenue-by-category widget, an average-order-value stat tile, a custom date
range option, and a CSV export action. All aggregation logic is added to
`orders.analytics.ts`; all joins (order→product, product→category) are
computed client-side from data already fetched by existing RTK Query hooks.
No repository/API changes.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 16 App Router
**Primary Dependencies**: React, RTK Query (`orders.api`, `products.api`, `categories.api`), existing chart primitives
**Storage**: N/A (no schema change; reads existing `orders`/`products`/`categories` via already-existing endpoints)
**Testing**: `npx tsc --noEmit`; manual verification against known seed data
**Target Platform**: Web, admin dashboard overview page (`/admin`)
**Project Type**: Web application (existing single-project layout)
**Performance Goals**: Aggregation over the in-range order set must stay in a single `useMemo` pass, consistent with the existing `view` memo — no perceptible UI jank up to ~1–2k orders
**Constraints**: No new charting library (Constitution V); no new API routes/repository methods unless a follow-up audit proves `product_id`/`category_id` linkage is actually missing on live data
**Scale/Scope**: 1 page + 1 analytics module + up to 2 small new presentational pieces (CSV export button, custom range control)

## Constitution Check

*GATE: must pass before task generation.*

- **I. Layered Architecture**: PASS — new logic lives in
  `orders.analytics.ts` (already the analytics layer for this page); page
  stays declarative, calling the new functions from the existing `useMemo`.
- **II. TypeScript Strict**: PASS.
- **III. RTL/i18n**: N/A here (English admin today); new widgets use the
  same `ChartCard`/Tailwind patterns as existing ones so 003-admin-arabic-rtl
  can convert them later without restructuring.
- **IV. No Business Logic in Components**: PASS — all aggregation
  (top products, revenue by category, AOV, CSV row shaping) lives in
  `orders.analytics.ts`, not inline in `AdminOverviewPage`.
- **V. Reuse Existing Primitives**: PASS — `StatTile`, `HorizontalBarChart`,
  `ChartCard`, `chartTheme` reused; CSV export uses a plain Blob download,
  no new dependency.
- **VI. State Machine / Factory**: N/A — read-only analytics, no order
  status/shipping-provider logic touched.

No violations. No Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-dashboard-analytics/
├── plan.md     # this file
├── spec.md
└── tasks.md
```

### Source Code (repository root, relevant paths only)

```text
src/
├── app/(admin)/admin/page.tsx                       # MODIFY: add widgets, AOV tile, custom range, export button
├── features/orders/
│   ├── orders.analytics.ts                          # MODIFY: add topProducts(), revenueByCategory(), averageOrderValue(), toCsvRows()
│   └── orders.api.ts                                 # unchanged (already exposes useGetOrdersQuery)
├── features/products/products.api.ts                 # unchanged (already exposes useGetProductsQuery)
├── features/categories/categories.api.ts              # unchanged (already exposes useGetCategoriesQuery)
└── components/admin/charts/
    ├── StatTile.tsx / HorizontalBarChart.tsx / chartTheme.ts   # unchanged, reused
    └── (no new chart component needed — top products & revenue-by-category both render via HorizontalBarChart)
```

**Structure Decision**: Single Next.js project; no new directories. New
aggregation functions colocate with existing ones in
`orders.analytics.ts` so there is one place that knows how to turn raw
orders into dashboard numbers.
