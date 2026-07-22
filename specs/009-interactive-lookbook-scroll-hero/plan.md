# Implementation Plan: Interactive Lookbook — Scroll-Linked Hero

**Branch**: `009-interactive-lookbook-scroll-hero` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Depends on**: `008-store-design-system-alignment` (Phase 1 minimum — dictionary + `LocaleProvider` wiring — must exist so hero copy is dictionary-driven from the start; also assumes `008`'s navbar `.store-glass` work for the "navbar stays legible" requirement, though this plan does not modify the navbar itself). **Independent of**: `010-order-structure-alignment`.

## Summary

Replace `LookbookHero.tsx`'s click-driven, CSS-only crossfade (from `007`) with a scroll-linked orchestration using the `motion` package (`motion/react`), mapping the scroll progress of a `h-[N×100vh]` container into N discrete "moments" — one per real `is_featured` product (N capped at 4) — where the background glow color, the showcase product image, and the text column's content/accent all crossfade continuously as a function of scroll position. `ProductThumbRow.tsx` is repurposed from a click-only thumbnail row into a dual-purpose section indicator + smooth-scroll-to-section control, doubling as the `prefers-reduced-motion`/keyboard fallback. This is the one plan in the 008/009/010 set that adds a new npm dependency, explicitly justified against `007`'s own "CSS-only unless orchestrated sequencing is needed" escape hatch.

## Constraints (must NOT change)

- `src/app/(landing)/**`, `src/app/(admin)/admin/**` — zero behavior change; this plan touches neither.
- `src/components/store/StoreNavbar.tsx` and `src/features/store/store.hooks.ts`'s `useScrollGlass` — reused as-is; this plan does not re-implement navbar scroll detection (User Story 2 is a "verify it still holds," not a "build it").
- Every other `(store)` page/component untouched by `008` remains untouched by this plan too — the touch surface is `LookbookHero.tsx`, `LookbookGlow.tsx`, `ProductThumbRow.tsx`, `store.hooks.ts`, `package.json`, (optionally) `globals.css` for dead-code removal, plus — per the user's 2026-07-22 decision to add manual featured sort — one additive migration and `products.repository.ts`/`ProductForm.tsx` for the new `featured_sort` field (see "Featured-Sort Migration" below).
- `npx tsc --noEmit` and `npm run build` pass at the end of every phase, including immediately after the `motion` dependency is added (Phase 0) — a dependency add with zero consumers is still a green-build checkpoint.
- **One additive Supabase migration, added 2026-07-22 per user decision** — a nullable `featured_sort INTEGER` column on `products`, for manual admin-controlled hero ordering (see "Featured-Sort Migration" below). No other schema change; the hero otherwise consumes existing `is_featured`/`theme_color` columns from `007`.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 16.2.10 (App Router, Turbopack) — the user's brief said "Next.js 15"; this plan targets the repo's actual installed version, 16.2.10, and flags the discrepancy rather than silently ignoring it or downgrading.
**Primary Dependencies**: **adds `motion`** (the successor to `framer-motion`; import from `"motion/react"`, never `"framer-motion"`). `lucide-react` (already a dependency) supplies any new icon (e.g. a "scroll to explore" chevron).
**Storage**: none new — reads existing `products` columns (`is_featured`, `is_active`, `theme_color`, `main_image`, `name`, `description`, `slug`, `price`).
**Testing**: `npx tsc --noEmit`, `npm run build` — the only implementer-owned automated gates. All browser-based QA (scroll behavior, `prefers-reduced-motion`, keyboard-only pass, RTL visual pass) is Human QA, performed by the user post-implementation — see the note under Verification Steps.
**Target Platform**: Web, `/` only.
**Constraints**: zero behavior change outside the named touch surface; the hero's dark "stage" is exempt from `008`'s theme toggle per spec FR-009 (RESOLVED 2026-07-22 — user confirmed: hero stays dark as-is).
**Scale/Scope**: 1 new dependency, 3 modified components, 1 modified hook module, ~1 CSS cleanup pass.

## Constitution Check

- **I. Layered Architecture**: PASS — the hero already fetches `featuredProducts` server-side via the existing `(store)/page.tsx` → `store.api`/`store.hooks` path from `007`; this plan adds no new data-access layer for the scroll orchestration itself. The one addition, `featured_sort` (per the user's 2026-07-22 decision), follows the correct layering: migration → `products.repository.ts` (query ordering) → `products.service.ts`/`products.api.ts` (already the layer that carries `theme_color`/`is_featured`, extended additively) → `ProductForm.tsx`.
- **II. TypeScript Strict**: PASS — planned; `motion`'s types (`MotionValue<string>`, `useTransform` overloads) are used directly, no `any` escape hatch.
- **III. RTL/i18n Correctness**: PASS — FR-010/FR-011 in the spec explicitly carry forward 007's logical-property discipline; copy is dictionary-driven per FR-012, satisfying `008`'s completeness bar for this component too.
- **IV. No Business Logic in Components**: PASS — section-boundary math (dividing scroll progress into N ranges) lives in `store.hooks.ts`, not inline in `LookbookHero.tsx`'s JSX.
- **V. Reuse Existing Primitives — the one justified exception**: this plan adds `motion`, a new runtime dependency. Justification, addressed head-on rather than glossed over:
  - `007`'s own plan (`specs/007-b2c-ecommerce-storefront/plan.md`, "Animation strategy" section) explicitly reserved exactly this case: *"if the crossfade+scale needs orchestrated sequencing... rather than a simple simultaneous cross-fade... revisit."*
  - The requirement here is a **continuous function of scroll position** driving three simultaneously-animating, cross-referencing properties (glow color, image transform, text opacity/color) across N sections — CSS `@keyframes`/`transition` can express discrete state-to-state animation (which is all 007 needed for a click handler) but cannot read live scroll position as an input variable. This is a different problem class, not a preference difference.
  - `motion` is scoped narrowly: it touches exactly 3 files in `src/components/store/` plus `store.hooks.ts`. No other `(store)` or `(admin)` animation is migrated to it — `.float`, `.pulse-glow`, `.animate-in`, `.shimmer` etc. all stay CSS-only everywhere else in the codebase, preserving Constitution V's default for every other surface.
  - Bundle cost is accepted for the homepage's above-the-fold centerpiece specifically because it's the highest-leverage visual surface in the redesign brief — the same reasoning `007` used for embla-carousel-react being justified for the funnel's gallery but not adopted store-wide.
- **VI. State Machine / Factory**: PASS — untouched.

**One violation, justified above, not silently absorbed**: Constitution V's "reuse over new dependency" default is overridden for this single, narrowly-scoped case. No other principle is violated.

## Existing Code Being Replaced/Repurposed (read before implementing)

`src/components/store/LookbookHero.tsx` (129 lines, from `007`) today:
- Owns no scroll logic. Uses `useLookbookActiveItem(featuredProducts)` (from `store.hooks.ts`) for click-driven `activeItem` state.
- Renders a two-column grid; content column (eyebrow/`h1`/description/CTA/`ProductThumbRow`) then showcase column (`LookbookGlow` + a `key={activeItem.id}`-remounted `<Image>` wrapped in `.lookbook-morph .float`).
- `handleAddToCart` adds `activeItem` to the cart via `useCart()`.

`src/components/store/ProductThumbRow.tsx` (54 lines): renders up to 4 clickable image thumbnails; `onClick` calls `onSelect(product.id)`; active thumbnail gets a `boxShadow` ring in the product's `theme_color`.

`src/components/store/LookbookGlow.tsx` (18 lines): pure presentational `<div className="lookbook-glow" style={{ backgroundColor: color }} />` — `color: string` prop.

`src/features/store/store.hooks.ts`: `useLookbookActiveItem` (click-state owner, to be removed — no longer the source of truth) and `useScrollGlass` (navbar detection, untouched, reused by `008`'s navbar).

`src/app/globals.css`'s `.lookbook-glow` utility (shape/blur/position, color via inline style) is **reused as-is** — it already does exactly what the scroll version needs (a positioned, blurred, color-agnostic glow shape); only its color now comes from a `MotionValue<string>` instead of a plain string. `.lookbook-morph` (the click-remount crossfade keyframe) and `.float` (continuous idle bob) become **dead code for this component** once scroll-driven transforms own image movement/opacity — removed in Polish, not left as an inert trap for the next reader.

## Design Translation — concrete implementation

### Data shape (`store.hooks.ts`)

Replace `useLookbookActiveItem` with:

```ts
export interface LookbookSection {
  product: Product;
  index: number;
}

const MAX_HERO_SECTIONS = 4;

/** Orders featured products by the admin-settable `featured_sort` (ascending,
 *  nulls last), falling back to `created_at ASC` as a tiebreaker for products
 *  that haven't been given an explicit value yet — RESOLVED 2026-07-22, user
 *  decision: manual sort, not implicit created_at ordering. Caps at
 *  MAX_HERO_SECTIONS. See "Featured-Sort Migration" below for the column. */
export function useLookbookSections(featuredProducts: Product[]): LookbookSection[] {
  return useMemo(
    () =>
      [...featuredProducts]
        .sort((a, b) => {
          if (a.featured_sort == null && b.featured_sort == null) {
            return a.created_at.localeCompare(b.created_at);
          }
          if (a.featured_sort == null) return 1;
          if (b.featured_sort == null) return -1;
          return a.featured_sort - b.featured_sort;
        })
        .slice(0, MAX_HERO_SECTIONS)
        .map((product, index) => ({ product, index })),
    [featuredProducts],
  );
}
```

### Featured-Sort Migration (added 2026-07-22 per user decision)

The user asked for manual, admin-controlled ordering of the hero's featured products instead of the originally-recommended implicit `created_at` ordering. This is one small additive migration plus one admin form field:

```sql
-- 009-a: manual sort order for the Lookbook hero's featured products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS featured_sort INTEGER DEFAULT NULL;
```

- `src/features/shared/types.ts` (MODIFY, additive): `Product` gains `featured_sort: number | null`.
- `src/features/products/products.repository.ts` (MODIFY): `getFeaturedProducts()`'s query orders by `featured_sort.asc(nullsLast: true), created_at.asc` instead of whatever implicit order it uses today.
- `src/components/admin/products/ProductForm.tsx` (MODIFY, additive): a numeric "Featured sort" input, shown when `is_featured` is toggled on, mirroring how `007` added the `theme_color`/`is_featured` fields — purely additive, no existing field touched.
- `src/features/products/products.api.ts` (MODIFY, additive): extend the product create/update mutation body to include `featured_sort`.
- Products with `featured_sort = NULL` (i.e. every existing row immediately after the migration) sort by `created_at ASC` among themselves — so the hero renders sensibly with zero admin action required the moment this migration lands; admins opt into explicit ordering whenever they choose to set the field.

`LookbookHero.tsx` then owns the `motion/react` orchestration directly (it's the one component that needs `useScroll`, so per Constitution IV this is presentation-adjacent scroll wiring, not business logic — the *data* (which products, in what order, how many sections) still comes from the hook above, only the *scroll math* lives in the component, matching how `useTransform` calls are conventionally colocated with the JSX they drive in every Motion example this pattern is based on).

### Scroll orchestration (`LookbookHero.tsx`)

```tsx
"use client";
import { useRef } from "react";
import { useScroll, useTransform, useReducedMotion, motion } from "motion/react";

const sections = useLookbookSections(featuredProducts);
const N = sections.length;
const containerRef = useRef<HTMLDivElement>(null);
const prefersReducedMotion = useReducedMotion();

const { scrollYProgress } = useScroll({
  target: containerRef,
  offset: ["start start", "end end"],
});

// N breakpoints -> N-1 crossfade zones, e.g. N=4 => [0, 0.33, 0.67, 1]
const breakpoints = sections.map((_, i) => i / Math.max(N - 1, 1));
const glowColor = useTransform(scrollYProgress, breakpoints, sections.map(s => s.product.theme_color));
```

Per-section opacity (image + text block) uses a triangular `useTransform` mapping so section `i` peaks at `breakpoints[i]` and fades to 0 at its neighbors' breakpoints — computed once per section, not per frame, via `useTransform(scrollYProgress, [prev, breakpoints[i], next], [0, 1, 0])` (clamped at the array ends so section 0 stays at opacity 1 until scroll begins, and the last section stays at 1 once scroll completes, rather than fading to 0 past the end).

If `N < 2` (Edge Case in spec): skip the entire `useScroll` setup, render a static single-frame hero (today's non-interactive equivalent, still theme/dictionary-driven) — checked once, not per-render, since `featuredProducts` only changes on navigation.

If `prefersReducedMotion` is true: render the same static-per-section markup but swap `motion.div style={{opacity}}` bindings for a `useState`-driven `activeIndex` (owned by the repurposed `ProductThumbRow`, see below) with a short CSS `transition-opacity duration-150` instead of scroll-linked motion values — satisfying FR-008 without a second parallel implementation of the JSX (same markup, different value source).

### `LookbookGlow.tsx` prop change

`color: string` → `color: MotionValue<string> | string` (a small union so the component still works if ever used statically elsewhere), rendering via `motion.div` when given a `MotionValue`:

```tsx
import { motion, type MotionValue } from "motion/react";
// ...
<motion.div className="lookbook-glow" style={{ backgroundColor: color }} />
```

(Motion's `style` prop transparently accepts both plain values and `MotionValue`s — no branching needed in the component body, keeping this change minimal.)

### `ProductThumbRow.tsx` repurposing

Renamed responsibility (same file, same export name — no import-path churn elsewhere): still renders up to `MAX_HERO_SECTIONS` thumbnails, but:
- `activeId` now derived from the scroll-computed `activeIndex` (passed down from `LookbookHero.tsx`, itself derived via a `useTransform`+`useMotionValueEvent` subscription that syncs a plain `useState<number>` for anything that needs a *reactive* current-index, since `MotionValue`s don't trigger React re-renders on their own).
- `onSelect(id)` now calls `containerRef.current?.scrollIntoView` math (or `window.scrollTo` computed from the container's bounding box and the target section's breakpoint) to smooth-scroll to that section, rather than mutating local click-state directly — this is what makes it double as the reduced-motion/keyboard fallback (FR-005, FR-008).
- `aria-label`s and any surrounding chrome text come from `008`'s `store.*` dictionary (FR-012) — this component gains its first `t(key)` calls here (007 only used product names, which are DB content, not chrome).

### Hero copy sourcing (FR-012)

Eyebrow ("مجموعة مختارة"), fallback headline/description (shown when `activeItem` is null — no longer applicable once section-driven, but the *empty/loading* state still needs copy), and CTA labels ("أضف للسلة"/"تمت الإضافة"/"عرض التفاصيل") move to `t("store.hero.eyebrow")` etc. — the exact keys are whatever `008`'s Phase 1 audit already produced for this file; this plan does not invent a second parallel key set.

## Feature-Layer File Inventory

| File | Change | Purpose |
|---|---|---|
| `package.json` | MODIFY | Add `"motion": "^12"` (or current stable) to `dependencies`. |
| `src/components/store/LookbookHero.tsx` | MODIFY (major rewrite) | Scroll-linked orchestration via `motion/react`'s `useScroll`/`useTransform`; renders the `h-[N×100vh]` outer wrapper + `sticky top-0 h-screen overflow-hidden flex items-center` inner stage; static single-frame fallback when `N < 2`; reduced-motion fallback per FR-008. |
| `src/components/store/LookbookGlow.tsx` | MODIFY | `color` prop widened to accept `MotionValue<string>`; renders via `motion.div`. |
| `src/components/store/ProductThumbRow.tsx` | MODIFY | Click-to-select → smooth-scroll-to-section + scroll-derived active-index display; dictionary-driven chrome strings; doubles as reduced-motion/keyboard fallback control. |
| `src/features/store/store.hooks.ts` | MODIFY | Remove `useLookbookActiveItem`; add `useLookbookSections` (ordering + cap, per Open Question #2/#3); `useScrollGlass` untouched. |
| `src/app/globals.css` | MODIFY (cleanup) | Remove now-dead `.lookbook-morph` keyframe and this component's use of `.float` (idle-bob no longer applies once scroll owns image movement); `.lookbook-glow` shape/blur utility is kept and reused unchanged. |
| *(Featured-Sort Migration, added 2026-07-22 per user decision — see that section above)* | | |
| Supabase migration `009-a` | NEW | Additive `featured_sort INTEGER` column on `products`. |
| `src/features/shared/types.ts` | MODIFY (additive) | `Product` gains `featured_sort: number \| null`. |
| `src/features/products/products.repository.ts` | MODIFY | `getFeaturedProducts()` orders by `featured_sort ASC NULLS LAST, created_at ASC`. |
| `src/features/products/products.api.ts` | MODIFY (additive) | Product create/update mutation body gains `featured_sort`. |
| `src/components/admin/products/ProductForm.tsx` | MODIFY (additive) | Numeric "Featured sort" input, shown when `is_featured` is on. |

No API route touched. `products.repository.ts`'s existing `getFeaturedProducts()` method gains an ORDER BY change only (no new method, no service/API-route change) for the `featured_sort` migration; the scroll-orchestration work itself remains a pure client-presentation feature over data already fetched by `007`'s existing `(store)/page.tsx`.

## RTL / Arabic Considerations

- Content-column-first DOM order (carried forward from `007`) means the text column sits inline-start (visually right in RTL) and the showcase column inline-end — unchanged by this plan; FR-010 exists specifically so this isn't accidentally "fixed" into a physical `lg:order-2` during the rewrite.
- Vertical translate/opacity transforms (image moving up between sections) are direction-agnostic per FR-011 — explicitly not an RTL concern, stated to preempt unnecessary "RTL-safety" work on a non-issue.
- The section dot-nav's visual reading order (top-to-bottom, matching scroll order) needs no RTL mirroring since it's vertical, not horizontal.

## Phased Implementation Order

Each phase leaves the app in a shippable, `tsc`/`build`-clean state.

**Phase 0 — Dependency + data hook**
- Apply migration `009-a` (`featured_sort INTEGER`, nullable, additive); add `featured_sort` to `shared/types.ts`, `products.repository.ts`'s `getFeaturedProducts()` ordering, `products.api.ts`, and `ProductForm.tsx` (additive numeric field). Add `motion` to `package.json`; install.
- `store.hooks.ts`: implement `useLookbookSections`; remove `useLookbookActiveItem` (confirm no other consumer — only `LookbookHero.tsx` per the File Inventory).
- Verify: `npx tsc --noEmit`, `npm run build` green with the new dependency present but not yet consumed by JSX.

**Phase 1 — Static N-section hero (no scroll linkage yet)**
- Rewrite `LookbookHero.tsx`'s markup to render all N sections' content, wired to a plain `useState<number>` "active section" (temporary stand-in for scroll-derived state) so the visual design (glow color per section, text/CTA per section) can be verified before scroll math is added.
- `LookbookGlow.tsx` prop-type widening (accepts plain string still works at this phase).
- `ProductThumbRow.tsx`: switch `onSelect` to set the temporary `activeIndex` state (not yet scrolling).
- `tsc`/`build` green. (Confirming `/` renders correctly and that clicking a thumbnail switches sections is Human QA — user-performed.)

**Phase 2 — Scroll linkage**
- Add the `h-[N×100vh]` container + `useScroll({ target })`; replace the temporary `useState` with `useTransform`-derived `MotionValue`s for glow color and per-section opacity/transform.
- `ProductThumbRow.tsx`: `onSelect` becomes smooth-scroll-to-section; active-index display subscribes to the scroll-derived value via `useMotionValueEvent`.
- `tsc`/`build` green. (Confirming the coherent crossfade described in spec User Story 1 while scrolling `/` is Human QA — user-performed.)

**Phase 3 — Reduced-motion + edge-case fallbacks**
- `useReducedMotion()` gate: swap to short CSS-transition crossfades keyed off the dot-nav's active index instead of continuous scroll values.
- `N < 2` fallback: static single-frame render, no scroll container.
- Temporarily set `is_featured=false` on 3 of 4 products in Supabase (read-only test, revert after) to exercise the `N=1` path; restore data; `tsc`/`build` green. (Browser confirmation of the `prefers-reduced-motion` fallback and the `N=1` render is Human QA — user-performed.)

**Phase 4 — Dictionary + RTL + cleanup**
- Move every hardcoded string in the touched files to `t(key)` (FR-012) — requires `008` Phase 1 to be present.
- FR-010/FR-011 code review pass (no physical-direction utility introduced) — a code check, not browser QA.
- Remove dead `.lookbook-morph`/`.float` usage from `globals.css`/the component.
- Verify: `tsc`/`build` green. Full RTL + LTR (via `008`'s toggle) visual pass on `/` is Human QA — user-performed.

## Risks / Open Questions

(See spec.md's "Open Questions" — items #1 and #2 are RESOLVED by user decision on 2026-07-22 (hero stays dark as-is; manual `featured_sort` added); #3 and #4 remain low-risk defaults this plan proceeds on.)

1. **`motion` bundle-size impact on the homepage's LCP** — mitigate by scoping the dependency to exactly the hero (no `motion` import anywhere else in `(store)`); measure bundle delta during Phase 0's build-green check, not assumed away.
2. **Scroll-jacking perception** — a `h-[400vh]` (N=4) scroll distance is a real UX commitment; if the user's own Human QA of Phase 2 finds it drags, reducing per-section scroll distance (not adding a dependency-level fix) is the lever — flagged, not solved here.
3. **`useTransform` color interpolation across 4 stops** — Motion supports color-string output ranges natively; if a visual artifact appears at a crossfade midpoint (an unexpected intermediate hue), the fallback is switching to `useTransform`'s numeric RGB-channel interpolation with manual `rgb()` string construction — a Phase 2 QA finding, not a known problem today.

## Verification Steps (every phase)

```bash
npx tsc --noEmit   # must pass
npm run build      # must succeed
```

**Human QA checklist (performed by the user in-browser post-implementation — not an implementer task; listed here so the user knows what to check):**
- [ ] Scrolling `/` from top to hero-end visits every featured product's moment in order, forward and backward.
- [ ] Navbar remains legible/interactive throughout the scroll distance (`008`'s `.store-glass` transition still fires correctly).
- [ ] `prefers-reduced-motion` gives a fully usable, non-scroll-jacked hero.
- [ ] Keyboard-only navigation reaches every product's CTA and the dot-nav.
- [ ] `N=1` and `N=0` (temporarily, via test data) render a sane fallback, not a crash/blank hero.
- [ ] RTL pass: content column stays inline-start, no physical-direction utility introduced.
- [ ] `/[slug]`, `/admin/*`, and every other `(store)` page/component are pixel-for-pixel unaffected by this plan's changes.
