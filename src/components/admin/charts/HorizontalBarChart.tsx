"use client";

import { useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartInk } from "./chartTheme";
import { useChartLocale } from "./useChartLocale";
import { RtlTooltip } from "./RtlTooltip";

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
  const { isRtl, yAxisProps } = useChartLocale();
  const prefersReducedMotion = useReducedMotion();

  if (variant === "segmented") {
    const total = rows.reduce((sum, r) => sum + r.value, 0);
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
    <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 44)}>
      <BarChart
        layout="vertical"
        data={rows}
        margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
        barCategoryGap={12}
      >
        <YAxis
          dataKey="label"
          type="category"
          width={90}
          tick={{ fill: chartInk.muted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          {...yAxisProps}
        />
        <XAxis
          type="number"
          tick={{ fill: chartInk.muted, fontSize: 11 }}
          tickFormatter={formatValue}
          hide
        />
        <Tooltip
          content={<RtlTooltip formatValue={formatValue} />}
          cursor={{ fill: chartInk.grid, opacity: 0.35 }}
        />
        <Bar
          dataKey="value"
          radius={isRtl ? [4, 0, 0, 4] : [0, 4, 4, 0]}
          animationDuration={600}
          isAnimationActive={!prefersReducedMotion}
        >
          {rows.map((row) => (
            <Cell
              key={row.key}
              fill={row.color ?? color}
              fillOpacity={hovered === null || hovered === row.key ? 1 : 0.45}
              onMouseEnter={() => setHovered(row.key)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          <LabelList
            dataKey="value"
            position={isRtl ? "left" : "right"}
            formatter={(v: unknown) => formatValue(Number(v))}
            fill={chartInk.primary}
            fontSize={12}
            fontWeight={600}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
