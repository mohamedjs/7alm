# Tasks: Animated Dashboard Charts Upgrade

**Spec:** 011-dashboard-charts-upgrade
**Date:** 2026-07-23

---

## Task Dependency Graph

```
T01 (install recharts) ─┐
                         ├─► T02 (useChartLocale hook)
                         │    │
                         │    ├─► T03 (RtlTooltip)
                         │    │    │
                         │    │    ├─► T04 (OrdersTrendChart rewrite)
                         │    │    └─► T05 (HorizontalBarChart rewrite)
                         │    │
                         │    └─► T07 (DonutChart)
                         │
T06 (AnimatedValue) ─────┤
                         │
                         ├─► T08 (StatTile enhancement)
                         │
                         └─► T09 (page.tsx integration)
                              │
                              └─► T10 (verification)
```

---

## T01 — Install Recharts v3

**Priority:** P0 | **Estimate:** 5 min | **Blocked by:** none

Install the library and verify it compiles with the existing TypeScript config.

**Deliverables:**
- Run `npm install recharts@^3`
- Verify `npx tsc --noEmit` still passes
- Verify `npm run build` still passes (no import conflicts)

**Acceptance Criteria:**
- `recharts` appears in `package.json` dependencies
- No TypeScript or build errors introduced

---

## T02 — Create `useChartLocale` Hook

**Priority:** P1 | **Estimate:** 15 min | **Blocked by:** T01

Create a shared hook that encapsulates RTL-aware axis props for Recharts charts.

**File:** `src/components/admin/charts/useChartLocale.ts`

**Deliverables:**
- Hook returns `{ isRtl, xAxisProps, yAxisProps }` where:
  - `xAxisProps = { reversed: isRtl }`
  - `yAxisProps = { orientation: isRtl ? 'right' : 'left' }`
- Uses `useLocale()` from `src/features/i18n/i18n.hooks`
- Properly typed — return type is explicit, not inferred

**Acceptance Criteria:**
- When locale is AR/RTL, `xAxisProps.reversed === true` and `yAxisProps.orientation === 'right'`
- When locale is EN/LTR, `xAxisProps.reversed === false` and `yAxisProps.orientation === 'left'`
- TypeScript passes

---

## T03 — Create `RtlTooltip` Component

**Priority:** P1 | **Estimate:** 30 min | **Blocked by:** T02

Create a custom Recharts tooltip that matches the neumorphic design and handles
RTL positioning.

**File:** `src/components/admin/charts/RtlTooltip.tsx`

**Deliverables:**
- Implements the Recharts custom tooltip content interface (`TooltipProps`)
- Uses `chartInk.surface` for background, neumorphic shadow classes
- Text direction set via `useLocale()` — `dir="rtl"` when Arabic
- Shows data point label + formatted values for each visible series
- Rounded corners (12px) matching neumorphic card radius
- Font: `text-xs`, `tabular-nums` for numeric values
- Series color dots before each value line
- Accepts optional `formatValue?: (value: number) => string` prop

**Acceptance Criteria:**
- Tooltip renders correctly in both RTL and LTR
- Tooltip uses neumorphic styling consistent with existing `neu-raised-sm` cards
- Colors come from `chartTheme.ts`, not hardcoded
- TypeScript passes

---

## T04 — Rewrite `OrdersTrendChart` with Recharts

**Priority:** P1 | **Estimate:** 60 min | **Blocked by:** T03

Replace the 200-line hand-rolled SVG area chart with a Recharts AreaChart while
preserving the exact same component interface.

**File:** `src/components/admin/charts/OrdersTrendChart.tsx`

**Props interface (MUST NOT CHANGE):**
```typescript
interface OrdersTrendChartProps {
  data: TrendPoint[];
}
```

**Deliverables:**
- `<ResponsiveContainer>` wrapping `<AreaChart>`
- Two `<Area>` series: `dataKey="retail"` and `dataKey="social"`
- Linear gradient `<defs>` for each series (top: 30% opacity, bottom: 2% opacity)
- `<CartesianGrid>` with `stroke={chartInk.grid}`, `vertical={false}`, `strokeDasharray="3 3"`
- `<XAxis>` with `dataKey="label"`, spread `xAxisProps` from `useChartLocale()`
- `<YAxis>` with spread `yAxisProps`, tick formatter for clean numbers
- `<Tooltip content={<RtlTooltip />}>`
- Inline legend above the chart (matching existing design: colored line + label)
- Animation duration 800ms, ease-out
- MUST preserve: series colors from `seriesColors.retail` and `seriesColors.social`
- MUST preserve: `aria-label` for accessibility
- Remove the entire ResizeObserver / manual SVG path / pointer tracking code

**Acceptance Criteria:**
- Chart looks visually equivalent to the current version but with smooth animations
- Gradient fills are visible and polished
- RTL mode mirrors the x-axis (time flows right-to-left) and moves y-axis to right
- Tooltip shows both series values with correct formatting
- No changes needed in `page.tsx` — same component, same props
- TypeScript passes

---

## T05 — Rewrite `HorizontalBarChart` "list" Variant with Recharts

**Priority:** P1 | **Estimate:** 60 min | **Blocked by:** T03

Replace the "list" variant of HorizontalBarChart with a Recharts vertical-layout
BarChart. Keep the "segmented" variant as-is.

**File:** `src/components/admin/charts/HorizontalBarChart.tsx`

**Props interface (MUST NOT CHANGE):**
```typescript
interface HorizontalBarChartProps {
  rows: BarRow[];
  color?: string;
  formatValue?: (value: number) => string;
  variant?: "list" | "segmented";
}
```

**Deliverables:**
- When `variant === "list"`:
  - Render `<BarChart layout="vertical">` with `<Bar>`
  - `<YAxis dataKey="label" type="category">` for entity names (truncate long labels)
  - `<XAxis type="number">` for values
  - Each bar gets `fill` from `row.color ?? color`
  - Bars animate from zero width on mount (600ms ease-out)
  - Custom tooltip shows `row.detail` when hovered
  - RTL: reversed x-axis, y-axis on right side
- When `variant === "segmented"`:
  - Keep the existing hand-rolled implementation unchanged
  - It already works perfectly with RTL and neumorphic styling

**Acceptance Criteria:**
- "list" variant renders Recharts bars with smooth entrance animation
- "segmented" variant is unchanged — existing visual behavior preserved
- Both variants still accept the same `BarRow[]` data shape
- Entity badge colors (`badgeColorFor`) still work
- RTL mode renders correctly
- No changes needed in `page.tsx`
- TypeScript passes

---

## T06 — Create `AnimatedValue` Component

**Priority:** P2 | **Estimate:** 30 min | **Blocked by:** none (uses Framer Motion, not Recharts)

Create a Framer Motion animated counter that counts up/down when the value
changes.

**File:** `src/components/admin/charts/AnimatedValue.tsx`

**Deliverables:**
- Props: `value: number`, `format: (n: number) => string`, `duration?: number`
- Uses Framer Motion `useSpring` + `useTransform` + `motion.span`
- Counts from previous value to current value over `duration` ms (default 800)
- Spring config: `stiffness: 50, damping: 20` for a natural feel
- Uses `useReducedMotion()` from Framer Motion — when true, renders final value immediately
- Class: `tabular-nums` for stable digit width during animation
- Component is `"use client"` and memo-wrapped

**Acceptance Criteria:**
- On mount, counts up from 0 to target value
- On value change, smoothly transitions from old to new
- Works with any format function (EGP currency, compact number, percentage)
- No jank or layout shift during animation
- Reduced motion users see the final value instantly
- TypeScript passes

---

## T07 — Create `DonutChart` Component

**Priority:** P2 | **Estimate:** 45 min | **Blocked by:** T02, T03

Create a donut chart for orders-by-status distribution using Recharts PieChart.

**File:** `src/components/admin/charts/DonutChart.tsx`

**Deliverables:**
- Props: `segments: Array<{ key: string; label: string; value: number; color: string }>`, `centerLabel?: string`, `centerValue?: string`
- Recharts `<PieChart>` with `<Pie innerRadius={60} outerRadius={90}>`
- Each segment colored by `segment.color`
- Animated sweep-in on mount (1000ms)
- Center label rendered as a custom SVG `<text>` element showing total
- Legend below the chart: colored dot + label + count per segment
- Legend text direction respects RTL via `useLocale()`
- Hover: segment expands slightly (activeShape with larger outerRadius)

**Acceptance Criteria:**
- Donut renders with correct proportions matching `statusBreakdown()` data
- Animated sweep on mount
- Center shows total order count
- Legend is readable in both RTL and LTR
- Colors are consistent with the existing status display
- TypeScript passes

---

## T08 — Enhance `StatTile` with Animated Counter and Sparkline

**Priority:** P2 | **Estimate:** 30 min | **Blocked by:** T01, T06

Upgrade StatTile to use AnimatedValue for the main metric and optionally render
an inline sparkline.

**File:** `src/components/admin/charts/StatTile.tsx`

**Deliverables:**
- Replace the static `{value}` text with `<AnimatedValue>` for numeric values
  - StatTile.value is a string (e.g., "15,000 EGP") — AnimatedValue needs the
    raw number. Add optional `rawValue?: number` and `valueFormat?: (n: number) => string` props.
    When both are provided, use AnimatedValue. When not, fall back to static text.
- Add optional `sparklineData?: number[]` prop
  - When present, render a tiny Recharts `<AreaChart>` (width: 100%, height: 48px)
  - No axes, no grid, no tooltip, no legend — just the gradient-filled area
  - Stroke color derived from `accentClassName` (extract the color or accept an
    explicit `sparklineColor?: string` prop)
  - Gradient fill: same color at 20% opacity top, 0% bottom
  - Animation: 600ms draw-in

**Acceptance Criteria:**
- Stat tiles with `rawValue` + `valueFormat` show animated counting
- Stat tiles without those props work exactly as before (backward compatible)
- Sparkline renders when `sparklineData` is provided
- Sparkline is subtle — decorative, not interactive
- Existing bento grid layout is not disrupted
- TypeScript passes

---

## T09 — Integrate New Charts into Dashboard Page

**Priority:** P1 | **Estimate:** 45 min | **Blocked by:** T04, T05, T07, T08

Update `page.tsx` to use the upgraded chart components and the new DonutChart.

**File:** `src/app/(admin)/admin/page.tsx`

**Deliverables:**
- Replace the "Orders by status" `<HorizontalBarChart>` in Grid C with `<DonutChart>`
  - Map `view.statuses` to DonutChart's segment format
  - Center label: total orders count
  - Segment colors: use a status-color map or `badgeColorFor(status)`
- Pass `rawValue` and `valueFormat` to StatTile instances that show numeric KPIs:
  - Revenue tile: `rawValue={view.kpis.revenue}`, `valueFormat={formatEgp}`
  - AOV tile: `rawValue={view.aov}`, `valueFormat={formatEgp}`
  - Total orders tile: `rawValue={view.kpis.total}`, `valueFormat={formatCompact}`
  - Pending orders tile: `rawValue={view.kpis.pending}`, `valueFormat={formatCompact}`
- Optionally pass `sparklineData` to revenue and orders StatTiles using the last
  7 entries from `view.trend` (extract `trend.slice(-7).map(t => t.retail + t.social)`)
- Add any new i18n dictionary keys needed (e.g., donut center label)
- Verify the bento grid layout is unchanged — same col-spans, same row-spans

**Acceptance Criteria:**
- Dashboard loads with animated charts — entrance animations visible
- Changing date range triggers smooth chart transitions
- Donut chart replaces the old status bar chart in Grid C
- Stat tiles count up on load
- Revenue and total-orders tiles show sparklines
- All charts render correctly in RTL (Arabic) and LTR (English)
- All charts render correctly in dark and light themes
- No layout breakage at any responsive breakpoint
- TypeScript passes
- Build passes

---

## T10 — Verification and Cleanup

**Priority:** P1 | **Estimate:** 30 min | **Blocked by:** T09

Final verification pass.

**Deliverables:**
- Run `npx tsc --noEmit` — must pass with zero errors
- Run `npm run build` — must succeed
- Manual visual check in RTL mode (Arabic)
- Manual visual check in LTR mode (English)
- Manual visual check in dark theme
- Manual visual check in light theme
- Verify animation on range change (7d → 30d → 90d → custom)
- Verify empty state (no orders) still renders correctly
- Remove any dead code from the old hand-rolled SVG implementations
- Verify no unused imports from the old chart code remain
- Check bundle size: `npm run build` output should show reasonable chunk sizes

**Acceptance Criteria:**
- Zero TypeScript errors
- Clean production build
- All four mode combinations work (AR+dark, AR+light, EN+dark, EN+light)
- No console errors or warnings from Recharts
- Old hand-rolled SVG code removed (except segmented bar variant)
