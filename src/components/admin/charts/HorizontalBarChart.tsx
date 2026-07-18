"use client";

import { useState } from "react";
import { chartInk, niceCeil } from "./chartTheme";

export interface BarRow {
  key: string;
  label: string;
  value: number;
  /** Series color when rows are distinct entities; omit for a single-hue chart. */
  color?: string;
  /** Extra line shown in the hover tooltip (e.g. revenue). */
  detail?: string;
}

interface HorizontalBarChartProps {
  rows: BarRow[];
  /** Hue for all bars when rows don't carry their own color. */
  color?: string;
  formatValue?: (value: number) => string;
}

export default function HorizontalBarChart({
  rows,
  color = "#2a78d6",
  formatValue = (v) => v.toLocaleString("en-US"),
}: HorizontalBarChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = niceCeil(Math.max(1, ...rows.map((r) => r.value)));

  return (
    <div className="space-y-2.5">
      {rows.map((row) => {
        const barColor = row.color ?? color;
        const isHovered = hovered === row.key;
        return (
          <div
            key={row.key}
            className="group relative grid grid-cols-[92px_1fr] items-center gap-3 py-0.5"
            tabIndex={0}
            onPointerEnter={() => setHovered(row.key)}
            onPointerLeave={() => setHovered(null)}
            onFocus={() => setHovered(row.key)}
            onBlur={() => setHovered(null)}
          >
            <span className="flex items-center gap-1.5 text-xs text-gray-600 truncate">
              {row.color && (
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: row.color }}
                />
              )}
              <span className="truncate">{row.label}</span>
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="h-4 rounded-r-[4px] transition-opacity"
                style={{
                  width: `${(row.value / max) * 100}%`,
                  minWidth: row.value > 0 ? 3 : 0,
                  backgroundColor: barColor,
                  opacity: hovered === null || isHovered ? 1 : 0.45,
                }}
              />
              <span
                className="text-xs font-semibold text-gray-900 tabular-nums shrink-0"
                style={{ color: chartInk.primary }}
              >
                {formatValue(row.value)}
              </span>
            </div>

            {isHovered && row.detail && (
              <div className="pointer-events-none absolute left-[92px] -top-7 z-10 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs shadow-md whitespace-nowrap">
                <span className="font-semibold text-gray-900">{row.detail}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
