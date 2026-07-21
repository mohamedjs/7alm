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
  /**
   * "list" (default): one horizontal bar per row, stacked vertically.
   * "segmented": a single rounded stacked bar split proportionally by
   * value, each segment colored by row.color — a compact ranked-share
   * treatment, used for "Orders by channel" per the bento redesign's
   * Visual Design Direction ("segmented gradient bar").
   */
  variant?: "list" | "segmented";
}

export default function HorizontalBarChart({
  rows,
  color = "#2a78d6",
  formatValue = (v) => v.toLocaleString("en-US"),
  variant = "list",
}: HorizontalBarChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = niceCeil(Math.max(1, ...rows.map((r) => r.value)));
  const total = rows.reduce((sum, r) => sum + r.value, 0);

  if (variant === "segmented") {
    return (
      <div className="space-y-3">
        <div className="flex h-3 w-full overflow-hidden rounded-full neu-pressed-sm bg-surface">
          {rows.map((row) => {
            const pct = total > 0 ? (row.value / total) * 100 : 0;
            const isHovered = hovered === row.key;
            return (
              <div
                key={row.key}
                role="img"
                aria-label={`${row.label}: ${formatValue(row.value)}`}
                className="h-full first:rounded-s-full last:rounded-e-full transition-opacity"
                style={{
                  width: `${pct}%`,
                  minWidth: row.value > 0 ? 2 : 0,
                  backgroundColor: row.color ?? color,
                  opacity: hovered === null || isHovered ? 1 : 0.45,
                }}
                onPointerEnter={() => setHovered(row.key)}
                onPointerLeave={() => setHovered(null)}
              />
            );
          })}
        </div>
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex items-center justify-between gap-3 text-xs"
              onPointerEnter={() => setHovered(row.key)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(row.key)}
              onBlur={() => setHovered(null)}
              tabIndex={0}
            >
              <span className="flex min-w-0 items-center gap-1.5 text-text-muted">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: row.color ?? color }}
                />
                <span className="truncate">{row.label}</span>
              </span>
              <span className="shrink-0 font-semibold text-text-primary tabular-nums">
                {formatValue(row.value)}
                {row.detail ? (
                  <span className="ms-1.5 font-normal text-text-muted">· {row.detail}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

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
            <span className="flex items-center gap-1.5 text-xs text-text-muted truncate">
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
                className="h-4 rounded-e-[4px] transition-opacity"
                style={{
                  width: `${(row.value / max) * 100}%`,
                  minWidth: row.value > 0 ? 3 : 0,
                  backgroundColor: barColor,
                  opacity: hovered === null || isHovered ? 1 : 0.45,
                }}
              />
              <span
                className="text-xs font-semibold text-text-primary tabular-nums shrink-0"
                style={{ color: chartInk.primary }}
              >
                {formatValue(row.value)}
              </span>
            </div>

            {isHovered && row.detail && (
              <div className="pointer-events-none absolute start-[92px] -top-7 z-10 rounded-xl bg-surface px-2.5 py-1 text-xs neu-raised-sm whitespace-nowrap">
                <span className="font-semibold text-text-primary">{row.detail}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
