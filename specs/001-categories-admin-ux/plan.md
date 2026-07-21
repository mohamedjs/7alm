# Implementation Plan: Categories Admin UX Fix

**Branch**: `001-categories-admin-ux` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-categories-admin-ux/spec.md`

## Summary

Remove the duplicate "Category Tree" sidebar section (the reported "more
than one tab" bug), and convert category create/edit from a modal
(`CategoryForm` shown conditionally in `CategoriesPage`) into two dedicated
pages, mirroring the existing `admin/products/create` and
`admin/products/edit/[id]` pattern. Pure container/routing change — no new
repository/service/API-route logic, no schema change.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 16 App Router
**Primary Dependencies**: React, RTK Query, existing `@/features/categories/*`
**Storage**: Supabase `categories` table (unchanged)
**Testing**: `npx tsc --noEmit`; manual click-through (no test runner in repo)
**Target Platform**: Web, admin dashboard (`(admin)/admin/*`)
**Project Type**: Web application (Next.js, existing single-project layout)
**Performance Goals**: N/A — CRUD form, no perf-sensitive path
**Constraints**: Must not touch `categories.repository.ts` / `categories.service.ts` (Constitution I); must reuse `CategoryForm` field logic, not rewrite it
**Scale/Scope**: 1 sidebar component + 1 existing page + 2 new pages + 1 hook

## Constitution Check

*GATE: must pass before task generation.*

- **I. Layered Architecture**: PASS — no repository/service/API changes;
  only the client container (page vs modal) and the hook's local UI state
  change.
- **II. TypeScript Strict**: PASS — plan requires `npx tsc --noEmit` clean
  as Done-criteria.
- **III. RTL/i18n**: N/A for this feature (English admin today); the new
  pages must still be structured so 003-admin-arabic-rtl can convert them
  later without a rewrite (use the same className patterns as
  `admin/products/create`, which 003 will also touch).
- **IV. No Business Logic in Components**: PASS — `saveCategory`/
  `removeCategory` stay in `categories.hooks.ts`; new pages are thin.
- **V. Reuse Existing Primitives**: PASS — reuses `CategoryForm`,
  `CategoryList` as-is; no new UI library.
- **VI. State Machine / Factory**: N/A — categories aren't part of either.

No violations. No Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-categories-admin-ux/
├── plan.md     # this file
├── spec.md
└── tasks.md
```

### Source Code (repository root, relevant paths only)

```text
src/
├── app/(admin)/admin/categories/
│   ├── page.tsx                 # MODIFY: remove modal render, "Add" links to /create
│   ├── create/page.tsx          # NEW: full-page create form
│   └── edit/[id]/page.tsx       # NEW: full-page edit form
├── components/admin/
│   ├── dashboard/AdminLayoutClient.tsx   # MODIFY: remove duplicate "Category Tree" block
│   └── categories/
│       ├── CategoryForm.tsx     # MODIFY (minor): usable both as page body and (if still needed) standalone; keep field/validation logic
│       └── CategoryList.tsx     # MODIFY: edit action navigates via Link instead of onEdit(category) callback opening a modal
└── features/categories/
    └── categories.hooks.ts      # MODIFY: drop isModalOpen/modal-target state; keep saveCategory/removeCategory/tree/categories
```

**Structure Decision**: Single Next.js project, existing `(admin)` route
group. New routes follow the sibling `admin/products/create` and
`admin/products/edit/[id]` convention exactly (same directory depth, same
redirect-on-success behavior).
