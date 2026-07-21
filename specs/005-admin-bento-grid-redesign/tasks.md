# Tasks: Admin Bento Grid Redesign

**Input**: `specs/005-admin-bento-grid-redesign/{spec.md,plan.md}`
**Prerequisites**: `004-admin-design-system` merged (tokens + dark variant must exist).
**Tests**: Not requested — verification is `npx tsc --noEmit`, `npm run build`, manual QA.

## Phase 3: User Story 1 - Overview dashboard as a bento grid (Priority: P1)

- [x] T001 Plan the bento grid structure for `AdminOverviewPage` following `plan.md`'s "Visual Design Direction" section exactly (ASCII layout sketch, token rotation for entity badges, hero/wide/standard tile assignment). Sketch the `grid-template-areas`/`col-span`/`row-span` layout in a short comment at the top of `admin/page.tsx` before implementing. Also add a welcome header (greeting + inline quick-metric pill row with colored delta chips, reusing `percentChange`/`StatTile`'s delta pattern) above the grid, per the reference.
- [x] T002 Rebuild `src/app/(admin)/admin/page.tsx`'s layout as a CSS grid using Tailwind (`grid grid-cols-*`, `col-span-*`, `row-span-*`) per T001's plan; every existing widget/component call from `002-dashboard-analytics` MUST be preserved as-is (only the wrapping `ChartCard`/grid container classes change) — do not alter `orders.analytics.ts` or any data-fetching. Use tokens from `004` (`bg-surface`, `border-border`, `text-text-primary`, etc.), soft `rounded-2xl` cards with subtle shadow (not heavy borders), and logical properties only (`ps-*`/`pe-*`/`ms-*`/`me-*`/`text-start`/`text-end`, never `pl-*`/`pr-*`/`ml-*`/`mr-*`/`text-left`/`text-right`). For "Top products" and "Revenue by category", add a small colored badge (circle/square) per row using the 5-color stable-hash rotation defined in `plan.md` (brand-500/gold-500/blue-500/green-500/pink-500), so each entity is consistently color-coded across renders. Depends on: T001.
- [x] T003 [P] Verify `HorizontalBarChart`, `OrdersTrendChart`, and `StatTile` render legibly at the new bento cell sizes (e.g. a narrower hero column or a taller wide tile); adjust their internal spacing/sizing props if needed — no change to their data/logic contracts. Depends on: T002.

**Checkpoint**: Overview page is a working bento grid with every widget intact.

---

## Phase 4: User Story 2 - Shell restyle (Priority: P2)

- [x] T004 Restyle `src/components/admin/dashboard/AdminLayoutClient.tsx` to match the new visual language: token-driven surfaces/borders (from `004`), consistent spacing/rounding with the new dashboard cards, logical properties only. Do not change any `href`, route, label text content, or auth logic. Depends on: T002 (established the visual language to match).

**Checkpoint**: Sidebar/shell visually consistent with the new dashboard; identical functionality.

---

## Phase 5: User Story 3 - Table pages visual refresh (Priority: P3)

- [x] T005 [P] Visual refresh of `src/app/(admin)/admin/orders/page.tsx` and `src/components/admin/OrdersTable.tsx`: tokens/spacing/rounding to match, logical properties only; no column/behavior change.
- [x] T006 [P] Visual refresh of `src/app/(admin)/admin/products/**/*.tsx` and `src/components/admin/products/ProductList.tsx`: tokens/spacing/rounding, logical properties only; no field/behavior change.
- [x] T007 [P] Visual refresh of `src/app/(admin)/admin/categories/**/*.tsx` and `src/components/admin/categories/CategoryList.tsx`: tokens/spacing/rounding, logical properties only; no field/behavior change.

**Checkpoint**: All admin surfaces share one consistent visual language.

---

## Phase 6: Polish

- [x] T008 Search every file touched in this feature for leftover physical-direction Tailwind utilities (`ml-`, `mr-`, `pl-`, `pr-`, `border-l-`, `border-r-`, `text-left`, `text-right`, `left-`, `right-`) and convert any hits to logical equivalents — this is the SC-003 gate.
- [x] T009 Run `npx tsc --noEmit` and `npm run build`; fix any errors.
- [x] T010 Manual QA: bento layout at desktop and mobile widths, in both light and dark theme; confirm every `002` widget still works (stat tiles, trend, channel/status/zone, top products, revenue by category, custom range, CSV export).

---

## Dependencies & Execution Order

- Phase 3 (T001→T002→T003) is sequential — all edit the same primary file.
- Phase 4 depends on Phase 3 (shares the visual language it establishes).
- Phase 5's three tasks touch disjoint files — parallelizable, and independent of Phase 4.
- Phase 6 depends on everything above.
