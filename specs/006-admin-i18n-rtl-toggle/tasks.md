# Tasks: Admin EN/AR + LTR/RTL Runtime Toggle

**Input**: `specs/006-admin-i18n-rtl-toggle/{spec.md,plan.md}`
**Prerequisites**: `004-admin-design-system` and `005-admin-bento-grid-redesign` merged.
**Tests**: Not requested — verification is `npx tsc --noEmit`, `npm run build`, manual toggle QA in both directions.

## Phase 2: Foundational

- [x] T001 Create `src/features/i18n/dictionary.ts`: a typed key union (e.g. `type DictKey = "nav.dashboard" | "nav.orders" | ...`) and `en`/`ar` records mapping every key to its string. Seed it by auditing every first-party string across `AdminLayoutClient.tsx`, `LoginForm.tsx`/login page, orders page/table, products pages/components, categories pages/components (incl. `001`'s create/edit pages), and the bento overview page/widgets (incl. `002`'s widget labels and `chartTheme.ts`'s `channelMeta` labels).
- [x] T002 Create `src/features/i18n/i18n.hooks.ts`: a `LocaleProvider` + `useLocale()` hook exposing `locale: "en" | "ar"`, `dir: "ltr" | "rtl"` (derived), `setLocale`, and `t(key: DictKey)`; persists to `localStorage` under `admin-locale`; defaults to `"ar"` when unset. Depends on: T001.

**Checkpoint**: Dictionary + hook exist; nothing consumes them yet.

---

## Phase 3: User Story 1 - Language/direction toggle (Priority: P1)

- [x] T003 Wrap the admin tree with `LocaleProvider` (in `src/app/(admin)/admin/layout.tsx` or inside `AdminLayoutClient.tsx`) and drive the admin root's `dir`/`lang` attributes from `useLocale()` instead of the hardcoded values. Depends on: T002.
- [x] T004 Add an EN/AR toggle control to `src/components/admin/dashboard/AdminLayoutClient.tsx`, calling `setLocale`. Depends on: T003.

**Checkpoint**: Toggling flips `dir`/`lang` immediately and persists across reloads.

---

## Phase 4: User Story 2 - String migration (Priority: P1)

- [x] T005 [P] Migrate all strings in `AdminLayoutClient.tsx` (nav labels, logout, mobile menu, user row) to `t(key)`.
- [x] T006 [P] Migrate all strings in `LoginForm.tsx` and `login/page.tsx` to `t(key)`.
- [x] T007 [P] Migrate all strings in `orders/page.tsx` and `OrdersTable.tsx` to `t(key)` (status/action labels stay driven by `orderStateMachine.ts`, only their displayed text changes).
- [x] T008 [P] Migrate all strings in `products/**/*.tsx`, `ProductList.tsx`, `ProductForm.tsx` to `t(key)`.
- [x] T009 [P] Migrate all strings in `categories/**/*.tsx`, `CategoryList.tsx`, `CategoryForm.tsx` to `t(key)`.
- [x] T010 [P] Migrate all strings in the bento overview page (`admin/page.tsx`) and chart components (`StatTile.tsx`, `chartTheme.ts`'s `channelMeta` labels, `ChartCard` titles/subtitles) to `t(key)`.

**Checkpoint**: Zero hardcoded first-party strings remain outside the dictionary.

---

## Phase 5: User Story 3 - Charts and numbers in both directions (Priority: P2)

- [x] T011 Verify `OrdersTrendChart`/`HorizontalBarChart` legend/label positioning under both `dir` values once T010 lands; adjust layout (not data) if a direction reads incorrectly. Depends on: T010.
- [x] T012 Spot-check `formatEgp`/`formatCompact` output in both directions — confirm numerals are correctly un-mirrored (standard bidi behavior); fix only if an actual regression is found.

**Checkpoint**: Charts and numbers correct in both directions.

---

## Phase 6: Polish

- [x] T013 Search the entire `(admin)` tree for any remaining physical-direction Tailwind utility and convert to logical — the FR-004/SC-003 completeness gate.
- [x] T014 Update `AGENTS.md` per FR-007: describe the admin dashboard as bilingual (Arabic default / English available) and direction-aware (RTL default / LTR available) via a runtime toggle.
- [x] T015 Run `npx tsc --noEmit` and `npm run build`; fix any errors.
- [x] T016 Manual QA: toggle EN/AR on every admin page (login, overview, orders, products, categories incl. create/edit) at desktop + mobile widths; confirm zero mixed-language chrome in either state and that the preference persists.

---

## Dependencies & Execution Order

- Phase 2 blocks everything.
- Phase 3 (T003→T004) is sequential.
- Phase 4's six tasks touch disjoint files — parallelizable, depend on Phase 2/3.
- Phase 5 depends on Phase 4 (T010 specifically).
- Phase 6 depends on everything above.
