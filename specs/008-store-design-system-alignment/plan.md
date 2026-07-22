# Implementation Plan: Store Design-System Alignment (Theme + Bento/Neumorphism + Bilingual Toggle)

**Branch**: `008-store-design-system-alignment` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Depends on**: `007-b2c-ecommerce-storefront` (uncommitted, already implemented — see Context below). **Blocks**: `009-interactive-lookbook-scroll-hero` (needs the token/locale plumbing this plan adds before the hero's copy can be dictionary-driven and its dark/light reconciliation can be expressed). **Independent of**: `010-order-structure-alignment` (no file overlap — safe to run in parallel).

## Summary

Reuse the admin dashboard's two existing runtime-toggle systems — `useTheme()` (dark/light, class-based) and `useLocale()`/dictionary (`en`/`ar` + `dir`) — on the `(store)` route group, parameterizing both hooks' `localStorage` key so the storefront's preferences don't couple to the admin's. Migrate every hardcoded-Arabic string in `(store)` to the shared dictionary under a `store.*` namespace, migrate every hardcoded-dark Tailwind class to the existing semantic tokens (`bg-surface`, `text-text-primary`, etc.), and restyle category tiles / product cards / cart / checkout inputs onto the existing `neu-raised`/`neu-input` neumorphism utilities in an asymmetric bento arrangement. No new dependency, no new CSS mechanism beyond one additive theme-aware navbar-glass utility that mirrors an existing pattern, no Supabase migration.

## Constraints (must NOT change)

- `src/app/(landing)/**` and `src/components/landing/*` — zero behavior change; this plan touches zero files under these paths.
- `src/app/(admin)/admin/**` and `src/components/admin/**` — zero behavior change. The two shared hooks this plan modifies (`theme.hooks.ts`, `i18n.hooks.tsx`) MUST preserve the admin's exact current default behavior when called with no new parameter (default parameter values equal today's hardcoded constants: `"admin-theme"`, `"admin-locale"`).
- `src/features/i18n/dictionary.ts`'s existing `DictKey` union entries (admin keys) are additive-only — new `store.*` keys are appended, no existing key renamed or removed.
- No new Supabase migration — `theme_color`, `is_featured`, `order_items` already exist from `007`.
- No new runtime dependency (Constitution V) — this plan's entire toolkit already exists in the repo.
- Layered architecture (Constitution I) is not implicated — theme/locale are client-only UI preferences, same as `006`'s Constitution Check reasoning.
- `npx tsc --noEmit` and `npm run build` pass at the end of every phase.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 16.2.10 (App Router, Turbopack), Tailwind CSS v4
**Primary Dependencies**: none new — reuses `src/features/theme/theme.hooks.ts` and `src/features/i18n/{dictionary.ts,i18n.hooks.tsx}` as-is (parameterized), and the existing `neu-*`/token utilities in `src/app/globals.css`.
**Storage**: `localStorage` only (two new keys: `store-theme`, `store-locale`); no DB change.
**Testing**: `npx tsc --noEmit`, `npm run build` — the only implementer-owned automated gates. All browser-based QA (toggling theme/locale across pages, visual/RTL comparison, `/admin` regression clicking) is performed by the user directly post-implementation, not by whoever implements this plan — see the "Human QA" note under Verification Steps.
**Target Platform**: Web, `(store)/*` route group.
**Constraints**: zero behavior change to `(landing)`/`(admin)`; the hero's dark "stage" (see `009`) is the one deliberate exception to full theme reactivity, scoped precisely in `009`'s plan.
**Scale/Scope**: 2 shared hooks (parameterize), 1 layout (no-FOUC scripts + provider wiring), ~13 store components + ~4 store pages (string + class migration), ~40–60 new dictionary keys, 1 additive CSS utility.

## Constitution Check

- **I. Layered Architecture**: PASS — no repository/service/API-route touched; this is a client-only UI-preference and presentation change.
- **II. TypeScript Strict**: PASS — planned; `DictKey` stays a typed union so a typo'd store key is a compile error, exactly like the admin dictionary.
- **III. RTL/i18n Correctness**: this feature is `006`'s pattern extended to a second surface — FR-004/FR-005's sweep is the compliance gate, verified the same way `006` was.
- **IV. No Business Logic in Components**: PASS — `t()` calls and `useTheme()`/`useLocale()` reads are lookups/state, not business logic.
- **V. Reuse Existing Primitives**: PASS, and the central point of this plan — zero new dependency, zero new CSS mechanism beyond one utility that mirrors an existing `--glow-color`-style light/`.dark`-override pair. No new charting/UI library; no parallel token system.
- **VI. State Machine / Factory**: PASS — untouched.

No violations.

## Design Translation — concrete decisions

### Theme (`useTheme`)

`src/features/theme/theme.hooks.ts` currently hardcodes `STORAGE_KEY = "admin-theme"` inside module scope and reads/writes it directly. Change:

- `useTheme(storageKey: string = "admin-theme")` — the constant becomes a parameter with the admin's exact current default, so every existing `useTheme()` call site in `(admin)` is unaffected.
- `getInitialTheme()`/`applyTheme()` become closures over `storageKey` (or take it as an argument) instead of reading a module constant.
- `(store)` call site: `useTheme("store-theme")` inside `StoreNavbar.tsx` (the only consumer — same "no Context needed, single consumer" reasoning `theme.hooks.ts`'s own doc comment already uses for the admin).
- Default-when-unset policy stays OS `prefers-color-scheme` fallback — identical logic to admin, just a different key, per spec Assumption.

### Locale (`useLocale` / dictionary)

`src/features/i18n/i18n.hooks.tsx` currently hardcodes `STORAGE_KEY = "admin-locale"` and `LocaleProvider` takes no props. Change:

- `LocaleProvider({ children, storageKey = "admin-locale" }: { children: React.ReactNode; storageKey?: string })` — default preserves admin behavior exactly.
- `getInitialLocale()`/`applyLocale()` become closures over `storageKey`.
- `(store)/layout.tsx` wraps children in `<LocaleProvider storageKey="store-locale">` (new — the store currently has no provider at all).
- `src/features/i18n/dictionary.ts`: `DictKey` union gains a `store.*`-prefixed block (e.g. `"store.nav.home" | "store.nav.allProducts" | "store.nav.cart" | "store.hero.eyebrow" | "store.hero.ctaAddToCart" | "store.hero.ctaAdded" | "store.hero.viewDetails" | "store.category.title" | "store.product.addToCart" | "store.cart.title" | "store.cart.empty" | "store.cart.checkout" | "store.cart.subtotal" | "store.checkout.*" | "store.footer.*"` etc.), each with an `en` and `ar` entry in the existing `dictionaries` record. Exact key list finalized during the string-audit task (mirrors `006` T001's approach).

### No-FOUC init (`(store)/layout.tsx`)

Mirror `(admin)/admin/layout.tsx`'s two blocking inline `<script>` tags verbatim in structure, substituting keys/defaults:

- Theme script: reads `localStorage.getItem("store-theme")`, falls back to `prefers-color-scheme`, toggles `.dark` on `<html>` — identical logic to admin's script, different key.
- Locale script: reads `localStorage.getItem("store-locale")`; if `"en"`, sets `lang="en" dir="ltr"` (default stays `ar`/`rtl`, already the hardcoded attribute values on `<html>` today) — identical logic to admin's script, different key.
- `<html>` gains `suppressHydrationWarning` for the same documented reason as admin's layout.
- `<body>` class changes from hardcoded `bg-dark-900 text-gray-100` to `bg-surface text-text-primary antialiased transition-colors` (token-driven, matches admin's body class pattern).

### Theme-aware navbar glass (`globals.css` + `StoreNavbar.tsx`)

`.glass-dark` (`rgba(0,0,0,0.3)` + blur) is dark-only by construction — using it under a light theme would render a dark bar over a light page. New additive utility, same authoring pattern already used for `--glow-color`/`--pulse-glow-*` (a `:root` default + a `.dark` override, plain `rgba()` values, no `color-mix()` so Safari 15 compatibility is preserved without touching the existing `@supports not (color-mix)` fallback block):

```css
/* globals.css, inside @layer utilities, additive */
.store-glass {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--color-border);
}
.dark .store-glass {
  background: rgba(15, 23, 42, 0.7);
  border-bottom-color: var(--color-border);
}
```

`StoreNavbar.tsx`'s `isScrolled ? "glass-dark" : "bg-transparent"` becomes `isScrolled ? "store-glass" : "bg-transparent"`.

### Neumorphism / bento restyle (concrete component targets)

| Component | Current | Target |
|---|---|---|
| `CategoryGrid.tsx` | uniform grid, presumably flat/dark tiles | asymmetric bento grid (`grid-cols-2 md:grid-cols-4 grid-rows-2` with one tile `col-span-2 row-span-2`, matching the admin overview's bento asymmetry) on `neu-raised` + `bg-surface-raised` tiles |
| `ProductCard.tsx` | `bg-dark-800`-style flat card | `neu-raised` card on `bg-surface-raised`, hover lift mirroring `.neu-btn`'s hover transform |
| `ProductGrid.tsx` | container only | no visual change beyond children; confirm responsive grid gaps still read correctly with the new card shadows |
| `CartDrawer.tsx` | dark slide-over panel | `bg-surface-raised` panel, `neu-raised` on its line-item rows |
| `CartLineItem.tsx` / `CartPageBody.tsx` | dark rows | token-driven rows, quantity stepper buttons get `.neu-btn` |
| `StoreCheckoutForm.tsx` | plain inputs | every text input/select adopts `.neu-input` exactly as `ProductForm.tsx` does today |
| `StoreFooter.tsx` | dark literal classes | token-driven (`bg-surface`, `text-text-muted`, `border-border`) |
| `ProductDetail.tsx` | dark literal classes (unwired — no page yet, see spec Out of Scope) | migrate for consistency now so whenever `007`'s `product/[slug]/page.tsx` ships, it's already theme/locale-correct — cheap to do while touching the rest of the component inventory |

`LookbookHero.tsx`/`LookbookGlow.tsx`/`ProductThumbRow.tsx` (the hero) are touched only for their *chrome* — eyebrow/CTA text move to `t(key)` and, where they aren't literally the dark "stage," their color tokens become theme-reactive; the scroll mechanics and the stage/chrome boundary are `009`'s job, not re-litigated here. This plan's hero-file touch is therefore string/token-only, no structural change.

## Feature-Layer File Inventory

Legend: **NEW** = new file, **MODIFY** = change to an existing file.

### Shared hooks (touch admin too — must preserve admin default behavior)

| File | Change | Purpose |
|---|---|---|
| `src/features/theme/theme.hooks.ts` | MODIFY | Parameterize `useTheme(storageKey = "admin-theme")`; no admin call-site change needed. |
| `src/features/i18n/i18n.hooks.tsx` | MODIFY | `LocaleProvider` gains optional `storageKey` prop, default `"admin-locale"`; no admin call-site change needed. |
| `src/features/i18n/dictionary.ts` | MODIFY | Append `store.*` `DictKey` entries + `en`/`ar` values, additive only. |

### Store layout & navbar

| File | Change | Purpose |
|---|---|---|
| `src/app/(store)/layout.tsx` | MODIFY | Add no-FOUC theme/locale inline scripts (store keys), wrap children in `<LocaleProvider storageKey="store-locale">`, `suppressHydrationWarning`, token-driven `<body>` class. |
| `src/components/store/StoreNavbar.tsx` | MODIFY | Add theme + locale toggle controls (reusing `useTheme("store-theme")`/`useLocale()`); replace hardcoded strings with `t(key)`; swap `.glass-dark` → `.store-glass`. |
| `src/app/globals.css` | MODIFY | Add `.store-glass` utility (light default + `.dark` override), additive, no existing rule touched. |

### Store components — string + token migration

| File | Change | Purpose |
|---|---|---|
| `src/components/store/LookbookHero.tsx` | MODIFY | Eyebrow/CTA/description strings → `t(key)`; non-stage color tokens theme-reactive. No structural/scroll change (that's `009`). |
| `src/components/store/ProductThumbRow.tsx` | MODIFY | `aria-label` stays product-name-driven (DB content, not chrome); any surrounding chrome string → `t(key)`. |
| `src/components/store/LookbookGlow.tsx` | none | Purely presentational color-prop passthrough; unaffected by theme/locale. |
| `src/components/store/CategoryGrid.tsx` | MODIFY | Bento asymmetric layout + `neu-raised`/`bg-surface-raised` tiles + `t(key)` section heading if any. |
| `src/components/store/ProductCard.tsx` | MODIFY | `neu-raised` card + token colors + `t(key)` for "Add to cart"/badges. |
| `src/components/store/ProductGrid.tsx` | MODIFY | `emptyMessage` default and loading state strings → `t(key)`. |
| `src/components/store/CartDrawer.tsx` | MODIFY | Token-driven panel + `t(key)` for title/empty-state/checkout CTA. |
| `src/components/store/CartLineItem.tsx` | MODIFY | Token-driven row + `.neu-btn` stepper + `t(key)` for "remove". |
| `src/components/store/CartPageBody.tsx` | MODIFY | Token-driven + `t(key)`. |
| `src/components/store/StoreCheckoutForm.tsx` | MODIFY | `.neu-input` fields + `t(key)` for every label/placeholder/button/error string. |
| `src/components/store/StoreFooter.tsx` | MODIFY | Token-driven + `t(key)`. |
| `src/components/store/ProductDetail.tsx` | MODIFY | Token-driven + `t(key)` (component exists, unwired — see spec Out of Scope; migrated now for free consistency). |

### Store pages — string migration

| File | Change | Purpose |
|---|---|---|
| `src/app/(store)/page.tsx` | MODIFY | Any inline strings (section headings) → `t(key)`. |
| `src/app/(store)/products/page.tsx` | MODIFY | Page heading/empty state → `t(key)`. |
| `src/app/(store)/cart/page.tsx` | MODIFY | Page heading → `t(key)` if present. |
| `src/app/(store)/checkout/page.tsx` | MODIFY | Page heading → `t(key)` if present. |

### Docs

| File | Change | Purpose |
|---|---|---|
| `AGENTS.md` | MODIFY | FR-011: describe the public storefront as bilingual/direction-aware/theme-aware via runtime toggles. |

## RTL / Arabic Considerations

- No change to the existing logical-property discipline already established by `007`; FR-005 is a final sweep, not a new requirement.
- The theme/locale toggle controls added to `StoreNavbar.tsx` MUST themselves use logical properties (the admin's own toggle already does — copy that discipline, not necessarily the pixel layout).
- Icons: `useTheme`'s sun/moon icons and any language-toggle glyph are non-directional — no mirroring concern, matching the admin's own `SunIcon`/`MoonIcon` treatment.

## Phased Implementation Order

Each phase leaves the app in a shippable, `tsc`/`build`-clean state.

**Phase 0 — Shared hook parameterization**
- Parameterize `theme.hooks.ts` and `i18n.hooks.tsx` as specified above.
- Verify: `npx tsc --noEmit`, `npm run build`. Browser confirmation that `/admin` theme + locale toggles still work exactly as before is Human QA (user-performed, see Verification Steps) — not an implementer task.

**Phase 1 — Store dictionary + layout plumbing**
- Audit every hardcoded string across `(store)` (mirrors `006` T001's audit approach); write the full `store.*` `DictKey` block + `en`/`ar` values into `dictionary.ts`.
- `(store)/layout.tsx`: no-FOUC scripts, `LocaleProvider` wrap, token-driven body class.
- Add `.store-glass` to `globals.css`.
- Verify: `tsc`/`build` green; `/` renders unchanged visually (no consumer of the new dictionary keys yet).

**Phase 2 — Navbar toggle + theme-reactive chrome**
- `StoreNavbar.tsx`: theme + locale toggle controls, `.store-glass` swap, `t(key)` strings.
- Verify: `tsc`/`build` green. Confirming the toggles work end-to-end in-browser and that `/admin`'s own toggles are unaffected is Human QA (user-performed).

**Phase 3 — Component string + token migration (parallelizable across files)**
- Migrate every remaining `(store)` component/page per the File Inventory table.
- Verify: zero hardcoded Arabic-only or dark-only literal remains outside the hero's stage; `tsc`/`build` green.

**Phase 4 — Bento/Neumorphism restyle**
- `CategoryGrid.tsx` bento layout; `ProductCard.tsx`/`CartDrawer.tsx`/`StoreCheckoutForm.tsx` neumorphism adoption.
- Verify: `tsc`/`build` green. Side-by-side visual comparison with `/admin`'s bento overview and `ProductForm.tsx`'s neumorphic inputs is Human QA (user-performed).

**Phase 5 — Docs + full regression**
- `AGENTS.md` update (FR-011).
- `tsc`/`build` green as the implementer-owned gate. The full four-combination visual pass and `(landing)`/`(admin)` regression pass across `/`, `/products`, `/cart`, `/checkout` is Human QA (user-performed post-implementation, see Verification Steps).

## Risks / Open Questions

1. **Shared-hook regression risk** — `theme.hooks.ts`/`i18n.hooks.tsx` are used by the admin dashboard today; Phase 0's explicit admin-regression verification is the mitigation, not an afterthought.
2. **Hero stage/chrome boundary** — resolved precisely in `009`, not here; this plan's hero touch is deliberately narrow (strings/non-stage tokens only) to avoid stepping on `009`'s scope.
3. **`.store-glass` vs. reusing `.glass`** — `.glass` (light-mode-oriented, `rgba(255,255,255,0.08)`) exists but is tuned for a dark backdrop (subtle white overlay), not a light-theme opaque nav bar; a new utility was chosen over forcing `.glass`/`.glass-dark` into a role neither was designed for — consistent with "new patterns justified only when the existing primitive genuinely cannot express the requirement" (Constitution V).
4. **Dictionary size** — `dictionary.ts` grows by an estimated 40–60 keys; no technical risk, just a bookkeeping one (finalize the exact key list during Phase 1's audit, not guessed here).

## Verification Steps (every phase)

```bash
npx tsc --noEmit   # must pass, zero `any` escape hatches
npm run build      # must succeed
```

**Human QA checklist (performed by the user in-browser post-implementation — not an implementer task; listed here so the user knows what to check):**
- [ ] `/`, `/products`, `/cart`, `/checkout` each render correctly in all four theme×locale combinations.
- [ ] Store theme/locale preferences persist across reload and do not affect (or get affected by) the admin dashboard's own preferences in the same browser.
- [ ] `/admin/*` — theme toggle, locale toggle, login, all CRUD screens still function exactly as before Phase 0's hook change.
- [ ] `/[slug]` (the funnel) renders identically to pre-change — untouched by this plan.
- [ ] Category tiles and product cards visually match the admin's neumorphic/bento language in a side-by-side check.
- [ ] Zero hardcoded Arabic-only string remains in `(store)` outside database content (product/category names).
- [ ] Zero hardcoded dark-only literal class remains in `(store)` outside the Lookbook hero's deliberate stage exception.
