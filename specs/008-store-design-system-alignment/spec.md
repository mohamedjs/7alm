# Feature Specification: Store Design-System Alignment (Theme + Bento/Neumorphism + Bilingual Toggle)

**Feature Branch**: `008-store-design-system-alignment`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Redesign the 7alm public storefront so it supports both dark and light theme (same system as the dashboard), adopts the dashboard's Bento Grid + Neumorphism visual language, and becomes bilingual (EN/AR + RTL/LTR runtime toggle, like the dashboard)." Sequenced first among the three redesign specs (008/009/010) — the theme, token, and locale plumbing this spec adds is a prerequisite for `009-interactive-lookbook-scroll-hero`'s hero copy and dark/light reconciliation.

**Depends on**: `007-b2c-ecommerce-storefront` (currently uncommitted in the working tree) — the `(store)` route group, its components, cart, and the `theme_color`/`is_featured`/`order_items` schema already exist and are the baseline this spec restyles/re-strings in place. No new migration is introduced here.

## Context — what already exists

Per `specs/007-b2c-ecommerce-storefront/plan.md` and direct inspection of the working tree, the storefront is already built:

- `src/app/(store)/layout.tsx`, `page.tsx`, `products/page.tsx`, `cart/page.tsx`, `checkout/page.tsx` — real routes.
- `src/components/store/{StoreNavbar,LookbookHero,LookbookGlow,ProductThumbRow,CategoryGrid,ProductCard,ProductGrid,CartDrawer,CartLineItem,CartPageBody,StoreCheckoutForm,StoreFooter,ProductDetail}.tsx` — real components.
- `src/features/{store,cart}/*` — real RTK Query/Redux modules.
- **Gap inherited from 007, not this spec's job to close**: `src/app/(store)/category/[slug]/page.tsx` and `src/app/(store)/product/[slug]/page.tsx` do not exist yet (empty directories) even though `ProductDetail.tsx` is already written and waiting to be wired up. This spec does not add those pages; whatever token/locale system it establishes will simply apply automatically once 007's own remaining phase ships them.

Today, every one of the files above is **dark-only** (hardcoded `bg-dark-900`, `text-white`, `text-gray-300/400`, `.glass-dark`) and **Arabic-only** (hardcoded literal Arabic strings, no `t(key)` call anywhere in `(store)`). This spec changes both, reusing the dashboard's existing mechanisms rather than inventing new ones.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A customer can use the store in light or dark mode (Priority: P1)

As a storefront visitor, I can toggle between dark and light appearance from the navbar, and every page — home, products, cart, checkout, and the footer — renders correctly and legibly in whichever mode is active, using the same visual system the admin dashboard already uses.

**Why this priority**: This is the explicit, first-listed ask, and it's the foundation every other visual change in `009` sits on top of.

**Independent Test**: Load `/`, toggle theme → dark class removed/added on `<html>`, every store surface (nav, hero chrome around the immersive stage, category grid, product grid, cart drawer/page, checkout form, footer) re-renders in the new mode with no unreadable/low-contrast text. Reload → the choice persists.

**Acceptance Scenarios**:

1. **Given** a first-time visitor with no stored theme preference, **When** they load `/`, **Then** the store renders using the browser/OS color-scheme preference (matching how the admin dashboard defaults today), falling back to dark if no preference is reported.
2. **Given** a visitor toggles to light mode, **When** the page updates, **Then** `.dark` is removed from the store's `<html>` and every token-driven surface (`bg-surface`, `text-text-primary`, `neu-*` shadows) switches to its light values — no leftover dark-only literal class produces unreadable text.
3. **Given** a visitor toggles back to dark, **When** the page updates, **Then** `.dark` is re-applied and the store returns to its current dark appearance.
4. **Given** a visitor picked light mode previously, **When** they return in a new session, **Then** the store loads directly in light mode from `localStorage`, with no flash of dark mode first.

---

### User Story 2 - A customer can use the store in English or Arabic, LTR or RTL (Priority: P1)

As a storefront visitor, I can toggle the store's language between Arabic (RTL) and English (LTR) from the navbar; navigation, hero copy, product/category chrome, cart, checkout, and footer strings all switch together, and my choice persists.

**Why this priority**: Explicit, first-listed ask; substance of the bilingual requirement, not decoration.

**Independent Test**: Toggle language on every store page — no Arabic string is visible while English is active, and vice versa; `dir`/`lang` flip together with the strings.

**Acceptance Scenarios**:

1. **Given** Arabic is active (the default), **When** any store page renders, **Then** every first-party string on that page comes from the Arabic side of the store's dictionary entries.
2. **Given** a visitor switches to English, **When** the page updates, **Then** `dir="ltr" lang="en"` applies, every first-party string switches to English, and no RTL-only spacing/mirroring artifact remains (logical properties already used throughout `(store)` per Constitution III continue to do their job).
3. **Given** English is active, **When** the visitor reloads, **Then** English/LTR loads directly from `localStorage`, independently of whatever the admin dashboard's own language preference happens to be in the same browser (store and admin preferences do not couple).
4. **Given** a visitor has product names/descriptions in Arabic only (database content), **When** English is active, **Then** the store's own chrome (nav, buttons, labels) is in English while product/category names sourced from the database remain as stored — this is a UI-chrome translation, not a content-localization system (mirrors the admin's own documented scope boundary in `006-admin-i18n-rtl-toggle`).

---

### User Story 3 - The store visually matches the dashboard's Bento Grid + Neumorphism language (Priority: P2)

As a returning admin/stakeholder comparing the storefront to the dashboard, the storefront's cards, grids, and inputs read as the same product family — extruded neumorphic surfaces, bento-style asymmetric grids where appropriate — rather than a visually disconnected dark landing page bolted onto a light/dark admin.

**Why this priority**: Explicit ask #2; sequenced after theme/i18n plumbing (P1) because the neumorphic/bento treatment needs the token system in place first to look correct in both modes.

**Independent Test**: Compare `/products`, the category grid on `/`, and `/cart` side-by-side with `/admin` — cards use the same `neu-raised`/`neu-input` shadow language and `bg-surface`/`bg-surface-raised` tokens, not one-off dark-mode-only styling.

**Acceptance Scenarios**:

1. **Given** the category grid renders on `/`, **When** viewed in either theme, **Then** category tiles use `neu-raised`-style extruded surfaces on `bg-surface-raised`, arranged in an asymmetric bento pattern (not a uniform equal-size grid), matching the admin overview's bento pattern.
2. **Given** a product card renders in `/products` or the cart, **When** viewed in either theme, **Then** it uses the same neumorphic shadow tokens as an admin card, adapted for storefront imagery (image fills the card top, neumorphic frame around it).
3. **Given** a form input renders in the checkout form, **When** focused, **Then** it uses the existing `.neu-input` utility exactly as the admin's `ProductForm` does — no separate input styling system.

### Edge Cases

- The immersive Lookbook hero (owned by `009-interactive-lookbook-scroll-hero`) is intentionally exempt from the light/dark toggle's effect on its *background stage* — see `009`'s Open Questions for the reconciliation; this spec's job is limited to making the toggle exist and correctly govern every surface *outside* the hero's dark stage (nav chrome, hero's own text/CTA still use theme-reactive tokens where they aren't part of the "stage").
- Switching language mid-checkout must not lose in-progress form input (mirrors `006`'s same rule) — the toggle changes chrome/labels only.
- A customer with no JS (or JS disabled) sees whatever the server-rendered default is (Arabic/RTL, theme per no-FOUC script default) — this is an acceptable, already-existing limitation shared with the admin dashboard.
- Long English strings in fixed-width chrome (nav links, cart badge) must wrap/truncate gracefully, same verification discipline as `006` FR-level edge case.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The store MUST expose a dark/light theme toggle, reusing `src/features/theme/theme.hooks.ts`'s `useTheme()` mechanism (parameterized to a store-specific `localStorage` key so store and admin theme preferences do not couple in the same browser).
- **FR-002**: The store MUST expose an EN/AR + LTR/RTL toggle, reusing `src/features/i18n/i18n.hooks.tsx`'s `LocaleProvider`/`useLocale()` mechanism (parameterized to a store-specific `localStorage` key), with the store's own dictionary entries added to `src/features/i18n/dictionary.ts` under a `store.*` key namespace.
- **FR-003**: Both toggles MUST be reachable from `StoreNavbar.tsx` on every `(store)` page, visually consistent with (not copy-pasted pixel-identical to, since the navbar layouts differ) the admin's toggle affordance in `AdminLayoutClient.tsx`.
- **FR-004**: Every first-party string currently hardcoded in Arabic across `(store)` components and pages MUST be migrated to `t(key)` with both `en` and `ar` dictionary entries — same completeness bar as `006` FR-003, scoped to `(store)` instead of `(admin)`.
- **FR-005**: Every `(store)` component MUST use logical CSS properties exclusively (already mostly true per 007's plan; this is the final compliance sweep) — no physical-direction utility remains.
- **FR-006**: Every `(store)` surface outside the Lookbook hero's dark stage MUST render correctly in both themes using the existing semantic tokens (`bg-surface`, `bg-surface-raised`, `border-border`, `text-text-primary`, `text-text-muted`, `text-accent`) instead of hardcoded `dark-*`/`gray-*`/`white` literals.
- **FR-007**: `StoreNavbar.tsx`'s scrolled-state treatment MUST become theme-reactive (its current `.glass-dark` is dark-only) via a new additive `globals.css` utility that mirrors the existing light/dark-override pattern already used for `--glow-color` etc., not a new mechanism.
- **FR-008**: Category tiles, product cards, the cart panel, and checkout form inputs MUST adopt the existing `neu-raised`/`neu-input` utilities and `bg-surface`/`bg-surface-raised` tokens — reusing `src/app/globals.css`'s neumorphism system as-is (Constitution V).
- **FR-009**: The category grid on `/` MUST be restyled into an asymmetric bento arrangement (not a uniform grid), matching the admin overview's bento pattern.
- **FR-010**: This feature depends on nothing new being migrated in Supabase — `theme_color`, `is_featured`, and `order_items` already exist from `007`; no schema change ships with this spec.
- **FR-011**: `AGENTS.md` MUST be updated to describe the public storefront as bilingual and direction-aware (RTL default / LTR available) and theme-aware (dark default / light available) via runtime toggles — no longer "RTL/Arabic-only, fixed, dark-only."

### Key Entities

- **Store locale/theme preference**: `"en"|"ar"` and `"light"|"dark"`, `localStorage`-only (no DB persistence), scoped to the storefront's own keys — independent of the admin's identically-shaped preferences in the same browser.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every `(store)` page can be toggled between light/dark and EN/AR·LTR/RTL at runtime with zero mixed-language chrome and zero illegible/low-contrast surfaces in any of the four combinations.
- **SC-002**: Theme and locale preferences persist across reloads, independently of the admin dashboard's own preferences in the same browser.
- **SC-003**: Category tiles, product cards, cart, and checkout inputs visually read as the same design system as the admin dashboard (neumorphic shadows, bento asymmetry) in a side-by-side manual comparison.
- **SC-004**: `npx tsc --noEmit` and `npm run build` both pass.
- **SC-005**: Zero behavior change to `(landing)` (the single-product funnel) and `(admin)` — this spec only touches `(store)` files plus the two shared hooks (`theme.hooks.ts`, `i18n.hooks.tsx`), and those two hooks' default parameter values preserve the admin's exact current behavior.

## Out of Scope

- Building `src/app/(store)/category/[slug]/page.tsx` or `src/app/(store)/product/[slug]/page.tsx` — these are unshipped remainder of `007`'s own scope, not this spec's.
- The Interactive Lookbook scroll-driven hero mechanics (owned by `009`) — this spec only ensures the hero's *chrome* (CTA/eyebrow/nav) is theme/locale-reactive where it isn't part of the deliberately-dark "stage"; the scroll orchestration itself is `009`.
- Any change to `order_items`/n8n/funnel order-creation logic (owned by `010`).
- Translating database content (product names/descriptions, category names) — chrome-only, same boundary as `006`.
- Any new Supabase migration.

## Assumptions

- Arabic/RTL remains the storefront's default (matching current behavior and the admin's own default), with English/LTR as the explicit opt-in.
- Dark remains the storefront's default `localStorage`-unset appearance policy, deferring first to OS `prefers-color-scheme` exactly like the admin does today — not a hardcoded "always dark on first visit" policy, since the ask is genuine dark/light parity with the dashboard, not a cosmetic light-mode option nobody defaults to.
- `localStorage`-only persistence is sufficient; no server-side "customer preference" concept is introduced (the store has no accounts).
- The two shared hooks (`theme.hooks.ts`, `i18n.hooks.tsx`) can be safely parameterized (storage key) without changing their behavior for existing admin callers that don't pass the new parameter.

## Open Questions

- **Hero exception boundary**: exactly which hero elements count as "the dark stage" (exempt from the light-mode toggle) vs. "chrome around the stage" (theme-reactive) is specified precisely in `009`'s plan, not here — flagging the dependency so reviewers don't expect this spec alone to resolve it.
- Should the store's theme/locale toggle controls be visually identical to the admin's, or restyled to fit the navbar's transparent/glass aesthetic? Recommendation: same icons/behavior (`useTheme`/`useLocale`), restyled container to fit the navbar (transparent-friendly, not the admin's bordered pill) — needs a design nod before implementation, not a blocking decision.
