# Feature Specification: Interactive Lookbook — Scroll-Linked Hero

**Feature Branch**: `009-interactive-lookbook-scroll-hero`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "New homepage hero — an immersive 'Interactive Lookbook' taking the full viewport, with a scroll-linked animation. Fixed glass navbar, sticky `h-[300vh]`→`sticky h-screen` scroll container, split layout (text left, product right over a dark `#0B0B0F` stage with a soft radial glow), Motion (`motion/react`) driving `useScroll`/`useTransform` across an array of showcase products with per-product `themeColor` crossfades." Sequenced after `008-store-design-system-alignment` (needs the dictionary/theme plumbing for the hero's own copy and the dark/light reconciliation) and independent of `010-order-structure-alignment`.

## Context — what this replaces

`007-b2c-ecommerce-storefront` already shipped a "Dynamic Lookbook" hero (`src/components/store/LookbookHero.tsx` + `LookbookGlow.tsx` + `ProductThumbRow.tsx`, `src/features/store/store.hooks.ts`'s `useLookbookActiveItem`) that is **click-driven**: a row of up to 4 featured-product thumbnails, clicking one re-points React state, and a CSS keyframe (`.lookbook-morph`) crossfades the showcase image on remount. 007's own plan explicitly chose CSS-only over `framer-motion`, with a stated escape hatch: *"if the crossfade+scale needs orchestrated sequencing... rather than a simple simultaneous cross-fade... revisit — but start CSS-only and only add the dependency if a concrete implementation attempt falls short."*

This spec is that revisit. Scroll-linked, multi-stage orchestration (background glow, product image, and text block all animating in a coordinated sequence as a function of continuous scroll position, not a discrete click) is precisely the "orchestrated sequencing" 007 flagged — CSS keyframes/transitions cannot express a continuous function of scroll position across multiple simultaneously-animating properties. This spec adds `motion` (the actively maintained successor to `framer-motion`, imported from `"motion/react"`) to implement it, and repurposes rather than discards 007's existing pieces (see File Inventory).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scrolling through the homepage reveals the featured lineup like a cinematic lookbook (Priority: P1)

As a visitor landing on `/`, scrolling down smoothly transitions through the store's featured products one at a time — the background glow, the product image, and the headline/CTA all crossfade together, colored by that product's own accent — before the page continues into the category grid below.

**Why this priority**: This is the entire point of the feature; every other requirement supports it.

**Independent Test**: Load `/`, scroll from top to the point where the hero fully hands off to the rest of the page — each featured product gets a distinct, readable "moment" with its own color identity; scrolling back up reverses cleanly.

**Acceptance Scenarios**:

1. **Given** the homepage loads with N featured products (N = however many `is_featured=true` products exist, capped — see FR-006), **When** the visitor scrolls from the top of the hero, **Then** the hero's sticky viewport-height stage shows product 1, then smoothly hands off to product 2, ... through product N, each with its own headline/description/CTA and glow color, before the scroll container ends and normal page flow (category grid, etc.) resumes.
2. **Given** the visitor is mid-scroll between two products, **When** they pause, **Then** the interpolated state (partial crossfade/glow blend) is visually coherent, not a jarring half-rendered frame.
3. **Given** the visitor scrolls back up, **When** they pass through the hero again, **Then** the same sequence plays in reverse with no state corruption (React/Motion state stays correct regardless of scroll direction).

---

### User Story 2 - The navbar stays legible and functional over the immersive hero (Priority: P1)

As a visitor scrolling through the hero, the fixed navbar (logo, nav links, cart, theme/locale toggles) remains visible and legible the entire time, transitioning from transparent (over the hero's dark stage) to a glass surface once scrolled far enough — exactly as it already does today.

**Why this priority**: The hero takes the full viewport for up to 300vh of scroll distance; the navbar is the only persistent wayfinding/action surface during that span.

**Independent Test**: Scroll through the hero; the navbar (from `008`) never becomes illegible against whichever hero frame is currently showing, and cart/toggle interactions remain clickable throughout.

**Acceptance Scenarios**:

1. **Given** the hero's dark stage is showing, **When** the navbar is at the transparent (top-of-page) state, **Then** its logo/links/icons remain legible against the dark stage (this already holds today since the stage is dark and nav text is light — verified, not re-designed, here).
2. **Given** the visitor scrolls far enough to trigger the navbar's glass state, **When** it activates, **Then** it uses `008`'s theme-reactive `.store-glass` utility, not a hero-specific one-off.

---

### User Story 3 - The experience degrades gracefully without motion (Priority: P2)

As a visitor with `prefers-reduced-motion` enabled, or on a very short/slow viewport, I still see and can act on every featured product — I'm not stuck in a broken half-animated state or forced to scroll 300vh to reach the rest of the page with no visual payoff.

**Why this priority**: Scroll-jacking-adjacent techniques are a known accessibility and UX risk; this is the safety valve, sequenced P2 because it's a modifier on P1, not a separate feature.

**Independent Test**: Enable `prefers-reduced-motion` at the OS level, reload `/` — the hero still presents all N products (via the retained click/tap dot-nav) without the continuous scroll-driven crossfade; a keyboard-only user can still reach and activate every product's CTA.

**Acceptance Scenarios**:

1. **Given** `prefers-reduced-motion: reduce` is set, **When** the homepage loads, **Then** the scroll container's continuous transform-driven animation is replaced by instant/short (≤150ms) opacity crossfades on section change, or by the retained click-based `ProductThumbRow` interaction from 007 — Motion's `useReducedMotion()` gates this.
2. **Given** a keyboard-only visitor, **When** they tab through the hero, **Then** each product's CTA and the section dot-nav are reachable and operable in DOM order, independent of scroll position.

### Edge Cases

- **Fewer than 2 featured products**: the scroll-driven multi-section hero degrades to a single static hero frame (no scroll container, no dot-nav) — there is nothing to sequence through. This is a real possibility (`is_featured` isn't DB-constrained per 007's own Risk #4) and MUST NOT crash or render an empty/broken hero.
- **More than 4 featured products**: capped per FR-006 — see Open Questions for the exact cap rationale.
- Very fast scroll (flick/trackpad momentum) must not skip a section's CTA becoming briefly unclickable — Motion's `useTransform` reacts continuously regardless of scroll speed, so this is expected to hold, but is called out as a manual QA check.
- A featured product with a missing `main_image` must not break the showcase column — fall back gracefully (matches 007's existing `activeItem?.main_image &&` guard).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The homepage hero MUST occupy the full viewport (`h-screen`) within a scroll-tracking parent whose height is a function of the number of showcase sections (see FR-006), sticky-positioned so the stage itself does not scroll while its content animates as a function of scroll progress.
- **FR-002**: The hero's showcase MUST be driven by real `is_featured=true`, `is_active=true` products from the database (currently 4), not a hardcoded fixture array — ordered by the new `featured_sort` column, ascending, with `NULL`s last, falling back to `created_at ASC` as a tiebreaker (RESOLVED 2026-07-22 — user decision, see FR-002a).
- **FR-002a**: A new nullable `featured_sort INTEGER` column MUST be added to `products` (additive migration) and exposed as an admin-settable numeric field on `ProductForm.tsx`, so curators can explicitly control which featured products lead the hero and in what order.
- **FR-003**: Scroll progress MUST drive: (a) the background glow's color, crossfading between each showcase product's `theme_color`; (b) the showcase product image, translating/fading between the current and next product; (c) the text column's headline/description/CTA content and accent color, crossfading in sync with (a).
- **FR-004**: The implementation MUST use the `motion` package (`motion/react`'s `useScroll`+`useTransform`), added as a new dependency — justified against Constitution V via 007's own stated escape hatch (orchestrated multi-property sequencing that CSS transitions/keyframes cannot express as a continuous function of scroll position).
- **FR-005**: The existing `ProductThumbRow.tsx` click-to-select interaction MUST be retained in a repurposed form — a section dot-nav that (a) indicates current scroll-derived active section, (b) on click, smooth-scrolls to that section's position, and (c) serves as the primary interaction for `prefers-reduced-motion` and keyboard-only visitors (FR-008).
- **FR-006**: The number of scroll sections MUST equal the number of eligible featured products, capped at 4 (not hardcoded to the brief's literal "3") — with a graceful single-frame fallback when fewer than 2 are eligible (see Edge Cases).
- **FR-007**: The navbar (from `008`) MUST remain fixed, transparent→glass exactly as already implemented, unaffected in mechanism by this feature — this spec does not re-implement navbar scroll detection.
- **FR-008**: The animation MUST respect `prefers-reduced-motion` via Motion's `useReducedMotion()` — reduced-motion visitors get the dot-nav-driven, short-crossfade experience described in User Story 3, not the continuous scroll-linked version.
- **FR-009**: The hero's dark background "stage" (`#0B0B0F`-class near-black base + radial glow) is exempt from `008`'s light/dark theme toggle — it renders as a deliberately dark immersive stage in both themes (RESOLVED 2026-07-22 — user decision: hero stays dark as-is) — while the navbar and any hero chrome outside the stage remain theme-reactive per `008`.
- **FR-010**: Any horizontal layout split (text column vs. showcase column) MUST use logical properties / DOM-order-driven placement, not hardcoded `lg:order-1`/`lg:order-2` physical assumptions — carried forward from 007's existing RTL discipline in this component.
- **FR-011**: Vertical translate animations (image up/down between sections) require no RTL-specific handling since they are direction-agnostic — explicitly confirmed here so it isn't mistakenly "fixed" for RTL during implementation.
- **FR-012**: All hero copy (eyebrow, CTA labels, fallback headline/description, dot-nav `aria-label`s) MUST be sourced from `008`'s `store.*` dictionary — no new hardcoded Arabic string is introduced by this feature.

### Key Entities

- **Showcase section**: derived, not persisted at the section level — `{ product: Product, index: number, scrollRange: [number, number] }`, computed client-side at render time from the featured-products list, ordered by the new `featured_sort` column (see FR-002a / Open Questions #2 — user-decided 2026-07-22).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Scrolling from the top of `/` through the hero's full scroll distance visits every eligible featured product's "moment" in order, with the glow/image/text crossfading coherently at any scroll position (not just at section boundaries).
- **SC-002**: With `prefers-reduced-motion` enabled, the hero is fully usable (every product visible/reachable, CTA operable) without the continuous scroll-driven animation.
- **SC-003**: The navbar remains legible and interactive throughout the entire hero scroll distance.
- **SC-004**: `npx tsc --noEmit` and `npm run build` both pass with `motion` as a new dependency.
- **SC-005**: Zero behavior change to `(landing)`, `(admin)`, and every other `(store)` page/component outside `LookbookHero.tsx`/`LookbookGlow.tsx`/`ProductThumbRow.tsx`/`store.hooks.ts`.
- **SC-006**: A product added or removed from `is_featured` in the admin (up to the cap) changes the number of hero sections on next load with no code change required.

## Out of Scope

- Any change to `008`'s theme/locale toggle mechanism or navbar scroll-detection logic (`useScrollGlass`) — reused as-is.
- Any change to `010`'s order-creation/n8n concerns — fully independent.
- ~~A DB-backed `featured_sort`/manual-ordering column~~ — **superseded 2026-07-22**: the user asked for manual featured sort, so this spec now includes exactly that one small additive migration (see FR-002a and plan.md).
- Extending the scroll-linked treatment to any other page (`/products`, category pages, product detail) — homepage hero only.
- Building `category/[slug]` or `product/[slug]` pages — still `007`'s unshipped remainder, untouched by this spec.

## Assumptions

- `008-store-design-system-alignment` has landed at least through its Phase 1 (dictionary + layout plumbing) before this spec's implementation starts, so hero copy can be dictionary-driven from day one rather than migrated twice.
- The current 4 featured products (and their `theme_color` values) are representative of ongoing catalog practice — admins will keep the featured set small (≤4) as a curation choice, not something this spec enforces at the database level.
- Users on the storefront are predominantly scrolling on touch/trackpad devices where continuous scroll-linked animation reads as premium, not gimmicky — matches the brief's explicit intent.

## Open Questions

1. **RESOLVED (2026-07-22 — user decision): hero stays dark as-is.** The hero's background stage (`#0B0B0F`-class base + radial glow) stays a deliberately dark, immersive "stage" regardless of the active theme, exactly as it renders today — no light-mode variant of the stage itself. The rest of the page (nav, everything below the hero) fully honors `008`'s toggle. FR-009 is confirmed as written, no longer contingent.
2. **RESOLVED (2026-07-22 — user decision): manual featured sort, not `created_at`.** The user wants explicit, admin-controlled ordering rather than the `created_at ASC` fallback originally recommended. This adds one small additive migration — a nullable `featured_sort` integer column on `products` — plus an admin-facing numeric field to set it (mirrors how `007` added `theme_color`/`is_featured` to `ProductForm.tsx` as additive fields). See FR-002a and plan.md's "Featured-Sort Migration" section for the exact DDL and ordering rule (`featured_sort ASC NULLS LAST, created_at ASC` as a tiebreaker for products that haven't been given an explicit value yet, so behavior is sane immediately after the migration with zero admin action required).
3. **Cap of 4 vs. the brief's literal "3" — unchanged, low-risk default, not raised by the user's latest reply.** Cap stays at 4 (matches the current real featured count). If a 5th product is later marked featured, `featured_sort` (now that it exists) gives the admin explicit control over which products lead, rather than an implicit `created_at`-based ordering — a side benefit of decision #2 above.
4. **Should `ProductThumbRow`'s dot-nav be visually distinct from a "thumbnail" vs. a plain dot?** Unchanged — still resolve during implementation, not blocking.
