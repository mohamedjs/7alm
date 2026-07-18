import type { OrderChannel } from "@/features/orders/orders.analytics";

/**
 * Dashboard chart theme. The categorical hues are a CVD-validated set
 * (adjacent-pair ΔE checks pass on the white card surface); assign them
 * by entity, never by rank. The sub-3:1 hues (magenta, yellow) are only
 * used on bars that carry a visible value label.
 */

export const chartInk = {
  primary: "#0b0b0b",
  secondary: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  surface: "#ffffff",
} as const;

export const seriesColors = {
  retail: "#2a78d6", // blue — website / retail everywhere on the page
  social: "#eb6834", // orange — social aggregate in the trend chart
} as const;

export const channelMeta: Record<
  OrderChannel,
  { label: string; color: string }
> = {
  website: { label: "Website", color: "#2a78d6" },
  whatsapp: { label: "WhatsApp", color: "#008300" },
  facebook: { label: "Facebook", color: "#e87ba4" },
  instagram: { label: "Instagram", color: "#eda100" },
};

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
