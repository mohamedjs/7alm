# Feature Specification: Animated Dashboard Charts Upgrade

**Spec ID:** 011-dashboard-charts-upgrade
**Status:** Draft
**Priority:** P1
**Author:** CTO
**Date:** 2026-07-23
**Depends on:** 002-dashboard-analytics (implemented), 005-admin-bento-grid-redesign (implemented)

---

## Context

### Current State — This Is a Replace/Upgrade, NOT Greenfield

The admin dashboard (`src/app/(admin)/admin/page.tsx`) already has a working,
data-rich bento grid with three custom chart components:

| Component | Type | Lines | What It Does |
|---|---|---|---|
| `OrdersTrendChart.tsx` | Hand-rolled SVG area chart | ~200L | Dual-series (retail/social) with full RTL mirroring, RTL tooltips, RTL keyboard nav, ResizeObserver |
| `HorizontalBarChart.tsx` | Hand-rolled SVG bar chart | ~150L | Two variants: "list" (standard horizontal bars) and "segmented" (stacked proportional bar) |
| `StatTile.tsx` | KPI card | ~68L | Neumorphic stat card with delta chips, lg/sm size variants |
| `chartTheme.ts` | Theme tokens | ~96L | CSS-variable chart ink tokens that flip with dark mode, series/channel colors, badge palette, formatters |

The analytics data layer (`orders.analytics.ts`, 372 lines) outputs typed data
structures (`TrendPoint`, `ChannelStat`, `StatusStat`, `ZoneStat`, `ProductStat`,
`CategoryRevenueStat`, `DashboardKpis`) that are library-agnostic and must be
reused unchanged.

### What Is Missing

- No charting library — all charts are hand-rolled SVGs without smooth animations
- No entrance/transition animations on chart data (bars, areas, lines just appear)
- No donut/pie chart for status distribution
- No animated value counters on stat tiles
- No sparklines embedded in stat tiles
- No area fill gradients with animated reveal
- Limited interactivity (basic hover tooltips only, no active dot, no crosshair)

### What This Spec Covers

Replace the hand-rolled SVG chart components with Recharts v3, adding smooth
WAAPI-based animations, while preserving all existing RTL, theme, and layout
behavior. Enhance stat tiles with Framer Motion animated counters. Add new chart
types (donut, sparklines) that the hand-rolled approach made impractical.

---

## Library Selection: Recharts v3

### Evaluation Matrix

| Criterion | Recharts v3 | ApexCharts | Nivo | Chart.js (react-chartjs-2) |
|---|---|---|---|---|
| **npm weekly downloads** | 48.9M | ~800K (react-apexcharts) | ~1.2M | ~3.5M |
| **API style** | React components (JSX) | Config object | React components | Config object |
| **Rendering** | SVG | SVG+Canvas | SVG/Canvas/HTML | Canvas |
| **Animation engine** | WAAPI (v3) | Built-in CSS | react-spring | Built-in Canvas |
| **Native RTL support** | No (manual) | No (issues #53, #4006 open) | No | No |
| **TypeScript** | Full rewrite in v3 | @types package | Built-in | @types package |
| **Bundle size** | ~150KB | ~150KB | ~500KB+ | ~200KB (chart.js core) |
| **SSR safety** | Yes (SVG) | No (dynamic import) | Yes (SVG mode) | No (Canvas) |
| **Dark mode** | CSS variables on SVG | Theme config object | Theme prop | Theme config object |
| **Next.js compat** | Excellent | Client-only | Good | Client-only |

### Decision: Recharts v3

**Primary justifications:**

1. **RTL is manual for ALL top libraries.** None of the four candidates have
   native RTL chart mirroring. ApexCharts issues #53 and #4006 remain open
   feature requests. This neutralizes what would otherwise be the strongest
   counter-argument against Recharts.

2. **Component API aligns with the codebase.** Recharts' JSX component model
   (`<AreaChart>`, `<Bar>`, `<Tooltip>`, `<Legend>`) composes naturally with
   the project's React/component-first architecture. Custom RTL handling becomes
   writing custom React components (`<RtlTooltip>`, `<RtlLegend>`) — the same
   pattern the codebase already uses. ApexCharts' config-object API would be
   architecturally foreign.

3. **SVG + CSS variables = free dark mode.** Recharts renders SVG. The existing
   `chartTheme.ts` exports CSS-variable references (`var(--chart-ink-primary)`,
   `var(--chart-grid)`, etc.) that already flip with the admin's dark mode toggle.
   These pass directly to Recharts' `stroke`, `fill`, and `tick` props — zero
   additional dark-mode plumbing.

4. **48.9M weekly downloads.** 13x more than the next React charting library.
   Largest community, most documentation, lowest hire risk.

5. **v3 WAAPI animations.** Web Animations API replaces old CSS transitions in
   v3. Smooth on low-end devices. Combined with Framer Motion (already installed
   as `motion@12.42.2`) for animated counters and chart entrance animations.

6. **SSR is irrelevant but clean.** The dashboard is `"use client"` with RTK
   Query — both Recharts and ApexCharts work client-side. But Recharts doesn't
   need `dynamic(..., { ssr: false })` wrappers, keeping the code simpler.

**Trade-off acknowledged:** ApexCharts has superior out-of-the-box animation
polish (zoom, brush, annotation). These features serve data exploration UIs, not
dashboard overview pages. For a KPI overview dashboard, Recharts v3 WAAPI
animations + Framer Motion entrance effects are more than sufficient.

---

## User Scenarios & Testing

### US-1: Animated chart entrance on dashboard load (Priority: P1)

**Given** an admin navigates to the dashboard overview
**When** the page loads and data arrives from RTK Query
**Then** all charts animate in: area charts draw from left-to-right (or
right-to-left in RTL), bar charts grow from zero, donut segments sweep in,
stat tile values count up from 0 to their target number.

### US-2: Smooth chart transitions on data change (Priority: P1)

**Given** the admin changes the date range preset (7d / 30d / 90d) or applies
a custom date range
**When** the data updates via RTK Query cache
**Then** charts animate smoothly from old data positions to new data positions
(not a hard cut). Bars grow/shrink, area paths morph, donut segments resize.

### US-3: Interactive chart tooltips in RTL (Priority: P1)

**Given** the admin hovers or taps a chart element
**When** a tooltip appears
**Then** it positions correctly in both RTL and LTR layouts — never clipped by
the viewport edge, never overlapping the cursor on the wrong side.

### US-4: Animated counter on stat tiles (Priority: P2)

**Given** the dashboard loads or data changes
**When** a stat tile's value updates (e.g., revenue goes from 0 to 15,000 EGP)
**Then** the number animates (counts up/down) over ~800ms with an ease-out curve.
The animation uses Framer Motion, not the charting library.

### US-5: Donut chart for order status distribution (Priority: P2)

**Given** orders exist in multiple statuses
**When** the dashboard renders
**Then** a donut chart shows the proportional distribution of orders by status,
with animated segment sweep-in, a center label showing total orders, and
a legend showing status name + count per segment.

### US-6: Sparklines in stat tiles (Priority: P3)

**Given** trend data is available
**When** a stat tile renders
**Then** a tiny inline sparkline (area or line) shows the 7-day mini-trend
beneath the main value, adding visual context without requiring a full chart.

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Install `recharts@^3` as a production dependency | P0 |
| FR-02 | Replace `OrdersTrendChart.tsx` with a Recharts `<AreaChart>` preserving dual-series (retail/social), RTL axis mirroring, gradient fills, and animated entrance | P1 |
| FR-03 | Replace `HorizontalBarChart.tsx` "list" variant with Recharts `<BarChart layout="vertical">` preserving entity badge colors, hover states, and detail tooltips | P1 |
| FR-04 | Keep or adapt the "segmented" variant of `HorizontalBarChart` — Recharts has no direct equivalent; may remain hand-rolled or use a 100% stacked `<BarChart>` | P2 |
| FR-05 | Add a `<DonutChart>` widget using Recharts `<PieChart>` + `<Pie innerRadius>` for orders-by-status, replacing the current horizontal bar chart for that widget | P2 |
| FR-06 | Add animated counters to `StatTile` values using Framer Motion `useSpring` / `useTransform` (not the charting library) | P2 |
| FR-07 | Add optional sparkline to `StatTile` using Recharts `<AreaChart>` with no axes/grid/tooltip (just the filled shape) | P3 |
| FR-08 | All Recharts components must use colors from `chartTheme.ts` (`chartInk.*`, `seriesColors`, `channelMeta`, `badgePalette`) — no new color constants | P1 |
| FR-09 | All Recharts components must support RTL via the concrete RTL plan (see below) | P1 |
| FR-10 | All Recharts components must render correctly in both dark and light themes without additional CSS | P1 |
| FR-11 | Preserve the existing bento grid layout structure in `page.tsx` — same grid-cols, same card assignments, same responsive breakpoints | P1 |
| FR-12 | DO NOT modify `orders.analytics.ts` — consume its existing output types (`TrendPoint`, `ChannelStat`, `StatusStat`, `ZoneStat`, `ProductStat`, `CategoryRevenueStat`, `DashboardKpis`) as-is | P0 |
| FR-13 | All chart label strings must use `t(key)` from the i18n dictionary — no hardcoded text | P1 |

### Concrete RTL Plan for Recharts

Every Recharts chart component must accept and respond to `dir` from `useLocale()`:

| Element | LTR behavior | RTL behavior |
|---|---|---|
| `<XAxis>` | Default (left-to-right) | `reversed={true}` — time flows right-to-left |
| `<YAxis>` | `orientation="left"` | `orientation="right"` |
| `<Tooltip>` | Custom component positions to the right of cursor | Positions to the left of cursor |
| `<Legend>` | Default alignment | `style={{ direction: 'rtl' }}` on the wrapper |
| `<PieChart>` | No mirroring needed | No mirroring needed (radial charts are direction-agnostic) |
| Container `<ResponsiveContainer>` | Default | No mirroring — the axis `reversed` prop handles it |

A shared `useChartLocale()` hook should return `{ isRtl, xAxisProps, yAxisProps }` so each chart doesn't repeat the conditional logic.

### Theme Integration

Recharts SVG elements accept inline style/props for colors. Map as follows:

| Recharts prop | Source |
|---|---|
| `<XAxis tick={{ fill: chartInk.muted }}` | `chartTheme.ts` → CSS var |
| `<YAxis tick={{ fill: chartInk.muted }}` | Same |
| `<CartesianGrid stroke={chartInk.grid}` | Same |
| `<Area stroke={seriesColors.retail}` | Same (hardcoded hex — intentional) |
| `<Tooltip contentStyle={{ background: chartInk.surface }}` | Same |
| `<Pie data={[...]}` fill per segment | `badgeColorFor(id)` / `channelMeta[ch].color` |

Because `chartInk` values are `var(--chart-*)` references, the SVG elements
inherit the current theme automatically when the CSS variables change — no
React state or re-render needed for theme switching.

### Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | Recharts tree-shaken import (import only used chart types, not the entire library) |
| NFR-02 | All chart animations must be cancelable (no animation if `prefers-reduced-motion: reduce`) |
| NFR-03 | TypeScript strict — `npx tsc --noEmit` must pass |
| NFR-04 | Production build — `npm run build` must pass |

---

## Key Entities (Unchanged)

All data types are already defined in `src/features/orders/orders.analytics.ts`
and `src/features/shared/types.ts`. No new types needed for this spec.

---

## Success Criteria

| Metric | Target |
|---|---|
| Charts animate on load | Entrance animations visible on all 6+ chart widgets |
| Charts animate on data change | Range change triggers smooth morphing, not hard cut |
| RTL correctness | All charts render correctly with Arabic locale (x-axis reversed, y-axis right, tooltips positioned correctly) |
| Theme correctness | All charts render correctly in both dark and light modes |
| Bundle size delta | < 60KB gzipped increase (Recharts tree-shaken) |
| TypeScript | `npx tsc --noEmit` passes with zero errors |
| Build | `npm run build` passes |
| No analytics regression | `orders.analytics.ts` unchanged, all existing data flows preserved |

---

## Assumptions

1. Recharts v3 is published on npm as `recharts@^3` (verified: v3.x is current stable as of mid-2026).
2. The `motion` package (Framer Motion v12) already installed is sufficient for animated counters — no additional animation library needed.
3. The existing `chartTheme.ts` CSS variable tokens work with Recharts SVG rendering without modification.
4. The segmented bar variant (used for "Orders by channel") may remain hand-rolled if Recharts' stacked bar doesn't provide equivalent visual quality — this is an implementation-time decision for @frontend.

---

## Out of Scope

- New API routes or data endpoints — all data is already available via existing RTK Query hooks
- Changes to `orders.analytics.ts` — consume as-is
- New dashboard widgets beyond those specified (e.g., no maps, no funnels)
- Mobile-specific chart interactions (pinch-to-zoom, etc.)
- Real-time chart streaming (existing Supabase Realtime + RTK Query refetch handles updates already)
