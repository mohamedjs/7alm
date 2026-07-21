# Implementation Plan: Admin Design System Foundation

**Branch**: `004-admin-design-system` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

## Summary

Add class-based dark mode to Tailwind v4's CSS-first config in
`globals.css`, define a small semantic color-token set (light + dark
values), add a persisted theme toggle to `AdminLayoutClient.tsx`, and sweep
every existing admin component with `dark:` variants so nothing breaks.
Scoped so the `.dark` class and new tokens never affect the public
`(landing)` route group.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 16, Tailwind CSS v4 (CSS-first `@theme`, no `tailwind.config.js`)
**Primary Dependencies**: none new — pure CSS/Tailwind + a small React context/hook for the toggle
**Storage**: `localStorage` only (theme preference)
**Testing**: `npx tsc --noEmit`, `npm run build`, manual light/dark QA pass
**Target Platform**: Web, `(admin)/admin/*` only
**Constraints**: Existing Safari-15 `@supports not (color-mix...)` fallback block must keep working; `.dark` scoping must not leak into `(landing)`
**Scale/Scope**: `globals.css` + `AdminLayoutClient.tsx` + a `dark:` sweep across every existing admin component/page

## Constitution Check

- **I. Layered Architecture**: PASS — no repository/service/API changes.
- **II. TypeScript Strict**: PASS.
- **III. RTL/i18n**: N/A directly (this feature doesn't touch direction), but tokens introduced here MUST be direction-agnostic so `005`/`006` can reuse them under either `dir`.
- **IV. No Business Logic in Components**: PASS — theme state lives in a small hook/context, not scattered `useState`s.
- **V. Reuse Existing Primitives**: PASS — extends the existing `globals.css` token approach (already has a brand/gray/etc. `@theme` block) rather than introducing a separate theming library.
- **VI. State Machine / Factory**: N/A.

No violations.

## Project Structure

```text
src/app/globals.css                              # MODIFY: dark variant, semantic tokens, dark Safari-15 fallbacks
src/components/admin/dashboard/AdminLayoutClient.tsx   # MODIFY: theme toggle control + init logic
src/features/theme/                              # NEW: theme.hooks.ts (useTheme: get/set/persist), no repository/service layers needed (client-only UI preference)
src/app/(admin)/admin/layout.tsx                 # MODIFY (maybe): inline no-FOUC script or effect wiring
# dark: sweep across all existing admin components/pages (no new files):
src/components/admin/{OrdersTable,auth/LoginForm,products/*,categories/*,charts/*}.tsx
src/app/(admin)/admin/{page,orders/page,products/**,categories/**,login/page}.tsx
```

**Structure Decision**: New `src/features/theme/theme.hooks.ts` is UI-preference state only (no Supabase involvement), so it intentionally skips the repository/service layers — consistent with Constitution I, which only mandates those layers for server-backed domains.
