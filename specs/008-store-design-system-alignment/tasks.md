# Tasks: Store Design-System Alignment (Theme + Bento/Neumorphism + Bilingual Toggle)

**Input**: `specs/008-store-design-system-alignment/{spec.md,plan.md}`
**Prerequisites**: `007-b2c-ecommerce-storefront` merged/present (it is, uncommitted in the working tree today).
**Tests**: Not requested — implementer-owned verification is `npx tsc --noEmit` and `npm run build` only. All browser-based QA (toggling, visual/RTL comparison, `/admin` regression) is Human QA — performed by the user post-implementation, not a task in this list.

## Phase 0: Foundational — shared hook parameterization (blocking)

**⚠️ CRITICAL**: No store-facing work can begin until this phase is complete and the admin-regression check passes.

- [ ] T001 Parameterize `src/features/theme/theme.hooks.ts`: `useTheme(storageKey: string = "admin-theme")`; thread `storageKey` through `getInitialTheme()`/`applyTheme()`. No admin call site changes.
- [ ] T002 Parameterize `src/features/i18n/i18n.hooks.tsx`: `LocaleProvider({ children, storageKey = "admin-locale" })`; thread `storageKey` through `getInitialLocale()`/`applyLocale()`. No admin call site changes. Depends on: none (parallel with T001).
- [ ] T003 Regression check: run `npx tsc --noEmit` and `npm run build`. (Browser confirmation that `/admin` theme/locale toggles still behave exactly as before T001/T002 is Human QA — user-performed, not part of this task.) Depends on: T001, T002.

**Checkpoint**: Both hooks accept a storage key; admin behavior is byte-for-byte unchanged.

---

## Phase 1: Foundational — store dictionary + layout plumbing (blocking)

- [ ] T004 Audit every hardcoded first-party string across `(store)`: `StoreNavbar`, `LookbookHero`, `ProductThumbRow`, `CategoryGrid`, `ProductCard`, `ProductGrid`, `CartDrawer`, `CartLineItem`, `CartPageBody`, `StoreCheckoutForm`, `StoreFooter`, `ProductDetail`, and `(store)/{page,products/page,cart/page,checkout/page}.tsx`. Produce the full `store.*` key list. Depends on: none.
- [ ] T005 Append the `store.*` `DictKey` union entries and their `en`/`ar` values to `src/features/i18n/dictionary.ts`, additive only (no existing admin key touched). Depends on: T004.
- [ ] T006 `src/app/(store)/layout.tsx`: add the two no-FOUC inline scripts (theme key `store-theme`, locale key `store-locale`, mirroring `(admin)/admin/layout.tsx`'s scripts exactly except for the key names and locale-default logic), add `suppressHydrationWarning` to `<html>`, wrap `{children}` in `<LocaleProvider storageKey="store-locale">`, change `<body>` to `bg-surface text-text-primary antialiased transition-colors`. Depends on: T002, T005.
- [ ] T007 Add `.store-glass` utility to `src/app/globals.css` (light default `rgba(255,255,255,0.85)` + blur + `border-bottom: 1px solid var(--color-border)`; `.dark .store-glass` override `rgba(15,23,42,0.7)`), inside the existing `@layer utilities` block, additive only. Depends on: none (parallel with T004–T006).
- [ ] T008 Verify: `npx tsc --noEmit`, `npm run build`; `/` still renders visually unchanged (nothing consumes the new keys/utility yet). Depends on: T006, T007.

**Checkpoint**: Dictionary + layout plumbing exist; nothing in the UI uses them yet.

---

## Phase 2: User Story 1 & 2 - Navbar toggles (Priority: P1)

- [ ] T009 [US1][US2] `src/components/store/StoreNavbar.tsx`: add theme toggle (`useTheme("store-theme")`, reusing the admin's sun/moon icon pair) and locale toggle (`useLocale()`, reusing the admin's EN/AR control pattern); swap `isScrolled ? "glass-dark" : ...` → `isScrolled ? "store-glass" : ...`; migrate every hardcoded string in this file to `t(key)`. Depends on: T006, T007, T008.
- [ ] T010 [US1][US2] Human QA note (user-performed, not an implementer task): end-to-end browser check that toggling theme and locale from `/` updates `<html>` correctly, persists across reload, and does not read/write the admin's `admin-theme`/`admin-locale` keys.

**Checkpoint**: The toggles exist and work from every `(store)` page (navbar is shared chrome).

---

## Phase 3: User Story 2 - Component & page string migration (Priority: P1)

Each of the following touches a disjoint file — parallelizable.

- [ ] T011 [P] [US2] Migrate `LookbookHero.tsx` strings (eyebrow, default headline/subtext, CTA labels) to `t(key)`; leave stage/scroll mechanics untouched (see spec Out of Scope — owned by `009`).
- [ ] T012 [P] [US2] Migrate `ProductThumbRow.tsx` surrounding chrome strings (if any beyond product-name `aria-label`) to `t(key)`.
- [ ] T013 [P] [US2] Migrate `CategoryGrid.tsx` strings to `t(key)`.
- [ ] T014 [P] [US2] Migrate `ProductCard.tsx` and `ProductGrid.tsx` strings (add-to-cart label, empty-state message, loading state) to `t(key)`.
- [ ] T015 [P] [US2] Migrate `CartDrawer.tsx`, `CartLineItem.tsx`, `CartPageBody.tsx` strings to `t(key)`.
- [ ] T016 [P] [US2] Migrate `StoreCheckoutForm.tsx` strings (every label/placeholder/button/error) to `t(key)`.
- [ ] T017 [P] [US2] Migrate `StoreFooter.tsx` and `ProductDetail.tsx` strings to `t(key)`.
- [ ] T018 [P] [US2] Migrate `(store)/page.tsx`, `products/page.tsx`, `cart/page.tsx`, `checkout/page.tsx` inline strings to `t(key)`.

**Checkpoint**: Zero hardcoded first-party Arabic-only string remains outside database content.

---

## Phase 4: User Story 1 - Theme-token migration (Priority: P1)

- [ ] T019 [P] [US1] Replace hardcoded `bg-dark-900`/`text-white`/`text-gray-300`/`text-gray-400`/`bg-dark-800` literals in `StoreFooter.tsx`, `ProductDetail.tsx`, `CartDrawer.tsx`, `CartLineItem.tsx`, `CartPageBody.tsx`, `ProductGrid.tsx` with `bg-surface`/`bg-surface-raised`/`text-text-primary`/`text-text-muted`/`border-border`.
- [ ] T020 [P] [US1] Same token migration for `(store)/page.tsx`, `products/page.tsx`, `cart/page.tsx`, `checkout/page.tsx` (page-level backgrounds/headings, if any beyond the layout's `<body>`).
- [ ] T021 [US1] Depends on: T019, T020. (Confirming no low-contrast/invisible text in either theme across every `(store)` page is Human QA — user-performed in-browser, not an implementer task.)

**Checkpoint**: Every `(store)` surface outside the hero's stage is theme-reactive.

---

## Phase 5: User Story 3 - Bento/Neumorphism restyle (Priority: P2)

- [ ] T022 [US3] `CategoryGrid.tsx`: asymmetric bento layout (`grid-cols-2 md:grid-cols-4`, one tile `col-span-2 row-span-2`) with `neu-raised` + `bg-surface-raised` tiles. Depends on: T013, T019.
- [ ] T023 [US3] `ProductCard.tsx`: `neu-raised` card + `.neu-btn`-style hover lift. Depends on: T014, T019.
- [ ] T024 [US3] `CartDrawer.tsx`/`CartLineItem.tsx`: `neu-raised` panel/rows, `.neu-btn` quantity stepper. Depends on: T015, T019.
- [ ] T025 [US3] `StoreCheckoutForm.tsx`: every input/select adopts `.neu-input` (matching `ProductForm.tsx`'s pattern exactly). Depends on: T016, T019.
- [ ] T026 [US3] Depends on: T022–T025. (Side-by-side visual comparison of `/products`, `/cart`, `/checkout` against `/admin`'s bento overview and `ProductForm.tsx` is Human QA — user-performed, not an implementer task.)

**Checkpoint**: The storefront visually reads as the same design-system family as the dashboard.

---

## Phase 6: Polish

- [ ] T027 Update `AGENTS.md` per FR-011: describe the public storefront as bilingual/direction-aware/theme-aware via runtime toggles.
- [ ] T028 Run `npx tsc --noEmit` and `npm run build`; fix any errors.
- [ ] T029 Confirm T027/T028 are both complete. The full four theme×locale combination pass, `(admin)` regression pass, and `/[slug]` funnel-identity check is Human QA (user-performed post-implementation, listed in plan.md's Verification Steps) — not an implementer task.

---

## Dependencies & Execution Order

- Phase 0 blocks everything (shared-hook risk gate).
- Phase 1 blocks Phase 2+.
- Phase 2 (navbar) blocks nothing structurally but should land before Phase 3/4 QA is meaningful (toggles need to exist to test string/token migration in both states) — recommended sequential.
- Phase 3 and Phase 4's tasks are each independently parallelizable (disjoint files) but both should complete before Phase 5's visual restyle, since bento/neu styling reads best once tokens are already correct.
- Phase 5 depends on the specific Phase 3/4 tasks noted per-task above.
- Phase 6 depends on everything above.
- This spec has no dependency on `010-order-structure-alignment` (disjoint files) — safe to run in parallel. `009-interactive-lookbook-scroll-hero` should start after this spec's Phase 1 (dictionary/layout plumbing) lands, since `009` needs `t(key)` and the theme system available for the hero's own copy and dark/light reconciliation.
