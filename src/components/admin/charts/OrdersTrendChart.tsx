"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { TrendPoint } from "@/features/orders/orders.analytics";
import { chartInk, niceCeil, seriesColors } from "./chartTheme";
import { useLocale } from "@/features/i18n/i18n.hooks";

const HEIGHT = 260;
const PAD = { top: 16, right: 64, bottom: 28, left: 36 };
const TOOLTIP_WIDTH = 150;

interface OrdersTrendChartProps {
  data: TrendPoint[];
}

export default function OrdersTrendChart({ data }: OrdersTrendChartProps) {
  const { t, dir } = useLocale();
  const isRtl = dir === "rtl";
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const SERIES = useMemo(
    () => [
      { key: "retail" as const, label: t("dashboard.chart.retail"), color: seriesColors.retail },
      { key: "social" as const, label: t("dashboard.chart.social"), color: seriesColors.social },
    ],
    [t],
  );

  const measureRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const plot = useMemo(() => {
    const innerW = Math.max(width - PAD.left - PAD.right, 0);
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const maxValue = niceCeil(
      Math.max(1, ...data.map((p) => Math.max(p.retail, p.social))),
    );
    const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
    // Time flows start → end (right → left in RTL, left → right in LTR) so
    // the chart reads in the same direction as the surrounding UI. This is
    // the only piece that needs to actively mirror — value formatting
    // (below) stays un-mirrored per FR-006.
    const x = (i: number) =>
      isRtl ? width - PAD.right - i * stepX : PAD.left + i * stepX;
    const y = (v: number) => PAD.top + innerH - (v / maxValue) * innerH;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => maxValue * t);
    return { innerW, innerH, maxValue, x, y, ticks };
  }, [width, data, isRtl]);

  const linePath = (key: "retail" | "social") =>
    data
      .map((p, i) => `${i === 0 ? "M" : "L"}${plot.x(i)},${plot.y(p[key])}`)
      .join("");

  const areaPath = (key: "retail" | "social") =>
    data.length > 1
      ? `${linePath(key)}L${plot.x(data.length - 1)},${plot.y(0)}L${plot.x(0)},${plot.y(0)}Z`
      : "";

  const indexFromClientX = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || data.length === 0) return null;
    const stepX = data.length > 1 ? plot.innerW / (data.length - 1) : 1;
    if (isRtl) {
      const px = rect.right - clientX - PAD.right;
      return Math.min(data.length - 1, Math.max(0, Math.round(px / stepX)));
    }
    const px = clientX - rect.left - PAD.left;
    return Math.min(data.length - 1, Math.max(0, Math.round(px / stepX)));
  };

  const active = activeIndex !== null ? data[activeIndex] : null;

  // Direct end labels (attached to the last / "end of series" point): nudge
  // apart when the two lines converge at the edge.
  const endLabels = useMemo(() => {
    if (data.length === 0) return [];
    const last = data[data.length - 1];
    let retailY = plot.y(last.retail);
    let socialY = plot.y(last.social);
    if (Math.abs(retailY - socialY) < 14) {
      if (retailY <= socialY) {
        retailY -= (14 - Math.abs(retailY - socialY)) / 2;
        socialY += (14 - Math.abs(retailY - socialY)) / 2;
      } else {
        socialY -= (14 - Math.abs(retailY - socialY)) / 2;
        retailY += (14 - Math.abs(retailY - socialY)) / 2;
      }
    }
    return [
      { text: t("dashboard.chart.retail"), y: retailY, color: seriesColors.retail },
      { text: t("dashboard.chart.social"), y: socialY, color: seriesColors.social },
    ];
  }, [data, plot, t]);

  const xLabelEvery = Math.max(1, Math.ceil(data.length / 6));

  // Value-axis (gridline number) labels sit just outside the "start" edge
  // of the plot — left in LTR, right in RTL — and the end-of-line series
  // labels sit just outside the "end" edge (mirrored the other way).
  const valueAxisX = isRtl ? width - PAD.right + 8 : PAD.left - 8;
  const valueAxisAnchor = isRtl ? "start" : "end";
  const endLabelX = isRtl ? PAD.left - 10 : width - PAD.right + 10;
  const endLabelAnchor = isRtl ? "end" : "start";

  return (
    <div>
      <div className="flex items-center gap-4 mb-2" aria-hidden="true">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-text-muted">
            <span
              className="inline-block w-4 rounded-full"
              style={{ height: 2, backgroundColor: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>

      <div
        ref={measureRef}
        className="relative outline-none"
        tabIndex={0}
        role="img"
        aria-label={t("dashboard.chart.ariaLabel")}
        onPointerMove={(e) => setActiveIndex(indexFromClientX(e.clientX))}
        onPointerLeave={() => setActiveIndex(null)}
        onKeyDown={(e) => {
          // Arrow keys move by "next/previous data point" in reading order,
          // which is what ArrowRight/ArrowLeft already do for retail data —
          // in RTL that's swapped, since the series now runs right → left.
          const forwardKey = isRtl ? "ArrowLeft" : "ArrowRight";
          const backwardKey = isRtl ? "ArrowRight" : "ArrowLeft";
          if (e.key === forwardKey)
            setActiveIndex((i) => Math.min(data.length - 1, (i ?? -1) + 1));
          if (e.key === backwardKey)
            setActiveIndex((i) => Math.max(0, (i ?? data.length) - 1));
          if (e.key === "Escape") setActiveIndex(null);
        }}
      >
        {width > 0 && (
          <svg width={width} height={HEIGHT} className="block">
            {plot.ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={plot.y(tick)}
                  y2={plot.y(tick)}
                  stroke={tick === 0 ? chartInk.axis : chartInk.grid}
                  strokeWidth={1}
                />
                <text
                  x={valueAxisX}
                  y={plot.y(tick) + 4}
                  textAnchor={valueAxisAnchor}
                  fontSize={11}
                  fill={chartInk.muted}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {Math.round(tick).toLocaleString("en-US")}
                </text>
              </g>
            ))}

            {data.map((p, i) =>
              i % xLabelEvery === 0 ? (
                <text
                  key={p.key}
                  x={plot.x(i)}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fill={chartInk.muted}
                >
                  {p.label}
                </text>
              ) : null,
            )}

            {SERIES.map((s) => (
              <g key={s.key}>
                <path d={areaPath(s.key)} fill={s.color} fillOpacity={0.1} />
                <path
                  d={linePath(s.key)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            ))}

            {endLabels.map((l) => (
              <text
                key={l.text}
                x={endLabelX}
                y={l.y + 4}
                textAnchor={endLabelAnchor}
                fontSize={11}
                fontWeight={600}
                fill={chartInk.secondary}
              >
                <tspan fill={l.color}>●</tspan> {l.text}
              </text>
            ))}

            {active && activeIndex !== null && (
              <g>
                <line
                  x1={plot.x(activeIndex)}
                  x2={plot.x(activeIndex)}
                  y1={PAD.top}
                  y2={plot.y(0)}
                  stroke={chartInk.axis}
                  strokeWidth={1}
                />
                {SERIES.map((s) => (
                  <circle
                    key={s.key}
                    cx={plot.x(activeIndex)}
                    cy={plot.y(active[s.key])}
                    r={4}
                    fill={s.color}
                    stroke={chartInk.surface}
                    strokeWidth={2}
                  />
                ))}
              </g>
            )}
          </svg>
        )}

        {active && activeIndex !== null && width > 0 && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-border bg-surface-raised px-3 py-2 shadow-md"
            style={{
              top: PAD.top,
              // Plain physical `left`, not `insetInlineStart`: plot.x()
              // already returns a mirrored-for-RTL pixel offset from the
              // container's physical left edge (see `plot.x` above), so a
              // logical-property offset here would double-mirror it. In
              // RTL the tooltip anchors to the left of the point instead
              // of the right (time flows right → left, so "further along"
              // is to the point's left).
              left: isRtl
                ? Math.max(plot.x(activeIndex) - 12 - TOOLTIP_WIDTH, 0)
                : Math.min(plot.x(activeIndex) + 12, width - TOOLTIP_WIDTH),
            }}
          >
            <p className="text-[11px] font-medium text-text-muted mb-1">
              {active.label}
            </p>
            {SERIES.map((s) => (
              <p key={s.key} className="flex items-center gap-2 text-xs">
                <span
                  className="inline-block w-3 rounded-full"
                  style={{ height: 2, backgroundColor: s.color }}
                />
                <span className="font-semibold text-text-primary tabular-nums">
                  {active[s.key]}
                </span>
                <span className="text-text-muted">{s.label}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
