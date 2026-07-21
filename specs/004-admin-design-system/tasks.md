# Tasks: Admin Design System Foundation

**Input**: `specs/004-admin-design-system/{spec.md,plan.md}`
**Tests**: Not requested — verification is `npx tsc --noEmit`, `npm run build`, manual light/dark QA.

## Phase 2: Foundational

- [x] T001 In `src/app/globals.css`: add class-based dark mode wiring (`@custom-variant dark (&:where(.dark, .dark *));` or equivalent) and a semantic token set with light + dark values — `--color-surface`, `--color-surface-raised`, `--color-border`, `--color-text-primary`, `--color-text-muted`, `--color-accent`, plus reused success/warning/danger from the existing green/amber/red palette. Scope so tokens/variant only affect elements under an admin `.dark`/root scope, never the public `(landing)` pages.
- [x] T002 [P] In `src/app/globals.css`: extend the existing `@supports not (color-mix(in oklab, red, red))` fallback block to cover any new dark-mode `color-mix`/opacity-modifier utilities introduced by T001, mirroring the pattern already used for the brand/green/red fallbacks.

**Checkpoint**: Tokens + dark variant exist; nothing consumes them yet.

---

## Phase 3: User Story 1 - Theme toggle (Priority: P1)

- [x] T003 Create `src/features/theme/theme.hooks.ts`: a `useTheme()` hook (and a `ThemeProvider` if needed for cross-component state) exposing `theme: "light" | "dark"`, `setTheme`, `toggleTheme`; persists to `localStorage` under `admin-theme`; on first read with no stored value, falls back to `window.matchMedia("(prefers-color-scheme: dark)")`. Depends on: T001.
- [x] T004 In `src/app/(admin)/admin/layout.tsx` (or a small inline script within it): apply the resolved theme class to the admin root before first paint to avoid a flash of the wrong theme — either a tiny blocking inline `<script>` that reads `localStorage`/`matchMedia` and sets the class synchronously, or `suppressHydrationWarning` + an early `useLayoutEffect`. Document which approach was used in a one-line comment. Depends on: T003.
- [x] T005 In `src/components/admin/dashboard/AdminLayoutClient.tsx`: add a theme toggle button (sun/moon icon) wired to `useTheme()`. Depends on: T003.

**Checkpoint**: Admin can toggle theme; preference persists; no FOUC.

---

## Phase 4: Dark-mode sweep (supports US1's "every surface re-themes" criterion)

- [x] T006 [P] Add `dark:` variants to `src/components/admin/dashboard/AdminLayoutClient.tsx` (sidebar, header, nav links, logout button) so it reads correctly in dark.
- [x] T007 [P] Add `dark:` variants to `src/components/admin/auth/LoginForm.tsx` and `src/app/(admin)/admin/login/page.tsx`.
- [x] T008 [P] Add `dark:` variants to `src/components/admin/OrdersTable.tsx` and `src/app/(admin)/admin/orders/page.tsx`. (Also swept `src/components/admin/orders/OrderDetailsDrawer.tsx`, the order detail panel opened from this table — not separately named in this task but covered by US1's "forms/tables/cards" acceptance criterion.)
- [x] T009 [P] Add `dark:` variants to `src/components/admin/products/{ProductList.tsx,ProductForm.tsx}` and `src/app/(admin)/admin/products/**/*.tsx`.
- [x] T010 [P] Add `dark:` variants to `src/components/admin/categories/{CategoryList.tsx,CategoryForm.tsx}` and `src/app/(admin)/admin/categories/**/*.tsx`.
- [x] T011 [P] Add `dark:` variants to `src/components/admin/charts/{StatTile.tsx,OrdersTrendChart.tsx,HorizontalBarChart.tsx,chartTheme.ts}` and `src/app/(admin)/admin/page.tsx`.

**Checkpoint**: No admin surface is unreadable/invisible in dark mode.

---

## Phase 5: Polish

- [x] T012 Run `npx tsc --noEmit` and `npm run build`; fix any errors. (Both pass clean, exit code 0.)
- [ ] T013 Manual QA: toggle light↔dark on every admin page at desktop + mobile widths; confirm no FOUC on reload with a stored dark preference; confirm the public `(landing)` pages are visually unaffected. **Left unchecked** — no browser session available in this environment to actually click the toggle and visually inspect; verified by construction instead (static grep audit confirmed zero un-swept `gray-*`/`bg-white`/hex-color utilities remain in any admin file, `(landing)` files show zero diff, and the token/variant/FOUC-script chain was traced end-to-end). A human or browser-tooled agent should still do a real visual pass before shipping.

---

## Dependencies & Execution Order

- Phase 2 blocks everything.
- Phase 3 (T003→T004→T005) is sequential (same toggle mechanism).
- Phase 4's six tasks touch disjoint files — parallelizable, but depend on Phase 2/3 existing.
- Phase 5 depends on everything above.
