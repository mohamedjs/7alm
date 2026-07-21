# Feature Specification: Dashboard Analytics Enhancements

**Feature Branch**: `002-dashboard-analytics`
**Created**: 2026-07-21
**Status**: Draft
**Input**: User description: "what's important for dashboard analytics — add what you think matters"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See top-selling products (Priority: P1)

As an admin, on the Overview page I can see which products are actually
driving orders/revenue in the selected period, without leaving the page.

**Why this priority**: The current dashboard shows order volume/revenue/
channel/status/zone, but nothing about *what* is selling — the single
highest-value gap for a single-product-funnel-turned-multi-product catalog
(the app just shipped category hierarchy, implying a growing catalog).

**Independent Test**: Load `/admin` with orders present for 2+ distinct
products → a "Top products" widget lists products ranked by revenue (and
shows units sold), matching what a manual count of the order data would
show for the same period.

**Acceptance Scenarios**:

1. **Given** orders exist for multiple products in the selected range,
   **When** the Overview page loads, **Then** a "Top products" widget shows
   the top 5 by revenue with units sold per product.
2. **Given** an order references a product that no longer exists (deleted),
   **When** the widget renders, **Then** that order's contribution is
   grouped under "Unknown product" instead of crashing the page.

---

### User Story 2 - See revenue by category (Priority: P1)

As an admin, I can see how revenue splits across product categories in the
selected period.

**Why this priority**: Directly leverages the category hierarchy feature
just shipped; ties analytics to the catalog structure the admin already
manages.

**Independent Test**: Load `/admin` with orders across 2+ categories → a
"Revenue by category" widget shows a bar per top-level category with its
share of revenue for the period.

**Acceptance Scenarios**:

1. **Given** orders exist for products across multiple categories, **When**
   the Overview page loads, **Then** revenue is broken down by top-level
   category.
2. **Given** a product has no category assigned, **When** the widget
   renders, **Then** its revenue is grouped under "Uncategorized".

---

### User Story 3 - Average order value + custom date range (Priority: P2)

As an admin, I can see average order value at a glance and analyze any
custom date range, not just the fixed 7/30/90-day presets.

**Why this priority**: AOV is a standard e-commerce KPI missing today; a
custom range removes a real limitation of the current 3 presets.

**Independent Test**: Pick a custom start/end date → all widgets (existing +
new) recompute for that exact range; an "Avg order value" stat tile shows
revenue/order-count for the active range with a delta vs. the prior period
of equal length.

**Acceptance Scenarios**:

1. **Given** the admin picks a custom date range, **When** applied, **Then**
   every widget on the page (stat tiles, trend, channel/status/zone, top
   products, revenue by category) recomputes against that range.
2. **Given** a custom range where start date is after end date, **When** the
   admin tries to apply it, **Then** the control blocks the invalid range.

---

### User Story 4 - Export the current view to CSV (Priority: P3)

As an admin, I can export the orders behind the current filter/date range to
a CSV file for offline reporting.

**Why this priority**: Nice-to-have operational convenience; lowest priority
since it doesn't add a new insight, just portability of existing data.

**Independent Test**: With any date range selected, click "Export CSV" → a
file downloads containing the in-range orders (id, date, customer, product,
quantity, total, status, channel, zone).

**Acceptance Scenarios**:

1. **Given** orders are loaded for the selected range, **When** the admin
   clicks "Export CSV", **Then** a CSV file downloads with one row per
   order in that range.
2. **Given** zero orders in the selected range, **When** the admin clicks
   "Export CSV", **Then** a CSV with header-only (no rows) downloads rather
   than erroring.

### Edge Cases

- Range with zero orders → all new widgets show the same empty state
  pattern already used ("No orders in this period yet.").
- Very large order volume (100s–1000s of rows) in a period → client-side
  aggregation must not visibly block the UI (compute in the existing
  `useMemo`, same pattern as current KPIs).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Overview page MUST add a "Top products" widget (top 5 by
  revenue, with units sold) for the selected date range.
- **FR-002**: Overview page MUST add a "Revenue by category" widget for the
  selected date range, grouped by top-level category, with an "Uncategorized"
  bucket for products with no category.
- **FR-003**: Product/category joins for both widgets MUST be computed
  client-side from existing RTK Query data (`useGetOrdersQuery`,
  `useGetProductsQuery`, `useGetCategoriesQuery`) — no new API routes or
  repository methods required (see Assumptions).
- **FR-004**: Overview page MUST add an "Avg order value" stat tile
  (revenue ÷ order count) with a period-over-period delta, using the
  existing `StatTile` delta convention.
- **FR-005**: The range selector MUST support a custom start/end date range
  in addition to the existing 7/30/90-day presets; all widgets on the page
  MUST recompute from the same selected range (single source of truth,
  already the case via the `view` memo).
- **FR-006**: Overview page MUST provide an "Export CSV" action that
  downloads the in-range orders as a CSV (id, date, customer, product,
  quantity, total, status, channel, zone).
- **FR-007**: All new widgets MUST reuse existing chart primitives
  (`StatTile`, `HorizontalBarChart`, `chartTheme`) — no new charting
  dependency introduced.
- **FR-008**: New aggregation functions MUST be added to
  `src/features/orders/orders.analytics.ts` (extending it, not duplicating
  logic elsewhere), keeping `AdminOverviewPage` declarative.

### Key Entities

- **Order** (existing): `product_id`, `total_price`, `status`, `created_at`,
  channel/zone fields already used by current analytics.
- **Product** (existing): `id`, `name`, `category_id` — used to join orders
  → categories for FR-002.
- **Category** (existing): `id`, `name_ar`/`name_en`, `parent_id` — used to
  label the revenue-by-category buckets by top-level ancestor.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admin identifies the top 5 revenue-driving products for any
  period without leaving `/admin`.
- **SC-002**: Admin sees revenue split by category for any period without
  leaving `/admin`.
- **SC-003**: Admin can select an arbitrary custom date range and every
  widget reflects it.
- **SC-004**: Admin exports the current period's orders to CSV in 2 clicks
  or fewer.
- **SC-005**: `npx tsc --noEmit` passes; no new runtime dependency added for
  charting.

## Assumptions

- Orders carry `product_id` and products carry `category_id` (introduced by
  the recently shipped category-hierarchy feature) — sufficient for FR-001–
  FR-003 to be computed entirely client-side against already-fetched RTK
  Query data, with no repository/API changes. If a future audit finds either
  linkage missing/nullable in existing data, those rows fall back to
  "Unknown product" / "Uncategorized" per the Edge Cases above rather than
  blocking the feature.
- "Top N" for products defaults to 5; not user-configurable in v1.
- CSV export runs fully client-side (Blob + `<a download>`), no server
  endpoint needed.
- This feature can be implemented in parallel with 001-categories-admin-ux
  (different files) and must land before 003-admin-arabic-rtl.
