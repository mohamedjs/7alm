"use client";

import { useReducedMotion } from "motion/react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useLocale } from "@/features/i18n/i18n.hooks";
import { AnimatedValue } from "./AnimatedValue";

interface StatTileProps {
  label: string;
  value: string;
  accentClassName?: string;
  /** Signed percentage change vs the previous period, e.g. 0.12 for +12%. */
  delta?: number | null;
  /** Overrides the default "vs previous period" caption (already localized). */
  deltaLabel?: string;
  /** "lg" renders the bento hero tile treatment (bigger type/padding). Default "sm". */
  size?: "sm" | "lg";
  /** Extra classes on the outer card, e.g. bento grid col/row-span utilities. */
  className?: string;
  /** Optional inline content below the value (e.g. hero-card action buttons). */
  children?: React.ReactNode;
  /**
   * Raw numeric value to spring-animate (counts up/down on change). Requires
   * `valueFormat`; when either is omitted, the static `value` string renders
   * exactly as before.
   */
  rawValue?: number;
  /** Formats `rawValue` at each animation frame (and for the initial render). */
  valueFormat?: (n: number) => string;
  /** Recent values rendered as a tiny trend sparkline below the headline value. */
  sparklineData?: number[];
  /** Sparkline stroke/fill color; defaults to the current text color. */
  sparklineColor?: string;
}

export default function StatTile({
  label,
  value,
  accentClassName = "text-text-primary",
  delta,
  deltaLabel,
  size = "sm",
  className = "",
  children,
  rawValue,
  valueFormat,
  sparklineData,
  sparklineColor,
}: StatTileProps) {
  const { t } = useLocale();
  const prefersReducedMotion = useReducedMotion();
  const showDelta = typeof delta === "number" && Number.isFinite(delta);
  const deltaUp = showDelta && delta! >= 0;
  const isLg = size === "lg";
  const resolvedDeltaLabel = deltaLabel ?? t("dashboard.deltaVsPrevious");

  return (
    <div
      className={`h-full flex flex-col justify-between rounded-2xl bg-surface neu-raised transition-all ${
        isLg ? "p-5 sm:p-7" : "p-4 sm:p-6"
      } ${className}`}
    >
      <div>
        <p className={`text-text-muted font-medium mb-1 ${isLg ? "text-sm" : "text-xs sm:text-sm"}`}>
          {label}
        </p>
        <p
          className={`font-semibold tabular-nums ${isLg ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl"} ${accentClassName}`}
        >
          {typeof rawValue === "number" && valueFormat ? (
            <AnimatedValue value={rawValue} format={valueFormat} />
          ) : (
            value
          )}
        </p>
        {showDelta && (
          <p className="mt-2 text-xs text-text-muted">
            <span
              className={`inline-flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 font-medium neu-pressed-sm ${
                deltaUp ? "text-success" : "text-danger"
              }`}
            >
              {deltaUp ? "▲" : "▼"} {Math.abs(delta! * 100).toFixed(0)}%
            </span>{" "}
            {resolvedDeltaLabel}
          </p>
        )}
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-2">
            <ResponsiveContainer width="100%" height={40}>
              <AreaChart
                data={sparklineData.map((v, i) => ({ v, i }))}
                margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
              >
                <Area
                  dataKey="v"
                  type="monotone"
                  stroke={sparklineColor ?? "currentColor"}
                  strokeWidth={1.5}
                  fill={sparklineColor ?? "currentColor"}
                  fillOpacity={0.15}
                  animationDuration={600}
                  isAnimationActive={!prefersReducedMotion}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
