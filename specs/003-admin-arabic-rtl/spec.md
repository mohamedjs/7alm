# Feature Specification: Admin Dashboard Arabic + RTL

**Feature Branch**: `003-admin-arabic-rtl`
**Created**: 2026-07-21
**Status**: SUPERSEDED — 2026-07-21. Scope changed from a one-way Arabic/RTL
flip to a runtime EN/AR + LTR/RTL toggle plus a light/dark toggle. Replaced
by three sequenced specs: `004-admin-design-system` (tokens + dark/light
toggle) → `005-admin-bento-grid-redesign` (bento layout, built with logical
CSS properties) → `006-admin-i18n-rtl-toggle` (the actual dictionary +
direction toggle). This file is kept for history only; do not implement it.
**Input**: User description: "make the dashboard Arabic / RTL"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin shell renders in Arabic/RTL (Priority: P1)

As an admin, the dashboard shell (sidebar, header, login) reads right-to-left
in Arabic, matching the public storefront's language.

**Why this priority**: Foundation — every other page lives inside this
shell; get the frame right first.

**Independent Test**: Load `/admin/login` and any `/admin/*` page → `dir`
attribute is `rtl`, `lang` is `ar`, sidebar/header copy is Arabic, sidebar
sits on the visual right, content flows right-to-left.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visit to `/admin/login`, **When** it loads,
   **Then** the page is `dir="rtl"` `lang="ar"` with Arabic labels.
2. **Given** an authenticated admin, **When** any `/admin/*` page loads,
   **Then** the sidebar, nav labels, and logout button are in Arabic and
   positioned correctly for RTL (sidebar reads as "leading" edge on the
   right).

---

### User Story 2 - Orders/Products/Categories management in Arabic/RTL (Priority: P1)

As an admin, the core CRUD screens (orders list, products list/create/edit,
categories list/create/edit — the latter two shipped by 001) are fully
Arabic and correctly mirrored.

**Why this priority**: These are the screens admins use every day; highest
functional value after the shell.

**Independent Test**: Visit `/admin/orders`, `/admin/products`,
`/admin/products/create`, `/admin/products/edit/[id]`,
`/admin/categories`, `/admin/categories/create`,
`/admin/categories/edit/[id]` → all copy is Arabic, all spacing/borders/
alignment mirror correctly (no leftover LTR-only spacing that looks
"broken" under RTL).

**Acceptance Scenarios**:

1. **Given** the admin opens `/admin/orders`, **When** the table renders,
   **Then** column headers, status labels, and action buttons are Arabic
   and the table reads right-to-left.
2. **Given** the admin opens a product or category create/edit form,
   **When** it renders, **Then** labels/placeholders/buttons are Arabic and
   form fields are laid out for RTL (e.g., a field's helper text sits on the
   correct side).

---

### User Story 3 - Analytics/Overview page in Arabic/RTL (Priority: P2)

As an admin, the Overview page (including the widgets shipped by
002-dashboard-analytics) reads correctly in Arabic/RTL, with charts that
still communicate correctly when mirrored.

**Why this priority**: Charts are the highest-risk mirroring surface
(axes, legends, bar direction) — sequenced after the simpler CRUD screens
are proven out.

**Independent Test**: Load `/admin` → stat tile labels, chart titles/
subtitles, legend labels are Arabic; bar charts and the trend chart remain
legible and correctly oriented; numeric values (currency, percentages,
counts) remain correctly formatted and left-to-right within their own
token (numerals aren't mirrored).

**Acceptance Scenarios**:

1. **Given** the Overview page has data, **When** it renders, **Then** all
   stat tile labels, chart titles, and legend entries are Arabic.
2. **Given** a currency or percentage value is displayed, **When** rendered
   in an RTL context, **Then** the number itself displays correctly
   (un-mirrored) per standard bidi handling.

---

### Edge Cases

- Long Arabic strings in fixed-width chrome (sidebar items, table headers,
  buttons) must wrap or truncate gracefully, not overflow/break layout.
- Mixed-direction content (e.g., an Arabic customer name beside a numeric
  phone number or order id) must not visually scramble — rely on Unicode
  bidi isolation and tabular numerals for IDs.
- Any error/toast messages coming directly from Supabase/auth (not authored
  in this codebase) may remain in their original language — out of scope to
  chase every upstream error string; flag this explicitly rather than
  silently leaving inconsistent copy unexplained.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `src/app/(admin)/admin/layout.tsx` MUST set `dir="rtl"`
  `lang="ar"` (currently `dir="ltr" lang="en"`) and load a font that renders
  Arabic well — reuse the Cairo font already used by the public `(landing)`
  layout for visual consistency across the app.
- **FR-002**: All static English UI copy in admin components (nav labels,
  page headers/titles, table headers, buttons, form labels/placeholders,
  empty/loading states, toasts/confirms authored in this codebase) MUST be
  translated to Arabic. Underlying data (product names, customer records) is
  unaffected — only first-party chrome/copy translates.
- **FR-003**: Every physical-direction Tailwind utility in admin components
  (`ml-*`, `mr-*`, `pl-*`, `pr-*`, `border-l-*`, `border-r-*`, `text-left`,
  `text-right`, `left-*`, `right-*`) MUST be converted to its logical
  equivalent (`ms-*`, `me-*`, `ps-*`, `pe-*`, `border-s-*`, `border-e-*`,
  `text-start`, `text-end`, `start-*`, `end-*`) per Constitution Principle
  III, so layout mirrors correctly.
- **FR-004**: Directional icons (expand/collapse chevrons, any
  forward/back affordance) MUST be reviewed and swapped/mirrored so they
  still read correctly right-to-left.
- **FR-005**: Chart components (`OrdersTrendChart`, `HorizontalBarChart`)
  MUST render correctly under RTL — labels/legends reposition to the
  correct reading order; numeric values are NOT mirrored (numerals stay
  left-to-right within their own token per standard bidi rules).
- **FR-006**: Existing currency/number formatting (`formatEgp`,
  `formatCompact`) MUST continue to produce correct output under RTL — this
  feature must not regress formatting while fixing direction/copy.
- **FR-007**: This feature depends on 001-categories-admin-ux and
  002-dashboard-analytics already being merged, since it is a translation +
  mirroring pass applied over the full current admin surface, including the
  new category create/edit pages and new analytics widgets they add.
- **FR-008**: `AGENTS.md`'s "protected admin dashboard (LTR)" statement
  MUST be updated to reflect the new RTL/Arabic admin once this ships, so
  the documented architecture doesn't contradict the shipped app.

### Key Entities

None — this is a presentation-layer (direction + copy) change; no data
model is introduced or altered.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every admin page (login, overview, orders, products
  list/create/edit, categories list/create/edit) renders `dir="rtl"` with
  Arabic UI copy.
- **SC-002**: Manual QA pass across all admin pages at desktop and mobile
  widths shows no visually broken/overlapping spacing from leftover
  physical-direction utilities.
- **SC-003**: `npx tsc --noEmit` and `npm run build` both pass after the
  change.
- **SC-004**: `AGENTS.md` no longer states the admin dashboard is LTR/
  English.

## Assumptions

- Arabic strings are hardcoded directly in components (no i18n
  library/dictionary layer is introduced) — consistent with the existing
  ad hoc bilingual pattern already present (e.g. "Categories / الأقسام"),
  now committed fully to Arabic rather than a mix.
- This is an internal admin tool with a single operating language going
  forward — no language toggle is required; Arabic/RTL becomes the only
  mode, mirroring the public storefront.
- Font: reuse Cairo (already loaded for the public landing layout) instead
  of the current Inter-only admin font, for visual + bundle consistency.
- This feature is sequenced LAST, after 001 and 002, and touches shared
  files those features also touch (`AdminLayoutClient.tsx`, the categories
  pages, the overview page) — it is the integrating pass over their output,
  not a parallel workstream.
