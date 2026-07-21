# Implementation Plan: Admin EN/AR + LTR/RTL Runtime Toggle

**Branch**: `006-admin-i18n-rtl-toggle` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

## Amendment (2026-07-21): shell becomes a horizontal top bar

The user corrected the shell structure mid-implementation, referencing the
same "Coinix" screenshot used for `005`'s design direction — that reference
is actually a **horizontal top bar**, not a vertical sidebar (005 kept the
existing vertical sidebar and only restyled it; that was a misreading of
the reference, corrected here). `AdminLayoutClient.tsx` MUST be rebuilt as
a horizontal top bar as part of this feature, since the locale/theme
toggles' final position depends on it:
- **Left**: app logo + "7alm Admin" name, followed by horizontal nav tabs
  (Dashboard/Orders/Products/Categories) as pill-style tabs (active = filled
  pill, inactive = plain text/hover), matching the reference's
  "Coinix [Dashboard] Trade Market Analytics Portfolio OTC" row.
- **Right**: an avatar control with a dropdown (admin email/name + Logout),
  then the theme toggle (dark/light, from `004`), then the language toggle
  (EN/AR, this feature) — ending at the far right of the bar.
- Main content area becomes a single full-width column below the bar (no
  more `md:flex-row` split); mobile collapses the nav tabs into the
  existing hamburger-menu pattern, with the avatar/theme/language controls
  staying visible in the compact header.
- This supersedes `005`'s "Shell restyle" task's *specific structure*
  (vertical sidebar) while keeping its *token/spacing language* (rounded
  cards, `bg-surface`/`border-border` etc.) — reuse 005's visual language,
  just in a new arrangement.

## Summary

Add a locale dictionary (`en`/`ar`) and `LocaleProvider`/`useLocale()`
hook, a language/direction toggle in the sidebar, migrate every first-party
admin string to `t(key)`, and sweep for any remaining physical-direction
Tailwind utilities. Depends on `004` (tokens/dark mode) and `005` (bento
layout, logical-property markup) already being merged.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 16
**Primary Dependencies**: none new — hand-rolled dictionary/hook, no i18n library (scope doesn't need ICU plurals/interpolation beyond simple string swap)
**Storage**: `localStorage` only (locale preference)
**Testing**: `npx tsc --noEmit`, `npm run build`, manual toggle QA across every admin page in both directions
**Target Platform**: Web, `(admin)/admin/*`
**Constraints**: MUST land after `004` and `005`; zero mixed-language chrome in either state; numeric/currency formatting must stay correct and un-mirrored
**Scale/Scope**: New `src/features/i18n/*` module + every existing admin component/page (string migration + final logical-property sweep)

## Constitution Check

- **I. Layered Architecture**: PASS — locale is a client-only UI preference (like `004`'s theme), no repository/service involvement.
- **II. TypeScript Strict**: PASS — dictionary keys should be typed (e.g. a union of known keys) so `t()` misuse is a compile error, not a runtime blank string.
- **III. RTL/i18n Correctness**: this feature is the direct implementation of Principle III's toggle requirement — the FR-004 sweep is the final compliance gate.
- **IV. No Business Logic in Components**: PASS — `t()` calls are simple lookups, not logic.
- **V. Reuse Existing Primitives**: PASS — no new dependency.
- **VI. State Machine / Factory**: PASS — untouched.

No violations.

## Project Structure

```text
src/features/i18n/
├── dictionary.ts          # NEW: en/ar string maps, keyed by stable ids
└── i18n.hooks.ts           # NEW: LocaleProvider, useLocale() (locale, dir, setLocale, t)

src/components/admin/dashboard/AdminLayoutClient.tsx   # MODIFY: language/direction toggle control; wraps children in LocaleProvider or consumes app-level provider
src/app/(admin)/admin/layout.tsx                        # MODIFY: dir/lang now driven by stored locale (client-side), default ar/rtl
# String migration + final logical-property sweep across every admin file (no new components):
src/app/(admin)/admin/**/*.tsx
src/components/admin/**/*.tsx
AGENTS.md                                               # MODIFY: FR-007 doc update
```

**Structure Decision**: One new small feature module (`i18n`) holding the dictionary + hook; every other change is an in-place string/class migration.
