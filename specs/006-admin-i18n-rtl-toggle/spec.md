# Feature Specification: Admin EN/AR + LTR/RTL Runtime Toggle

**Feature Branch**: `006-admin-i18n-rtl-toggle`
**Created**: 2026-07-21
**Status**: Draft
**Input**: User description: "make sure the [admin] website uses RTL and LTR" — clarified as a runtime toggle between English/LTR and Arabic/RTL (not a one-way Arabic flip), admin-only in scope. Sequenced after `004-admin-design-system` and `005-admin-bento-grid-redesign`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin can switch language and direction at runtime (Priority: P1)

As an admin, I can toggle between English (LTR) and Arabic (RTL) from the
sidebar; the whole admin shell — direction, first-party copy — switches
immediately, and my choice persists across visits.

**Why this priority**: This is the explicit ask; it's also what everything
else in `004`/`005` was built to make cheap.

**Independent Test**: Load any `/admin/*` page, toggle language → `dir`
and `lang` flip, all first-party UI copy switches language, layout mirrors
correctly (thanks to `005`'s logical-property markup). Reload → the choice
persists.

**Acceptance Scenarios**:

1. **Given** an admin has no stored language preference, **When** they
   visit `/admin` for the first time, **Then** it defaults to Arabic/RTL
   (matching the public storefront's default language).
2. **Given** an admin toggles to English, **When** the page updates,
   **Then** `dir="ltr" lang="en"` is applied and every first-party string
   switches to English, with no leftover mirrored-for-RTL spacing that
   looks wrong in LTR.
3. **Given** an admin toggles back to Arabic, **When** the page updates,
   **Then** `dir="rtl" lang="ar"` is applied, all copy is Arabic, and
   layout mirrors correctly.
4. **Given** an admin picked English previously, **When** they return in a
   new session, **Then** the page loads directly in English (from
   `localStorage`), not the Arabic default.

---

### User Story 2 - Every first-party string is translated both ways (Priority: P1)

As a user of the toggle, I never see a mix of Arabic and English chrome in
the same view — every nav label, button, table header, form label, empty
state, and chart title is available in both languages.

**Why this priority**: A toggle that only half-translates is worse than no
toggle — this is the substance of the feature, not decoration.

**Independent Test**: Toggle language on every admin page (login, overview,
orders, products list/create/edit, categories list/create/edit) — no
English string is visible while Arabic is active, and vice versa.

**Acceptance Scenarios**:

1. **Given** Arabic is active, **When** any admin page renders, **Then**
   zero hardcoded English strings from this codebase are visible (upstream
   Supabase/auth error strings are out of scope, see Edge Cases).
2. **Given** English is active, **When** any admin page renders, **Then**
   zero hardcoded Arabic strings are visible.

---

### User Story 3 - Charts and numbers stay correct in both directions (Priority: P2)

As an admin, charts remain legible and numeric/currency values remain
correctly formatted regardless of which direction is active.

**Why this priority**: Charts are the highest-risk mirroring surface;
sequenced after the simpler CRUD screens are proven correct by `005`.

**Independent Test**: Toggle direction while viewing the Overview page —
chart titles/legends translate and reposition correctly; currency/percent/
count values remain correctly formatted and un-mirrored in both directions.

**Acceptance Scenarios**:

1. **Given** direction is RTL, **When** a bar chart renders, **Then** its
   labels and reading order are correct for RTL while numeric values inside
   it are not mirrored.

### Edge Cases

- Error/toast strings that originate directly from Supabase/auth (not
  authored in this codebase) MAY remain in their original language — out
  of scope to intercept every upstream error string; this is an explicit,
  documented limitation, not a silent gap.
- Switching language mid-form (e.g. while editing a product) must not lose
  the admin's in-progress form input — the toggle changes chrome/labels
  only, never form field values.
- Long Arabic strings in fixed-width UI (sidebar items, buttons) must wrap
  or truncate gracefully in both directions — inherited from `005`'s
  responsive bento/table layouts, verified again here now that real
  (often longer) Arabic strings are in play.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Add a locale/dictionary module (e.g.
  `src/features/i18n/dictionary.ts`) with `en` and `ar` string maps keyed
  by stable ids, plus a `LocaleProvider`/`useLocale()` hook exposing
  `locale`, `dir`, `setLocale(locale)`, and a `t(key)` lookup function.
- **FR-002**: Add a language/direction toggle control in
  `AdminLayoutClient.tsx` (e.g. an "EN / AR" switch) that calls
  `setLocale`, which updates `dir`/`lang` on the admin root and persists
  the choice to `localStorage` under a dedicated key; default (no stored
  preference) is `ar`/`rtl`.
- **FR-003**: Every first-party string in every admin component and page
  (shell/sidebar, login, overview incl. all `005` bento cards and `002`
  widgets, orders, products list/create/edit, categories list/create/edit
  incl. `001`'s dedicated pages) MUST be migrated from a hardcoded literal
  to `t(key)` with both an `en` and `ar` entry in the dictionary.
- **FR-004**: Any physical-direction Tailwind utility remaining anywhere in
  `(admin)` MUST be converted to a logical equivalent — this is the
  completeness sweep; `005` should have already eliminated most of them.
- **FR-005**: Directional icons (chevrons, arrows) MUST flip correctly when
  direction toggles.
- **FR-006**: Existing currency/number formatting (`formatEgp`,
  `formatCompact`) MUST continue to produce correct, un-mirrored output in
  both directions.
- **FR-007**: `AGENTS.md` MUST be updated to describe the admin dashboard
  as bilingual (Arabic default / English available) and direction-aware
  (RTL default / LTR available) via a runtime toggle — not fixed LTR, and
  not fixed RTL.
- **FR-008**: This feature depends on `004-admin-design-system` and
  `005-admin-bento-grid-redesign` already being merged, since it translates
  and direction-flips the pages/widgets/layout they create.

### Key Entities

- **Locale**: `"en" | "ar"`, drives `dir`/`lang` and dictionary lookups; no
  database persistence, `localStorage` only (this is a per-admin-browser
  UI preference, not account data).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every admin page can be toggled between English/LTR and
  Arabic/RTL at runtime with zero mixed-language chrome in either state.
- **SC-002**: Language/direction preference persists across reloads and
  sessions.
- **SC-003**: No visually broken/overlapping spacing in either direction at
  desktop or mobile widths (manual QA pass across all admin pages).
- **SC-004**: `npx tsc --noEmit` and `npm run build` both pass.
- **SC-005**: `AGENTS.md` accurately describes the bilingual, direction-
  aware admin (no contradiction between docs and shipped behavior).

## Assumptions

- Arabic remains the default (matching the public storefront's language),
  with English as the explicit opt-in — not the other way around.
- This is a UI-chrome translation only: product names, customer data, and
  other database content are NOT translated (out of scope; would require a
  content-localization system, a different and much larger feature).
- `localStorage`-only persistence is sufficient — no server-side "admin
  language preference" column is introduced.
