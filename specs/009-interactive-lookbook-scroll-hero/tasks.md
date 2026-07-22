# Tasks: Interactive Lookbook — Scroll-Linked Hero

**Input**: `specs/009-interactive-lookbook-scroll-hero/{spec.md,plan.md}`
**Prerequisites**: `008-store-design-system-alignment` Phase 1 (dictionary + `LocaleProvider` wiring) present.
**Tests**: Not requested — implementer-owned verification is `npx tsc --noEmit` and `npm run build` only. All browser-based QA (scroll, `prefers-reduced-motion`, keyboard, RTL) is Human QA, performed by the user post-implementation, not a task in this list.

## Phase 0: Foundational — dependency + data hook (blocking)

- [] T001 Add `motion` to `package.json` dependencies; run install; confirm `npx tsc --noEmit` and `npm run build` stay green with the dependency present but unconsumed.
- [] T001a Apply Supabase migration `009-a`: add nullable `featured_sort INTEGER DEFAULT NULL` to `products` (additive, per the user's 2026-07-22 decision to add manual featured sort instead of implicit `created_at` ordering).
- [] T001b `src/features/shared/types.ts`: add `featured_sort: number | null` to `Product` (additive). Depends on: T001a.
- [] T001c `src/features/products/products.repository.ts`: update `getFeaturedProducts()`'s query to order by `featured_sort ASC NULLS LAST, created_at ASC`. Depends on: T001a, T001b.
- [] T001d `src/features/products/products.api.ts`: extend the product create/update mutation body to include `featured_sort`. Depends on: T001b.
- [] T001e `src/components/admin/products/ProductForm.tsx`: add an additive numeric "Featured sort" input, shown when `is_featured` is toggled on (mirrors the existing `theme_color`/`is_featured` additive-field pattern). Depends on: T001d.
- [] T002 `src/features/store/store.hooks.ts`: implement `useLookbookSections(featuredProducts)` — sorts by `featured_sort ASC` (nulls last), falling back to `created_at ASC` as a tiebreaker, caps at 4 (`MAX_HERO_SECTIONS`), returns `LookbookSection[]`. Depends on: T001b.
- [] T003 `src/features/store/store.hooks.ts`: remove `useLookbookActiveItem` after confirming `LookbookHero.tsx` is its only consumer (grep before delete). Depends on: T002 (new hook exists before old one is removed, so nothing is briefly unsupported).

**Checkpoint**: `featured_sort` migration applied and wired through repository/API/admin form; `motion` installed; section data hook exists; old click-state hook removed.

---

## Phase 1: User Story 1 - Static N-section hero, no scroll yet (Priority: P1, interim)

- [] T004 [US1] Rewrite `LookbookHero.tsx` to render all N sections' content (per-section headline/description/CTA/glow color) driven by a temporary `useState<number>` active-section index, using `useLookbookSections`. Depends on: T002.
- [] T005 [US1] `LookbookGlow.tsx`: widen `color` prop type to `MotionValue<string> | string` (works with either at this phase since nothing passes a `MotionValue` yet). Depends on: T001.
- [] T006 [US1] `ProductThumbRow.tsx`: wire `onSelect` to the temporary `activeIndex` state from T004 (interim click-based behavior, matching 007's UX for now). Depends on: T004.
- [] T007 [US1] `tsc`/`build` green. (Confirming `/` renders all sections correctly via the temporary click-state is Human QA — user-performed.)

**Checkpoint**: Visual design of every section is correct; scroll linkage not yet wired.

---

## Phase 2: User Story 1 - Scroll linkage (Priority: P1)

- [] T008 [US1] `LookbookHero.tsx`: add the `h-[N×100vh]` scroll-tracking outer container + `sticky top-0 h-screen overflow-hidden flex items-center` inner stage; wire `useScroll({ target: containerRef })`. Depends on: T004, T007.
- [] T009 [US1] `LookbookHero.tsx`: replace the temporary `useState` active-section with `useTransform`-derived `MotionValue`s for glow color (`breakpoints` → `theme_color` array) and per-section opacity/transform (triangular mapping per section). Depends on: T008.
- [] T010 [US1] `LookbookGlow.tsx`: confirm it renders via `motion.div` when passed a `MotionValue` (should already work from T005's type widening — verify, don't re-implement). Depends on: T009.
- [] T011 [US1] `ProductThumbRow.tsx`: `onSelect` becomes smooth-scroll-to-section (compute target scroll offset from the section's breakpoint and the container's bounding rect); active-thumbnail display subscribes to the scroll-derived index via `useMotionValueEvent`. Depends on: T009.
- [] T012 [US1] `tsc`/`build` green. (Confirming scrolling `/` visits every product's moment in order, forward and backward, with coherent mid-scroll interpolation is Human QA — user-performed.)

**Checkpoint**: Scroll-linked hero fully functional for the primary (motion-enabled) path.

---

## Phase 3: User Story 2 - Navbar legibility verification (Priority: P1)

- [] T013 [US2] Human QA note (user-performed, no code change expected): scroll through the hero at every intermediate position, confirm `StoreNavbar.tsx`'s transparent→`.store-glass` transition (from `008`) remains legible/interactive against every section's frame. If a legibility gap is found against a specific `theme_color`'s glow, file it as a follow-up — do not silently patch the navbar inside this spec's scope.

**Checkpoint**: Navbar behavior confirmed unaffected and sufficient.

---

## Phase 4: User Story 3 - Reduced-motion + edge-case fallbacks (Priority: P2)

- [] T014 [P] [US3] `LookbookHero.tsx`: add `useReducedMotion()` gate — when true, drive section opacity from the dot-nav's `activeIndex` state with a short `transition-opacity duration-150` CSS class instead of scroll-linked `MotionValue`s (reuse the Phase 1 temporary-state pattern as the permanent reduced-motion path). Depends on: T009.
- [] T015 [P] [US3] `LookbookHero.tsx`: add the `N < 2` fallback — static single-frame render (no scroll container, no dot-nav) when fewer than 2 eligible featured products exist. Depends on: T008.
- [] T016 [US3] Depends on: T014. (Toggling OS-level `prefers-reduced-motion` and reloading `/` to confirm the non-scroll-jacked path, plus a keyboard-only tab-through of every CTA and dot-nav item, is Human QA — user-performed.)
- [] T017 [US3] Temporarily set `is_featured=false` on 3 of the 4 current featured products via Supabase (read-only test data change, revert immediately after); restore the original `is_featured` values. Depends on: T015. (Confirming the `N=1` static fallback renders correctly with no crash is Human QA — user-performed.)

**Checkpoint**: Accessibility and data-edge-case fallbacks both verified.

---

## Phase 5: Polish — dictionary, RTL, dead-code cleanup

- [] T018 [P] Migrate every hardcoded string in `LookbookHero.tsx` and `ProductThumbRow.tsx` (eyebrow, fallback copy, CTA labels, `aria-label`s) to `t(key)` from `008`'s `store.*` dictionary — no new hardcoded string introduced. Depends on: `008` Phase 1, T012.
- [] T019 [P] Remove now-dead `.lookbook-morph` keyframe and this component's `.float` usage from `src/app/globals.css`/`LookbookHero.tsx` (superseded by scroll-driven transforms); confirm `.lookbook-glow`'s shape/blur utility remains and is still used. Depends on: T012.
- [] T020 Code review pass (not browser QA): confirm content column stays inline-start (FR-010), no physical-direction utility was introduced during the rewrite; confirm vertical transforms need no RTL adjustment (FR-011, expected to already hold).
- [] T021 Run `npx tsc --noEmit` and `npm run build`; fix any errors.
- [] T022 Measure and record the `motion` bundle-size delta on `/`'s build output (from the `npm run build` output — an implementer task). Confirming `/[slug]`, `/admin/*`, and every other `(store)` page/component are pixel-for-pixel unaffected is Human QA — user-performed.

---

## Dependencies & Execution Order

- Phase 0 blocks everything. T001a→T001b→{T001c,T001d}→T001e is a strict chain (migration before repository/API before admin form); T001–T003 (the `motion`/hook work) has no dependency on the T001a–e chain and can run in parallel with it.
- Phase 1 → Phase 2 is sequential (design verified with cheap interim state before scroll math is layered on).
- Phase 3 depends on Phase 2 and on `008`'s navbar work being present — verification-only, no code dependency beyond that.
- Phase 4's two fallback tasks (T014, T015) are parallelizable (different concerns within the same file — coordinate to avoid merge conflicts on `LookbookHero.tsx`); both depend on Phase 2.
- Phase 5's T018/T019 are parallelizable; T020–T022 depend on all of Phase 4/5 being in place.
- No dependency on `010-order-structure-alignment` — safe to run fully in parallel with it.
