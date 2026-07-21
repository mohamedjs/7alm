import type { OrderChannel } from "@/features/orders/orders.analytics";
import type { DictKey } from "@/features/i18n/dictionary";

/**
 * Dashboard chart theme — Vivid Nightfall / Ocean Breeze neumorphic palette.
 * The categorical hues are a CVD-validated set; assign them by entity,
 * never by rank.
 */

/*
 * Values are CSS var() references (see :root / .dark blocks in
 * src/app/globals.css, "Chart ink tokens") rather than hardcoded hex, so
 * these SVG fill/stroke/text-fill colors flip with the admin's dark mode.
 * seriesColors/channelMeta below stay hardcoded hex on purpose — they're
 * data-encoding colors (which entity is which), not surface/text ink, and
 * are legible on both a warm beige and a dark navy card without changing meaning.
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
  retail: "#06b6d4", // teal/cyan — website / retail (ocean theme)
  social: "#f97316", // orange — social aggregate in the trend chart
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
  website: { labelKey: "dashboard.channel.website", color: "#06b6d4" },
  whatsapp: { labelKey: "dashboard.channel.whatsapp", color: "#22c55e" },
  facebook: { labelKey: "dashboard.channel.facebook", color: "#8b5cf6" },
  instagram: { labelKey: "dashboard.channel.instagram", color: "#f97316" },
};

/*
 * Entity badge rotation: a fixed 5-color palette drawn from the
 * Vivid Nightfall / Ocean Breeze hues, assigned to a product/category
 * row by a stable hash of its id/name.
 */
export const badgePalette = [
  "#06b6d4", // cyan-500 (brand)
  "#f97316", // orange-500
  "#8b5cf6", // violet-500
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
