# Implementation Plan: Animated Dashboard Charts Upgrade

**Spec:** 011-dashboard-charts-upgrade
**Date:** 2026-07-23

---

## Architecture Approach

This is a **component-layer replacement** — the data layer (`orders.analytics.ts`)
and the page layout (`page.tsx` bento grid structure) remain unchanged. Only the
chart rendering components under `src/components/admin/charts/` are replaced or
enhanced.

```
┌──────────────────────────────────────────────────────────┐
│ page.tsx (UNCHANGED — same bento grid, same data flow)   │
├──────────────────────────────────────────────────────────┤
│ Chart Components (REPLACED / ENHANCED)                   │
│ ├── OrdersTrendChart.tsx  → Recharts AreaChart           │
│ ├── HorizontalBarChart.tsx → Recharts BarChart (list)    │
│ │                         → keep segmented variant       │
│ ├── StatTile.tsx          → + animated counter           │
│ │                         → + optional sparkline         │
│ ├── DonutChart.tsx        → NEW: Recharts PieChart       │
│ ├── RtlTooltip.tsx        → NEW: shared RTL tooltip      │
│ └── useChartLocale.ts     → NEW: shared RTL axis props   │
├──────────────────────────────────────────────────────────┤
│ chartTheme.ts (UNCHANGED — same tokens, same exports)    │
├──────────────────────────────────────────────────────────┤
│ orders.analytics.ts (UNCHANGED — same data structures)   │
├──────────────────────────────────────────────────────────┤
│ RTK Query hooks (UNCHANGED — same API layer)             │
└──────────────────────────────────────────────────────────┘
```

## File Change Map

### New Files

| File | Purpose |
|---|---|
| `src/components/admin/charts/useChartLocale.ts` | Shared hook returning `{ isRtl, xAxisProps, yAxisProps, tooltipPosition }` for all Recharts charts |
| `src/components/admin/charts/RtlTooltip.tsx` | Custom Recharts `<Tooltip content={...}>` that positions correctly in RTL |
| `src/components/admin/charts/DonutChart.tsx` | Recharts `<PieChart>` + `<Pie innerRadius={...}>` with center label and animated segments |
| `src/components/admin/charts/AnimatedValue.tsx` | Framer Motion animated counter component for use in StatTile |

### Modified Files

| File | Change |
|---|---|
| `src/components/admin/charts/OrdersTrendChart.tsx` | Full rewrite: replace hand-rolled SVG with Recharts `<AreaChart>` + `<Area>` (dual series), gradient `<defs>`, `<CartesianGrid>`, RTL axes, `<RtlTooltip>`, legend. Preserve the same props interface (`{ data: TrendPoint[] }`) so page.tsx needs zero changes. |
| `src/components/admin/charts/HorizontalBarChart.tsx` | Rewrite "list" variant to Recharts `<BarChart layout="vertical">`. Keep "segmented" variant as-is (hand-rolled) since Recharts 100% stacked bar doesn't match the compact single-bar visual. Same props interface (`BarRow[]`). |
| `src/components/admin/charts/StatTile.tsx` | Add `<AnimatedValue>` for the value display. Add optional `sparklineData?: number[]` prop for inline sparkline. Sparkline renders a tiny Recharts `<AreaChart>` with no axes. |
| `src/components/admin/charts/chartTheme.ts` | Add `rechartsAxisStyle` and `rechartsGridStyle` convenience objects. Export a `ANIMATION_DURATION` constant (800ms). No existing exports change. |
| `src/app/(admin)/admin/page.tsx` | Replace the orders-by-status `<HorizontalBarChart>` with `<DonutChart>`. Pass sparkline data to relevant StatTiles. Minimal changes — the component interfaces stay stable. |
| `src/features/i18n/dictionary.ts` | Add any new i18n keys needed for chart labels (e.g., donut center label "total orders"). |

### Unchanged Files (Critical — Do Not Touch)

| File | Reason |
|---|---|
| `src/features/orders/orders.analytics.ts` | Library-agnostic analytics — output types consumed as-is |
| `src/features/orders/orders.api.ts` | Data fetching layer — no changes needed |
| `src/features/orders/orders.hooks.ts` | UI hooks — no changes needed |
| All API routes under `src/app/api/` | Server-side — unaffected by chart rendering |

---

## Component Design Details

### 1. OrdersTrendChart (Recharts Rewrite)

```
<ResponsiveContainer width="100%" height={260}>
  <AreaChart data={data}>
    <defs>
      <linearGradient id="gradRetail" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={seriesColors.retail} stopOpacity={0.3} />
        <stop offset="100%" stopColor={seriesColors.retail} stopOpacity={0.02} />
      </linearGradient>
      <!-- same for social -->
    </defs>
    <CartesianGrid stroke={chartInk.grid} strokeDasharray="3 3" vertical={false} />
    <XAxis dataKey="label" {...xAxisProps} tick={{ fill: chartInk.muted, fontSize: 11 }} />
    <YAxis {...yAxisProps} tick={{ fill: chartInk.muted, fontSize: 11 }} />
    <Tooltip content={<RtlTooltip />} />
    <Legend />
    <Area type="monotone" dataKey="retail" stroke={seriesColors.retail}
          fill="url(#gradRetail)" animationDuration={800} />
    <Area type="monotone" dataKey="social" stroke={seriesColors.social}
          fill="url(#gradSocial)" animationDuration={800} />
  </AreaChart>
</ResponsiveContainer>
```

Key behaviors:
- `useChartLocale()` provides `xAxisProps = { reversed: true }` and
  `yAxisProps = { orientation: 'right' }` when RTL
- Gradient fills give the area chart a polished look that the hand-rolled
  version lacked
- WAAPI animation draws the area from zero on mount and morphs on data change
- Legend shows series dots + labels, localized via `t()`

### 2. HorizontalBarChart (Hybrid Approach)

**"list" variant** → Recharts `<BarChart layout="vertical">`:
- Each `BarRow` maps to a data point
- `<Bar>` uses `fill` from `row.color ?? defaultColor`
- `<YAxis dataKey="label" type="category">` shows entity names
- `<XAxis type="number">` shows values
- RTL: `<XAxis reversed={isRtl}>`, `<YAxis orientation={isRtl ? 'right' : 'left'}>`
- Animated bar growth from zero on mount
- Custom tooltip shows `row.detail` if present

**"segmented" variant** → Keep hand-rolled:
- The compact single-bar proportional display is unique — Recharts' stacked
  bar would require a fundamentally different layout
- Already works perfectly, is only ~50 lines, and has RTL support via
  logical CSS properties

### 3. DonutChart (New)

- Recharts `<PieChart>` with `<Pie innerRadius={60} outerRadius={90}>`
- Data from `statusBreakdown()` output, mapped to `{ name, value, fill }`
- Each segment gets a color from `badgeColorFor(status)` or a status-specific
  color map
- Center label: total order count (rendered as a custom `<text>` element
  inside the SVG)
- Animated segment sweep on mount (Recharts default `<Pie>` animation)
- Legend below showing status name + count
- RTL: no mirroring needed for radial charts — only legend text direction

### 4. AnimatedValue (New)

- Uses Framer Motion `useSpring` to animate from previous value to current
- Renders a `<motion.span>` with `tabular-nums` class
- Accepts `value: number`, `format: (n: number) => string`, `duration?: number`
- Defaults to 800ms ease-out
- Respects `prefers-reduced-motion: reduce` — skips animation, shows final value

### 5. StatTile Enhancement

- Replace the static `{value}` render with `<AnimatedValue>`
- Add optional `sparklineData?: number[]` prop
- When sparklineData is present, render a tiny (48px tall) Recharts
  `<AreaChart>` below the value with no axes, no grid, no tooltip —
  just the gradient-filled area shape
- Sparkline uses the tile's `accentClassName` color for stroke

### 6. useChartLocale Hook

```typescript
export function useChartLocale() {
  const { dir } = useLocale();
  const isRtl = dir === "rtl";
  return {
    isRtl,
    xAxisProps: { reversed: isRtl },
    yAxisProps: { orientation: (isRtl ? "right" : "left") as "left" | "right" },
  };
}
```

### 7. RtlTooltip Component

- Custom content component for Recharts `<Tooltip>`
- Uses `chartInk.surface` background, `neu-raised-sm` shadow class
- Positions text with `direction: rtl` when RTL
- Shows dataKey label + formatted value for each series
- Rounded corners matching the neumorphic card radius (12px)

---

## Dependency

**Package to install:** `recharts@^3`

No other new dependencies. Framer Motion (`motion@12.42.2`) is already installed.

---

## Animation Specifications

| Widget | Animation Type | Duration | Easing | Trigger |
|---|---|---|---|---|
| Area chart series | Draw from baseline | 800ms | ease-out | Mount + data change |
| Area gradient fill | Fade in with area | 800ms | ease-out | Mount + data change |
| Bar chart bars | Grow from zero width | 600ms | ease-out | Mount + data change |
| Donut segments | Sweep from 0 to target angle | 1000ms | ease-out | Mount + data change |
| Stat tile value | Count up/down | 800ms | spring (stiffness: 50) | Mount + data change |
| Sparkline | Draw from left | 600ms | ease-out | Mount |
| Chart entrance (wrapper) | Fade + translate-y | 300ms | ease-out | Mount (via existing `animate-in` classes) |

All animations honor `prefers-reduced-motion: reduce` — set duration to 0 or
skip the animation entirely.

---

## Security Considerations

- No new API routes, no new data endpoints — attack surface unchanged
- Chart data is already fetched via authenticated RTK Query endpoints
- No user input flows into chart rendering (data comes from server)
- Recharts renders SVG, not HTML — no XSS vector from data values
- No external CDN dependencies — Recharts is bundled locally

---

## Testing Strategy

1. **Visual regression**: Verify charts render identically in AR (RTL) and EN (LTR) modes
2. **Theme switching**: Verify charts update colors when toggling dark/light
3. **Data transitions**: Verify range change (7d → 30d → 90d) triggers smooth animation, not hard cut
4. **Empty state**: Verify charts handle zero data gracefully (no errors, shows empty state message)
5. **Accessibility**: Verify charts have `role="img"` and `aria-label` for screen readers
6. **Bundle size**: Verify tree-shaken Recharts import adds < 60KB gzipped to the bundle
7. **TypeScript**: `npx tsc --noEmit` passes
8. **Build**: `npm run build` passes
