# Implementation Plan: Admin Dashboard Arabic + RTL

**Branch**: `003-admin-arabic-rtl` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/003-admin-arabic-rtl/spec.md`

## Summary

Flip the entire `(admin)` route group from `dir="ltr" lang="en"` (Inter
font, English copy) to `dir="rtl" lang="ar"` (Cairo font, Arabic copy), and
sweep every admin component for physical-direction Tailwind utilities,
replacing them with logical equivalents. This is an integrating pass: it
must run after 001-categories-admin-ux and 002-dashboard-analytics have
landed, since it also translates/mirrors the pages and widgets they add.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 16 App Router, Tailwind CSS
**Primary Dependencies**: none new — font swap uses the Cairo `<link>` already present in `(landing)/layout.tsx`
**Storage**: N/A
**Testing**: `npx tsc --noEmit`, `npm run build`; manual RTL QA pass across every admin page at desktop + mobile widths
**Target Platform**: Web, all of `(admin)/admin/*` including `/admin/login`
**Project Type**: Web application (existing single-project layout)
**Performance Goals**: N/A
**Constraints**: MUST land after 001 and 002 (touches their new files); MUST NOT reintroduce physical-direction utilities (Constitution III); MUST NOT change any business logic, only markup/copy/direction
**Scale/Scope**: Root admin layout + every admin component/page (sidebar, login, orders table, products list/create/edit, categories list/create/edit, overview page + all chart cards)

## Constitution Check

*GATE: must pass before task generation.*

- **I. Layered Architecture**: PASS — presentation-only change; no
  repository/service/API-route/hook business logic touched.
- **II. TypeScript Strict**: PASS.
- **III. RTL/i18n Correctness**: this feature's entire purpose is to
  satisfy this principle admin-wide; every task below is scoped to a file
  and must leave zero `ml-*`/`mr-*`/`pl-*`/`pr-*`/`border-l-*`/`border-r-*`/
  `text-left`/`text-right`/`left-*`/`right-*` in admin components.
- **IV. No Business Logic in Components**: PASS — no logic added.
- **V. Reuse Existing Primitives**: PASS — reuses the Cairo font already
  loaded for `(landing)`; no new UI dependency.
- **VI. State Machine / Factory**: PASS — order-status action buttons keep
  their existing `orderStateMachine.ts`-driven logic, only their
  label copy/direction classes change.

No violations. No Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/003-admin-arabic-rtl/
├── plan.md     # this file
├── spec.md
└── tasks.md
```

### Source Code (repository root, relevant paths only — every admin surface)

```text
src/app/(admin)/admin/
├── layout.tsx                       # dir="rtl" lang="ar", Cairo font
├── login/page.tsx
├── page.tsx                         # overview (depends on 002's widgets existing)
├── orders/page.tsx
├── categories/{page.tsx,create/page.tsx,edit/[id]/page.tsx}   # depends on 001 existing
└── products/{page.tsx,create/page.tsx,edit/[id]/page.tsx}

src/components/admin/
├── dashboard/AdminLayoutClient.tsx  # sidebar/header copy + direction
├── auth/LoginForm.tsx
├── OrdersTable.tsx
├── products/{ProductList.tsx,ProductForm.tsx}
├── categories/{CategoryList.tsx,CategoryForm.tsx}             # depends on 001's page split
└── charts/{StatTile.tsx,OrdersTrendChart.tsx,HorizontalBarChart.tsx,chartTheme.ts}

AGENTS.md                            # update "LTR" statement (FR-008)
```

**Structure Decision**: No new directories or files — every task in this
feature modifies an existing file in place (copy + Tailwind direction
classes only).
