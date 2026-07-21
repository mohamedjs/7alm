# Implementation Plan: Admin Bento Grid Redesign

**Branch**: `005-admin-bento-grid-redesign` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

## Summary

Rebuild `AdminOverviewPage` as an asymmetric CSS-grid bento layout (hero +
wide + standard tiles) consuming `004`'s tokens, restyle the sidebar/header
to match, and give table pages a lighter visual refresh — all using logical
Tailwind properties exclusively so `006`'s RTL toggle requires no further
markup rewrites.

## Visual Design Direction

The user supplied a reference screenshot (a "Coinix" crypto-portfolio
dashboard) as the visual target. Adapt its *structure and card language* to
7alm's own brand — do not clone its purple palette; 7alm already has a
brand identity (coral/terracotta + gold) that this redesign should express,
not replace.

**What to take from the reference:**
- A welcome header with the admin's context inline (greeting + a row of
  small quick-metric pills with colored delta chips), not just a bare page
  title.
- Soft, rounded (`rounded-2xl`+), low-border, subtle-shadow white/surface
  cards — no heavy `border` + flat corners look.
- One clearly largest "hero" card (their "Total Balance") that anchors the
  grid, with primary/secondary action buttons inline in that card.
- Colored circular badge icons per entity (their coin icons) used
  consistently across widgets — a small rotating accent palette applied to
  "Top products" and "Revenue by category" rows so each item is instantly
  scannable by color, not just by reading its label.
- A segmented gradient bar treatment for one ranked-comparison widget
  (their "Market Leaders") — good fit for "Orders by channel".
- Green/red small pill badges for percentage deltas (already exists in
  `StatTile`'s `delta` prop — keep using it, just make sure it reads
  correctly inside the new card shapes).

**Token system (color) — extends `004`'s tokens, does not replace them:**
- Primary accent: `--color-brand-500` (`#dd6253`, existing) — hero card,
  primary buttons, active nav state.
- Secondary accent: `--color-gold-500` (`#e6a817`, existing) — secondary
  emphasis (e.g. the AOV tile).
- Entity badge rotation (Top products / Revenue by category / legend
  dots): a fixed 5-color rotation drawn from palettes already in
  `globals.css` — brand-500, gold-500, blue-500 (`#3b82f6`), green-500
  (`#22c55e`), pink-500 (`#ec4899`) — assigned by stable hash of the
  entity's id/name so a given product always gets the same color across
  renders (not random per render).
- Surface/border/text: use `004`'s semantic tokens (`surface`,
  `surface-raised`, `border`, `text-primary`, `text-muted`) — do not
  introduce a second color system.

**Layout concept (desktop, ASCII sketch):**
```
┌─────────────────────────────────────────┬───────────────┐
│ Welcome, {admin} · quick-metric pill row │ theme/locale  │
├───────────────────┬──────────────────────┴───────────────┤
│                    │  Orders per day (wide trend chart)   │
│  Revenue hero      ├──────────────┬────────────────────────┤
│  (tall, spans 2)   │  Avg order   │  Pending orders        │
│                    │  value       │                        │
├───────────────────┼──────────────┴────────────────────────┤
│ Top products       │ Revenue by category  │ Orders by      │
│ (colored badges)    │ (colored badges)      │ channel (bar)  │
├─────────────────────┴────────────────────┴────────────────┤
│ Orders by status  │  Top delivery zones  │  Social share    │
└─────────────────────────────────────────────────────────────┘
```
Mobile: collapses to a single column, hero card first, in roughly the same
priority order as today's stat-tile-then-charts flow.

**Signature element**: the color-coded entity badge (a small rounded
circle/square with the product or category's stable accent color) is the
one device carried through every list-shaped widget (top products, revenue
by category) — it's what makes the redesign read as *a system*, not a set
of independently-styled cards, mirroring why the coin icons work so well
in the reference.

**Type**: keep the existing `--font-sans` (Inter). Currency/number columns
should use `tabular-nums` so figures align vertically within a card,
matching the clean price-column alignment in the reference.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 16, Tailwind CSS v4
**Primary Dependencies**: `004-admin-design-system`'s tokens + dark variant; existing chart primitives (no new charting library)
**Storage**: N/A
**Testing**: `npx tsc --noEmit`, `npm run build`, manual QA (desktop/mobile, light/dark)
**Target Platform**: Web, `(admin)/admin/*`
**Constraints**: Zero widget/behavior removal from `002`; zero physical-direction Tailwind utilities in touched files (Constitution III); tokens from `004` only, no raw color utilities
**Scale/Scope**: `AdminOverviewPage` (primary), `AdminLayoutClient.tsx` (secondary), Orders/Products/Categories list pages (light refresh)

## Constitution Check

- **I. Layered Architecture**: PASS — presentation-only, no data/hooks logic changed.
- **II. TypeScript Strict**: PASS.
- **III. RTL/i18n**: this feature is the primary place Principle III's logical-property rule is enforced pre-emptively — every task below is scoped to files and must leave zero physical-direction utilities.
- **IV. No Business Logic in Components**: PASS.
- **V. Reuse Existing Primitives**: PASS — reuses `002`'s widgets and `004`'s tokens; no new chart or UI library.
- **VI. State Machine / Factory**: PASS — order-status action buttons keep their `orderStateMachine.ts`-driven logic untouched, only wrapper markup changes.

No violations.

## Project Structure

```text
src/app/(admin)/admin/page.tsx                              # MODIFY: bento grid rebuild (all 002 widgets preserved)
src/components/admin/dashboard/AdminLayoutClient.tsx        # MODIFY: visual restyle only, no functional change
src/app/(admin)/admin/{orders,products,categories}/**/*.tsx # MODIFY: light visual refresh (tokens/spacing), no structural change
src/components/admin/{OrdersTable,products/ProductList,categories/CategoryList}.tsx  # MODIFY: token/spacing refresh
```

**Structure Decision**: No new files/directories — every task modifies an existing file's markup/classes only.
