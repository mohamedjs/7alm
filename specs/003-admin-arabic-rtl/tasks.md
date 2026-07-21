# Tasks: Admin Dashboard Arabic + RTL

**Input**: Design documents from `specs/003-admin-arabic-rtl/`
**Prerequisites**: plan.md, spec.md, AND features 001-categories-admin-ux and
002-dashboard-analytics MUST already be merged (this feature translates and
mirrors the pages/widgets they add).
**Tests**: Not requested — verification is `npx tsc --noEmit`, `npm run build`,
and a manual RTL QA pass (SC-002).

## Phase 1: Setup

- [ ] T001 In `src/app/(admin)/admin/layout.tsx`: change `<html lang="en" dir="ltr" ...>` to `<html lang="ar" dir="rtl" ...>`; replace the Inter `<link>` with the Cairo font `<link>` already used in `src/app/(landing)/layout.tsx`; translate the `metadata.title`/`metadata.description` strings to Arabic.

**Checkpoint**: Every admin page now inherits `dir="rtl"`/Arabic font from the root layout (content still English until later phases translate it).

---

## Phase 3: User Story 1 - Admin shell in Arabic/RTL (Priority: P1)

**Goal**: Sidebar, header, and login page read RTL in Arabic.
**Independent Test**: Load `/admin/login` and any `/admin/*` page; check `dir`/`lang` and that shell copy is Arabic.

- [ ] T002 [US1] In `src/components/admin/dashboard/AdminLayoutClient.tsx`: translate all nav labels (`navLinks`), the "Logout" button, the mobile-menu aria copy, and the user-email row label to Arabic; convert every physical-direction class (`border-r`, `md:border-r`, `pl-*`/`pr-*`, `ml-4`, `text-left`/`text-right` if any) to its logical equivalent (`border-e`, `ps-*`/`pe-*`, `ms-4`, `text-start`/`text-end`). Depends on: T001.
- [ ] T003 [US1] In `src/components/admin/auth/LoginForm.tsx` and `src/app/(admin)/admin/login/page.tsx`: translate all labels/placeholders/button text/error messages to Arabic; convert any physical-direction classes to logical equivalents. Depends on: T001.

**Checkpoint**: Shell + login fully Arabic/RTL.

---

## Phase 4: User Story 2 - CRUD screens in Arabic/RTL (Priority: P1)

**Goal**: Orders, Products, Categories screens (incl. 001's new create/edit pages) are Arabic/RTL.
**Independent Test**: Visit each listed route; confirm Arabic copy and correct mirroring.

- [ ] T004 [P] [US2] Translate + convert direction classes in `src/app/(admin)/admin/orders/page.tsx` and `src/components/admin/OrdersTable.tsx` (table headers, status badge labels, action button labels — read status/actions still come from `orderStateMachine.ts`, only their displayed copy and layout classes change).
- [ ] T005 [P] [US2] Translate + convert direction classes in `src/app/(admin)/admin/products/page.tsx`, `src/app/(admin)/admin/products/create/page.tsx`, `src/app/(admin)/admin/products/edit/[id]/page.tsx`, `src/components/admin/products/ProductList.tsx`, `src/components/admin/products/ProductForm.tsx`.
- [ ] T006 [P] [US2] Translate + convert direction classes in `src/app/(admin)/admin/categories/page.tsx`, `src/app/(admin)/admin/categories/create/page.tsx`, `src/app/(admin)/admin/categories/edit/[id]/page.tsx` (all three from 001-categories-admin-ux), and `src/components/admin/categories/CategoryList.tsx`, `src/components/admin/categories/CategoryForm.tsx`.

**Checkpoint**: All CRUD screens Arabic/RTL; T004/T005/T006 touch disjoint files and can run in parallel.

---

## Phase 5: User Story 3 - Analytics page in Arabic/RTL (Priority: P2)

**Goal**: Overview page (incl. 002's new widgets) reads correctly in Arabic/RTL.
**Independent Test**: Load `/admin`; confirm Arabic labels and correctly oriented charts; confirm numerals still format correctly.

- [ ] T007 [US3] Translate + convert direction classes in `src/app/(admin)/admin/page.tsx`: stat tile labels, `ChartCard` titles/subtitles, range preset labels, the custom range control and "Export CSV" button (both from 002-dashboard-analytics), and the empty-state message. Depends on: T004–T006 having established the pattern (not a hard blocker, but keep consistent copy/terminology).
- [ ] T008 [US3] In `src/components/admin/charts/StatTile.tsx`, `OrdersTrendChart.tsx`, `HorizontalBarChart.tsx`, `chartTheme.ts`: translate any hardcoded copy (e.g. `channelMeta` labels in `chartTheme.ts`), convert direction-sensitive layout classes to logical equivalents, and verify legend/axis label positioning reads correctly under `dir="rtl"` while numeric values remain unmirrored. Depends on: T007.

**Checkpoint**: Overview page fully Arabic/RTL, charts legible.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T009 [P] Update `AGENTS.md`: change the "protected admin dashboard (LTR)" line (and any other statement that the admin is LTR/English) to state the admin dashboard is RTL/Arabic, consistent with FR-008.
- [ ] T010 Run `npx tsc --noEmit` and `npm run build` from the repo root; fix any resulting errors across all files touched in this feature.
- [ ] T011 Manual RTL QA pass across every admin page (login, overview, orders, products list/create/edit, categories list/create/edit) at both desktop and mobile widths; confirm no overlapping/broken spacing per SC-002, and that mixed-direction content (Arabic name next to numeric phone/order id) doesn't visually scramble.

---

## Dependencies & Execution Order

- Phase 1 (T001) blocks everything else (root `dir`/`lang`/font).
- Phase 3 (shell) has no dependency on Phase 4/5 and can run right after Phase 1.
- Phase 4's three tasks (T004, T005, T006) touch disjoint files — parallelizable.
- Phase 5 depends on 002-dashboard-analytics already being merged (its widgets must exist to translate them) and loosely follows Phase 4 for terminology consistency.
- Phase 6 depends on all prior phases.
- This entire feature depends on 001-categories-admin-ux and
  002-dashboard-analytics being merged first (T006 and T007 translate files
  those features create).

## Implementation Strategy

Not incrementally shippable in the same way as 001/002 — a half-translated
admin (some pages Arabic/RTL, others still English/LTR) is worse UX than
the current fully-English state. Land Phase 1–4 (shell + all CRUD) as one
unit at minimum before shipping; Phase 5 (analytics) can trail by a short
window if necessary since it's a single, clearly-scoped page.
