# Feature Specification: Admin Design System Foundation (Theme Tokens + Dark/Light Toggle)

**Feature Branch**: `004-admin-design-system`
**Created**: 2026-07-21
**Status**: Draft
**Input**: User description: "make sure the [admin] website supports dark mode and light mode; redesign following a proper Tailwind theme" (part of a larger request also covering a bento-grid redesign and an EN/AR + RTL toggle, split into `005` and `006`)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin can switch between light and dark theme (Priority: P1)

As an admin, I can toggle between light and dark theme from the sidebar; my
choice is remembered across visits.

**Why this priority**: Directly requested; also the foundation every later
visual change (005 bento redesign, 006 RTL toggle) is built on top of.

**Independent Test**: Open any `/admin/*` page, click the theme toggle →
the whole page switches from light to dark instantly, no reload needed.
Reload the page → the chosen theme persists.

**Acceptance Scenarios**:

1. **Given** an admin visits `/admin` for the first time (no stored
   preference), **When** the page loads, **Then** it defaults to the
   browser/OS `prefers-color-scheme`.
2. **Given** an admin clicks the theme toggle, **When** it switches to
   dark, **Then** every visible surface (sidebar, cards, tables, forms,
   charts) re-themes — no white-on-white or black-on-black unreadable text
   anywhere.
3. **Given** an admin picked dark previously, **When** they return in a new
   session, **Then** the page loads directly in dark (from `localStorage`,
   not just OS preference).

---

### User Story 2 - Consistent design tokens power every admin surface (Priority: P2)

As a future contributor (human or agent) building admin UI, I use a small
set of named tokens (surface, border, text, accent, status colors) instead
of guessing which raw Tailwind gray/indigo/amber shade to use, so new UI is
automatically consistent and automatically themeable.

**Why this priority**: Enables 005 (bento redesign) and 006 (RTL toggle) to
build correctly-themed UI without re-solving color/spacing decisions per
component; not user-facing on its own.

**Independent Test**: Grep any newly-written admin component for raw
`gray-`/`indigo-`/`amber-` color utilities outside the token layer — there
should be none in files touched by this feature.

**Acceptance Scenarios**:

1. **Given** a new admin component needs a card background, **When** the
   author reaches for a class, **Then** a token (e.g. `bg-surface`) exists
   that adapts automatically to light/dark.

### Edge Cases

- A user has `prefers-color-scheme: dark` at the OS level but has
  explicitly picked light in the admin before → the explicit choice wins
  (stored preference overrides OS default, standard pattern).
- First paint before the theme-detection script runs must not show a
  flash of the wrong theme (FOUC) — acceptable mitigations: an inline
  blocking script in `<head>` that sets the class before paint, or
  `suppressHydrationWarning` plus an early effect; document whichever is
  chosen.
- The public `(landing)` route group is NOT part of this feature — it
  already has its own fixed dark aesthetic and must be visually unaffected.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `globals.css` MUST gain a class-based dark-mode variant
  (`@custom-variant dark (&:where(.dark, .dark *));` or equivalent) so
  Tailwind's `dark:` utilities work admin-wide once a `.dark` class is
  present on an ancestor.
- **FR-002**: The `.dark` class MUST be applied/removed only on the admin
  root (e.g. the `<html>` element while under `(admin)/admin/*`, or a
  wrapper scoped to the admin layout) — it MUST NOT leak into or affect the
  public `(landing)` route group.
- **FR-003**: `globals.css` MUST define a semantic token set for the admin
  surface, with both a light and dark value for each: surface (page bg),
  surface-raised (card bg), border, text-primary, text-muted, accent
  (interactive/brand), and status colors (success/warning/danger) reused
  from the existing brand/green/amber/red palette already in the file.
- **FR-004**: `AdminLayoutClient.tsx` MUST gain a theme toggle control
  (icon button, e.g. sun/moon) that flips the `.dark` class, persists the
  choice to `localStorage` under a dedicated key, and initializes from
  `localStorage` → falling back to `prefers-color-scheme` on first visit.
- **FR-005**: Every existing admin component (sidebar, login, orders table,
  products list/form, categories list/form, overview page, all chart
  components under `src/components/admin/charts/*`) MUST be swept for
  `dark:` variants so nothing is unreadable/invisible when dark is active —
  this pass does not require full token migration of every element (that
  continues in 005), only that dark mode is not visually broken anywhere.
- **FR-006**: The existing Safari-15 `@supports not (color-mix...)`
  fallback block in `globals.css` MUST be extended to cover any new
  dark-mode `color-mix`/opacity-modifier utilities this feature introduces,
  consistent with why that fallback block exists today.
- **FR-007**: This feature MUST NOT change any business logic, data
  fetching, or component behavior — it is styling/theming only.

### Key Entities

None — presentation-layer only, no data model changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every admin page renders correctly and legibly in both light
  and dark theme (manual QA pass, desktop + mobile widths).
- **SC-002**: Theme preference persists across reloads and new sessions.
- **SC-003**: No flash-of-wrong-theme on first paint (verified by reload
  testing with a stored dark preference).
- **SC-004**: The public `(landing)` pages are pixel-identical to before
  this feature (no regression from the dark-mode wiring).
- **SC-005**: `npx tsc --noEmit` and `npm run build` both pass.

## Assumptions

- Class-based dark mode (a `.dark` class toggled by JS), not
  `prefers-color-scheme`-only, since the user explicitly wants a toggle,
  not just automatic OS-following behavior.
- This feature does NOT yet implement the bento grid layout (005) or the
  language/direction toggle (006) — it only builds the token + dark/light
  foundation those two consume. Landing on this first is what makes 005 and
  006 cheap instead of each re-deriving color decisions.
- Token naming is deliberately small and semantic (not a full design-token
  spec with typography/spacing scales) — scope stays to color/surface
  tokens needed for dark mode; typography/spacing conventions can be
  extended later if 005 needs them.
