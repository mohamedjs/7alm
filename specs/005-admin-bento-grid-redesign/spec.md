# Feature Specification: Admin Bento Grid Redesign

**Feature Branch**: `005-admin-bento-grid-redesign`
**Created**: 2026-07-21
**Status**: Draft
**Input**: User description: "redesign the dashboard using a bento grid UI design" (part of a larger request, sequenced after `004-admin-design-system` and before `006-admin-i18n-rtl-toggle`). The user later supplied a reference screenshot (a "Coinix" crypto dashboard) as the visual target — see `plan.md`'s "Visual Design Direction" section for the concrete token/layout translation of that reference into 7alm's own brand.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Overview dashboard as a bento grid (Priority: P1)

As an admin, the Overview page presents its stats and charts as a bento
grid — varied-size cards with visual hierarchy (e.g. a large revenue hero
tile, a wide trend-chart tile, and smaller supporting tiles) — instead of a
uniform row of equal-size stat tiles stacked above equal-width chart cards.

**Why this priority**: This is the visible redesign the user asked for;
everything else in this feature is groundwork for it.

**Independent Test**: Load `/admin` → the layout reads as an asymmetric
grid of differently-sized cards, not a uniform grid; every widget shipped
by `002-dashboard-analytics` (stat tiles, trend, channel/status/zone, top
products, revenue by category, custom range, CSV export) is still present
and functional, just laid out differently.

**Acceptance Scenarios**:

1. **Given** the Overview page has data, **When** it renders, **Then** the
   cards vary in size/emphasis (at minimum: one large hero tile, one wide
   tile, several standard tiles) rather than a uniform grid.
2. **Given** the viewport is mobile width, **When** the page renders,
   **Then** the bento grid collapses to a single legible column (no
   overlapping/cut-off cards).
3. **Given** dark mode is active (from 004), **When** the bento grid
   renders, **Then** every card is themed correctly — no leftover raw
   light-only colors.

---

### User Story 2 - Shell restyled to match (Priority: P2)

As an admin, the sidebar/header visual language (spacing, rounding, token
usage) matches the new dashboard, without any change to what the nav
actually does.

**Why this priority**: A redesigned dashboard next to an unchanged sidebar
would look inconsistent; this is a visual-consistency pass, not new nav
functionality.

**Independent Test**: Compare sidebar visuals before/after — spacing scale
and surface tokens match the new dashboard cards; all existing links/
actions (Dashboard, Orders, Products, Categories, Logout) still work
identically.

**Acceptance Scenarios**:

1. **Given** the sidebar is redesigned, **When** an admin clicks any nav
   link, **Then** navigation behaves exactly as before (no functional
   change).

---

### User Story 3 - Table pages get a lighter visual refresh (Priority: P3)

As an admin, Orders/Products/Categories list pages visually match the new
design language (token-driven surfaces/spacing/typography) without being
forced into a bento layout that doesn't suit tabular data.

**Why this priority**: Lowest priority — these pages work fine
functionally today; this is polish for visual consistency, not a
functional gap.

**Independent Test**: Load `/admin/orders`, `/admin/products`,
`/admin/categories` → cards/tables use the same tokens/spacing as the new
dashboard; row-level functionality (status actions, edit/delete links)
unchanged.

### Edge Cases

- A widget with no data (empty state) must still occupy its bento cell
  sensibly (not collapse to zero height or look broken) — reuse the
  existing "No data yet" empty-state pattern inside the new cell shape.
- Very long content (e.g. many top products) inside a fixed-size bento cell
  must scroll or truncate within the cell, not blow out the grid.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `AdminOverviewPage` MUST be rebuilt using a CSS grid bento
  layout (Tailwind `grid`, `grid-cols-*`, `col-span-*`, `row-span-*`, or
  `grid-template-areas` via arbitrary values) with at least one hero-sized
  tile, one wide tile, and several standard tiles.
- **FR-002**: Every widget currently on the Overview page (from
  `002-dashboard-analytics`: total orders, revenue, AOV, pending, social
  share stat tiles; orders-per-day trend; channel/status/zone breakdowns;
  top products; revenue by category; the custom date range control; CSV
  export) MUST remain present and functional — this is a layout/visual
  change only, no widget is removed or altered in behavior.
- **FR-003**: All markup touched by this feature MUST use logical Tailwind
  properties exclusively (`ms-*`/`me-*`/`ps-*`/`pe-*`/`text-start`/
  `text-end`/`start-*`/`end-*`), never physical-direction utilities, per
  Constitution Principle III — this is what makes `006`'s RTL toggle cheap.
- **FR-004**: All markup touched by this feature MUST use the semantic
  tokens introduced in `004-admin-design-system` (surface, border,
  text-primary/muted, accent, status colors) rather than raw Tailwind
  color utilities, so theming stays centralized.
- **FR-005**: The bento grid MUST degrade to a single column on mobile
  widths, consistent with the existing responsive breakpoints used
  elsewhere in the admin.
- **FR-006**: Sidebar/header (`AdminLayoutClient.tsx`) restyle MUST NOT
  change any nav route, label text content, or auth behavior — visual only.
- **FR-007**: This feature MUST NOT change any data-fetching, RTK Query
  hooks, aggregation logic, or business logic anywhere — presentation only,
  layered on top of `001`, `002`, and `004`.

### Key Entities

None — presentation-layer only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The Overview page reads as a bento grid (varied card sizes)
  at desktop width, and degrades cleanly to one column on mobile.
- **SC-002**: Every widget from `002-dashboard-analytics` is present and
  functional after the redesign.
- **SC-003**: Zero physical-direction Tailwind utilities remain in any file
  touched by this feature (verified by search, per Constitution III).
- **SC-004**: The redesign renders correctly in both light and dark theme.
- **SC-005**: `npx tsc --noEmit` and `npm run build` both pass.

## Assumptions

- "Bento grid" means an asymmetric CSS-grid card layout (varied
  col-span/row-span per card), the common meaning of the term in current
  dashboard/portfolio UI design — not a literal food-tray metaphor beyond
  that.
- This feature depends on `004-admin-design-system` already being merged
  (needs the dark/light tokens to build on) and must land before
  `006-admin-i18n-rtl-toggle` (which depends on this feature's logical-
  property markup to make the RTL flip cheap).
- Scope for the table-page refresh (User Story 3) is visual only — no
  column changes, no new table features.
