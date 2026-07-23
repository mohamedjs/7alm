"use client";

import type { TooltipContentProps } from "recharts";
import { useLocale } from "@/features/i18n/i18n.hooks";
import { chartInk } from "./chartTheme";

interface RtlTooltipProps extends Partial<TooltipContentProps<number, string>> {
  /** Formats each series' numeric value; defaults to a plain thousands-grouped number. */
  formatValue?: (value: number) => string;
}

const defaultFormat = (value: number) => value.toLocaleString("en-US");

/**
 * Neumorphic Recharts tooltip content, direction-aware (renders `dir="rtl"`
 * when the admin locale is Arabic so the label/series list reads in the
 * same order as the surrounding UI).
 */
export function RtlTooltip({ active, payload, label, formatValue }: RtlTooltipProps) {
  const { dir } = useLocale();
  if (!active || !payload || payload.length === 0) return null;

  const format = formatValue ?? defaultFormat;

  return (
    <div
      dir={dir}
      className="min-w-[120px] rounded-xl px-3 py-2 text-xs neu-raised-sm"
      style={{ backgroundColor: chartInk.surface }}
    >
      {label !== undefined && label !== null && label !== "" && (
        <p className="mb-1 font-medium text-text-muted">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, index) => {
          const rawValue = entry.value;
          const numericValue = typeof rawValue === "number" ? rawValue : Number(rawValue ?? 0);
          return (
            <p
              key={`${String(entry.dataKey ?? entry.name ?? index)}`}
              className="flex items-center gap-2"
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color ?? entry.fill }}
              />
              {entry.name !== undefined && entry.name !== null && (
                <span className="text-text-muted">{entry.name}</span>
              )}
              <span className="font-semibold tabular-nums text-text-primary">
                {format(numericValue)}
              </span>
            </p>
          );
        })}
      </div>
    </div>
  );
}

export default RtlTooltip;
