"use client";

import { useReducedMotion } from "motion/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/features/orders/orders.analytics";
import { useLocale } from "@/features/i18n/i18n.hooks";
import { chartInk, formatCompact, seriesColors } from "./chartTheme";
import { useChartLocale } from "./useChartLocale";
import { RtlTooltip } from "./RtlTooltip";

interface OrdersTrendChartProps {
  data: TrendPoint[];
}

export default function OrdersTrendChart({ data }: OrdersTrendChartProps) {
  const { t } = useLocale();
  const { xAxisProps, yAxisProps } = useChartLocale();
  const prefersReducedMotion = useReducedMotion();

  const retailLabel = t("dashboard.chart.retail");
  const socialLabel = t("dashboard.chart.social");

  return (
    <div>
      <div className="mb-2 flex items-center gap-4" aria-hidden="true">
        <span className="flex items-center gap-1.5 text-xs text-text-muted">
          <span
            className="inline-block w-4 rounded-full"
            style={{ height: 2, backgroundColor: seriesColors.retail }}
          />
          {retailLabel}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-text-muted">
          <span
            className="inline-block w-4 rounded-full"
            style={{ height: 2, backgroundColor: seriesColors.social }}
          />
          {socialLabel}
        </span>
      </div>

      <div role="img" aria-label={t("dashboard.chart.ariaLabel")}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradRetail" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={seriesColors.retail} stopOpacity={0.3} />
                <stop offset="100%" stopColor={seriesColors.retail} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradSocial" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={seriesColors.social} stopOpacity={0.3} />
                <stop offset="100%" stopColor={seriesColors.social} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartInk.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              {...xAxisProps}
              tick={{ fill: chartInk.muted, fontSize: 11 }}
              axisLine={{ stroke: chartInk.axis }}
              tickLine={false}
            />
            <YAxis
              {...yAxisProps}
              tick={{ fill: chartInk.muted, fontSize: 11 }}
              tickFormatter={(v: number) => formatCompact(v)}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<RtlTooltip />} />
            <Area
              dataKey="retail"
              name={retailLabel}
              type="monotone"
              stroke={seriesColors.retail}
              fill="url(#gradRetail)"
              strokeWidth={2}
              animationDuration={800}
              isAnimationActive={!prefersReducedMotion}
            />
            <Area
              dataKey="social"
              name={socialLabel}
              type="monotone"
              stroke={seriesColors.social}
              fill="url(#gradSocial)"
              strokeWidth={2}
              animationDuration={800}
              isAnimationActive={!prefersReducedMotion}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
