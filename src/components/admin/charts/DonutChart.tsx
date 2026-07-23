"use client";

import { useState } from "react";
import { useReducedMotion } from "motion/react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useLocale } from "@/features/i18n/i18n.hooks";
import { RtlTooltip } from "./RtlTooltip";

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  /** Small muted caption under the center value, e.g. "Total". */
  centerLabel?: string;
  /** Large bold figure at the donut's center, e.g. a formatted total. */
  centerValue?: string;
}

const BASE_OUTER_RADIUS = 85;
const ACTIVE_OUTER_RADIUS = 90;

/** Donut chart with a center KPI overlay and a below-chart legend (dots + label + count). */
export function DonutChart({ segments, centerLabel, centerValue }: DonutChartProps) {
  const { dir } = useLocale();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  return (
    <div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={segments}
              dataKey="value"
              nameKey="label"
              innerRadius={55}
              outerRadius={(segment: DonutSegment) =>
                activeKey === segment.key ? ACTIVE_OUTER_RADIUS : BASE_OUTER_RADIUS
              }
              paddingAngle={2}
              stroke="none"
              animationDuration={1000}
              isAnimationActive={!prefersReducedMotion}
              onMouseEnter={(data) =>
                setActiveKey((data.payload as DonutSegment | undefined)?.key ?? null)
              }
              onMouseLeave={() => setActiveKey(null)}
            >
              {segments.map((segment) => (
                <Cell key={segment.key} fill={segment.color} />
              ))}
            </Pie>
            <Tooltip content={<RtlTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {(centerValue || centerLabel) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && (
              <span className="text-2xl font-bold tabular-nums text-text-primary">
                {centerValue}
              </span>
            )}
            {centerLabel && <span className="text-xs text-text-muted">{centerLabel}</span>}
          </div>
        )}
      </div>

      <div dir={dir} className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {segments.map((segment) => (
          <span key={segment.key} className="flex items-center gap-1.5 text-xs text-text-muted">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span>{segment.label}</span>
            <span className="font-semibold tabular-nums text-text-primary">
              {segment.value.toLocaleString("en-US")}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default DonutChart;
