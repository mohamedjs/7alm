"use client";

import { useLocale } from "@/features/i18n/i18n.hooks";

/**
 * Recharts axis props derived from the current admin locale/direction.
 * RTL mirrors the x-axis (time/category flows right → left, matching
 * `OrdersTrendChart`'s previous hand-rolled behavior) and moves the
 * y-axis to the visual "start" side (right in RTL, left in LTR).
 */
export function useChartLocale() {
  const { dir } = useLocale();
  const isRtl = dir === "rtl";
  return {
    isRtl,
    xAxisProps: { reversed: isRtl },
    yAxisProps: { orientation: (isRtl ? "right" : "left") as "left" | "right" },
  };
}
