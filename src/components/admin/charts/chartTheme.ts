import type { OrderChannel } from "@/features/orders/orders.analytics";
import type { DictKey } from "@/features/i18n/dictionary";

/**
 * Dashboard chart theme. The categorical hues are a CVD-validated set
 * (adjacent-pair ΔE checks pass on the white card surface); assign them
 * by entity, never by rank. The sub-3:1 hues (magenta, yellow) are only
 * used on bars that carry a visible value label.
 */

/*
 * Values are CSS var() references (see :root / .dark blocks in
 * src/app/globals.css, "Chart ink tokens") rather than hardcoded hex, so
 * these SVG fill/stroke/text-fill colors flip with the admin's dark mode.
 * seriesColors/channelMeta below stay hardcoded hex on purpose — they're
 * data-encoding colors (which entity is which), not surface/text ink, and
 * are legible on both a white and a dark card without changing meaning.
 */
export const chartInk = {
  primary: "var(--chart-ink-primary)",
  secondary: "var(--chart-ink-secondary)",
  muted: "var(--chart-ink-muted)",
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
  surface: "var(--chart-surface)",
} as const;

export const seriesColors = {
  retail: "#2a78d6", // blue — website / retail everywhere on the page
  social: "#eb6834", // orange — social aggregate in the trend chart
} as const;

/*
 * Channel display strings live in the i18n dictionary (dashboard.channel.*)
 * rather than here — chartTheme.ts stays locale-agnostic; only the color
 * (a data-encoding constant, not copy) belongs to this module. Callers
 * resolve the label via `t(channelMeta[channel].labelKey)`.
 */
export const channelMeta: Record<
  OrderChannel,
  { labelKey: DictKey; color: string }
> = {
  website: { labelKey: "dashboard.channel.website", color: "#2a78d6" },
  whatsapp: { labelKey: "dashboard.channel.whatsapp", color: "#008300" },
  facebook: { labelKey: "dashboard.channel.facebook", color: "#e87ba4" },
  instagram: { labelKey: "dashboard.channel.instagram", color: "#eda100" },
};

/*
 * Entity badge rotation (005-admin-bento-grid-redesign, "Visual Design
 * Direction"): a fixed 5-color palette drawn from the brand/accent hues
 * already in globals.css, assigned to a product/category row by a stable
 * hash of its id/name — never randomly per render — so a given entity
 * always gets the same badge color across renders and page loads. Used by
 * "Top products" and "Revenue by category" rows on the Overview bento
 * grid (src/app/(admin)/admin/page.tsx) via BarRow.color.
 */
export const badgePalette = [
  "#dd6253", // brand-500
  "#e6a817", // gold-500
  "#3b82f6", // blue-500
  "#22c55e", // green-500
  "#ec4899", // pink-500
] as const;

/** Deterministic (non-cryptographic) string hash — same input always maps to the same index. */
function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // force 32-bit int
  }
  return Math.abs(hash);
}

/** Stable badge color for an entity id/name, drawn from badgePalette. */
export function badgeColorFor(id: string): string {
  return badgePalette[stableHash(id) % badgePalette.length];
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000)
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(value) >= 10_000)
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return value.toLocaleString("en-US");
}

export function formatEgp(value: number): string {
  return `${formatCompact(Math.round(value))} EGP`;
}

/** Round a max up to a clean 1/2/5 × 10ⁿ step for axis ticks. */
export function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(value)));
  for (const step of [1, 2, 5, 10]) {
    if (value <= step * power) return step * power;
  }
  return 10 * power;
}
