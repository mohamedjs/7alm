"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/auth.hooks";
import { useGetOrdersQuery } from "@/features/orders/orders.api";
import { useGetProductsQuery } from "@/features/products/products.api";
import { useGetCategoriesQuery } from "@/features/categories/categories.api";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { DictKey } from "@/features/i18n/dictionary";
import {
  averageOrderValue,
  buildDailyTrend,
  channelBreakdown,
  computeKpis,
  daysBetweenInclusive,
  filterByDateRange,
  filterByPreviousDateRange,
  filterByPreviousRange,
  filterByRange,
  revenueByCategory,
  statusBreakdown,
  topProducts,
  topZones,
  toCsvRows,
  type CsvOrderRow,
} from "@/features/orders/orders.analytics";
import StatTile from "@/components/admin/charts/StatTile";
import OrdersTrendChart from "@/components/admin/charts/OrdersTrendChart";
import HorizontalBarChart from "@/components/admin/charts/HorizontalBarChart";
import DonutChart from "@/components/admin/charts/DonutChart";
import {
  badgeColorFor,
  channelMeta,
  formatCompact,
  formatEgp,
  seriesColors,
} from "@/components/admin/charts/chartTheme";

const RANGE_PRESETS = [
  { days: 7, key: "dashboard.range.7" as const },
  { days: 30, key: "dashboard.range.30" as const },
  { days: 90, key: "dashboard.range.90" as const },
] satisfies { days: number; key: DictKey }[];

const CSV_HEADERS: (keyof CsvOrderRow)[] = [
  "id",
  "date",
  "customer",
  "product",
  "quantity",
  "total",
  "status",
  "channel",
  "zone",
];

function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`h-full rounded-2xl bg-surface p-4 neu-raised transition-all sm:p-6 ${className}`}
    >
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** Compact header pill for a KPI + its delta chip — the "quick glance" row above the bento grid. */
function QuickMetricPill({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: number | null;
}) {
  const showDelta = typeof delta === "number" && Number.isFinite(delta);
  const deltaUp = showDelta && delta! >= 0;

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs neu-raised-sm">
      <span className="text-text-muted">{label}</span>
      <span className="font-semibold text-text-primary tabular-nums">{value}</span>
      {showDelta && (
        <span
          className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium ${
            deltaUp ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          }`}
        >
          {deltaUp ? "▲" : "▼"} {Math.abs(delta! * 100).toFixed(0)}%
        </span>
      )}
    </span>
  );
}

function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return (current - previous) / previous;
}

/**
 * Parse a `<input type="date">` value ("YYYY-MM-DD") as a local-midnight
 * Date, matching the local `startOfDay` semantics used throughout
 * `orders.analytics.ts`. `new Date("YYYY-MM-DD")` parses as UTC midnight,
 * which drifts a day in any non-UTC timezone — avoid it here.
 */
function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function csvEscape(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function buildCsvText(rows: CsvOrderRow[]): string {
  const lines = rows.map((row) =>
    CSV_HEADERS.map((key) => csvEscape(row[key])).join(","),
  );
  return [CSV_HEADERS.join(","), ...lines].join("\n");
}

function downloadCsv(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface CustomRange {
  start: string;
  end: string;
}

export default function AdminOverviewPage() {
  const { token } = useAuth();
  const { t } = useLocale();
  const { data: orders, isLoading } = useGetOrdersQuery("all");
  const { data: products } = useGetProductsQuery();
  const { data: categories } = useGetCategoriesQuery();
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [activeCustomRange, setActiveCustomRange] = useState<CustomRange | null>(null);
  const [customRangeError, setCustomRangeError] = useState<string | null>(null);

  const view = useMemo(() => {
    const list = orders ?? [];
    const productList = products ?? [];
    const categoryList = categories ?? [];

    const rangeStartDate = activeCustomRange ? parseLocalDate(activeCustomRange.start) : null;
    const rangeEndDate = activeCustomRange ? parseLocalDate(activeCustomRange.end) : null;

    const inRange =
      rangeStartDate && rangeEndDate
        ? filterByDateRange(list, rangeStartDate, rangeEndDate)
        : filterByRange(list, rangeDays);
    const previous =
      rangeStartDate && rangeEndDate
        ? filterByPreviousDateRange(list, rangeStartDate, rangeEndDate)
        : filterByPreviousRange(list, rangeDays);

    const trendDays =
      rangeStartDate && rangeEndDate ? daysBetweenInclusive(rangeStartDate, rangeEndDate) : rangeDays;
    const trendNow = rangeEndDate ?? new Date();

    const kpis = computeKpis(inRange);
    const prevKpis = computeKpis(previous);
    const aov = averageOrderValue(inRange);
    const prevAov = averageOrderValue(previous);

    return {
      inRange,
      kpis,
      ordersDelta: percentChange(kpis.total, prevKpis.total),
      revenueDelta: percentChange(kpis.revenue, prevKpis.revenue),
      aov,
      aovDelta: percentChange(aov, prevAov),
      trend: buildDailyTrend(inRange, trendDays, trendNow),
      channels: channelBreakdown(inRange),
      statuses: statusBreakdown(inRange).filter(
        (s) =>
          s.count > 0 ||
          ["pending", "approved", "shipped", "delivered"].includes(s.status),
      ),
      zones: topZones(inRange),
      topProducts: topProducts(inRange, productList),
      categoryRevenue: revenueByCategory(inRange, productList, categoryList),
    };
  }, [orders, products, categories, rangeDays, activeCustomRange]);

  if (!token) return null;

  const isEmpty = !isLoading && view.inRange.length === 0;

  const handleExportCsv = () => {
    const rows = toCsvRows(view.inRange, products ?? []);
    const csvText = buildCsvText(rows);
    downloadCsv(csvText, `orders-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  /*
   * ------------------------------------------------------------------
   * T001 — bento grid plan (005-admin-bento-grid-redesign)
   * ------------------------------------------------------------------
   * Welcome header (greeting + quick-metric pill row, all 5 KPI deltas)
   * sits above the grid, with the range/date/export controls beside it —
   * this is new, additive markup; it doesn't replace any `002` widget.
   *
   * Grid A (always rendered, `lg:grid-cols-6`):
   *   ┌───────────────┬───────────────────────────────┐
   *   │ Revenue        │ Orders per day (wide, 4 cols)  │
   *   │ HERO           ├──────┬─────────┬──────┬───────┤
   *   │ (2 cols ×      │ AOV  │ Pending │ Total│ Social│
   *   │  2 rows)       │      │         │orders│ share │
   *   └───────────────┴──────┴─────────┴──────┴───────┘
   *   Hero = StatTile size="lg", col-span-2 row-span-2, with the
   *   Export CSV / View orders actions inline (plan's "primary/secondary
   *   action buttons inline in the hero card"). Wide = trend chart,
   *   col-span-4. The remaining 4 KPIs are standard 1-col tiles that
   *   auto-flow under the trend chart, filling the same 4-col width.
   *
   * Grid B (`lg:grid-cols-6`, entity badge rotation applied):
   *   Top products (2 cols) | Revenue by category (2 cols) | Orders by
   *   channel (2 cols, segmented-bar variant — plan's "segmented gradient
   *   bar" treatment). Top products / Revenue by category rows get a
   *   small colored badge via `badgeColorFor(id)` — a stable hash into
   *   the 5-color brand/gold/blue/green/pink rotation, so a given
   *   product/category always renders the same color.
   *
   * Grid C (`lg:grid-cols-6`):
   *   Orders by status (3 cols) | Top delivery zones (3 cols)
   *
   * Mobile: every grid collapses to `grid-cols-1`; DOM order already
   * reads hero → trend → KPIs → breakdowns, so no reordering is needed.
   */
  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">{t("dashboard.welcome")}</h2>
          <p className="mt-1 text-sm text-text-muted">
            {t("dashboard.subtitle")}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <QuickMetricPill
              label={t("dashboard.kpi.orders")}
              value={formatCompact(view.kpis.total)}
              delta={view.ordersDelta}
            />
            <QuickMetricPill
              label={t("dashboard.kpi.revenue")}
              value={formatEgp(view.kpis.revenue)}
              delta={view.revenueDelta}
            />
            <QuickMetricPill
              label={t("dashboard.kpi.avgOrder")}
              value={formatEgp(view.aov)}
              delta={view.aovDelta}
            />
            <QuickMetricPill label={t("dashboard.kpi.pending")} value={formatCompact(view.kpis.pending)} />
            <QuickMetricPill
              label={t("dashboard.kpi.social")}
              value={`${Math.round(view.kpis.socialShare * 100)}%`}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-0.5 rounded-xl bg-surface p-0.5 neu-pressed-sm">
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset.days}
                type="button"
                onClick={() => {
                  setActiveCustomRange(null);
                  setCustomRangeError(null);
                  setRangeDays(preset.days);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  !activeCustomRange && rangeDays === preset.days
                    ? "neu-raised-sm bg-brand-500 text-white"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {t(preset.key)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 rounded-xl bg-surface px-2 py-1 neu-raised-sm">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              aria-label={t("dashboard.rangeStartLabel")}
              className="bg-transparent text-xs text-text-primary outline-none rounded-lg px-1 py-0.5"
            />
            <span className="text-xs text-text-muted">{t("dashboard.rangeTo")}</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              aria-label={t("dashboard.rangeEndLabel")}
              className="bg-transparent text-xs text-text-primary outline-none rounded-lg px-1 py-0.5"
            />
            <button
              type="button"
              onClick={() => {
                if (!customStart || !customEnd) {
                  setCustomRangeError(t("dashboard.rangeErrorBoth"));
                  return;
                }
                if (parseLocalDate(customStart) > parseLocalDate(customEnd)) {
                  setCustomRangeError(t("dashboard.rangeErrorOrder"));
                  return;
                }
                setCustomRangeError(null);
                setActiveCustomRange({ start: customStart, end: customEnd });
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                activeCustomRange
                  ? "neu-raised-sm bg-brand-500 text-white"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {t("dashboard.apply")}
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded-xl bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-all neu-btn"
          >
            {t("dashboard.exportCsv")}
          </button>
        </div>
      </div>

      {customRangeError && (
        <p className="mb-4 text-xs text-danger">{customRangeError}</p>
      )}

      <div className={`transition-opacity ${isLoading ? "opacity-50" : "opacity-100"}`}>
        {/* Grid A: hero (Revenue) + wide (trend) + 4 standard KPI tiles */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-6">
          <StatTile
            label={t("dashboard.stat.revenue")}
            value={formatEgp(view.kpis.revenue)}
            accentClassName="text-success"
            delta={view.revenueDelta}
            size="lg"
            className="sm:col-span-2 lg:col-span-2 lg:row-span-2 animate-in delay-75"
            rawValue={view.kpis.revenue}
            valueFormat={formatEgp}
            sparklineData={view.trend.slice(-7).map((pt) => pt.retail + pt.social)}
            sparklineColor={seriesColors.retail}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/orders"
                className="rounded-xl bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition-all neu-btn"
              >
                {t("dashboard.stat.viewOrders")}
              </Link>
              <button
                type="button"
                onClick={handleExportCsv}
                className="rounded-xl bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-all neu-btn"
              >
                {t("dashboard.exportCsv")}
              </button>
            </div>
          </StatTile>

          <ChartCard
            title={t("dashboard.stat.ordersPerDay")}
            subtitle={t("dashboard.stat.ordersPerDaySubtitle")}
            className="sm:col-span-2 lg:col-span-4 animate-in delay-100"
          >
            <OrdersTrendChart data={view.trend} />
          </ChartCard>

          <StatTile
            label={t("dashboard.stat.avgOrderValue")}
            value={formatEgp(view.aov)}
            accentClassName="text-gold-500 dark:text-gold-400"
            delta={view.aovDelta}
            className="animate-in delay-150"
            rawValue={view.aov}
            valueFormat={formatEgp}
          />
          <StatTile
            label={t("dashboard.stat.pendingOrders")}
            value={formatCompact(view.kpis.pending)}
            accentClassName="text-warning"
            className="animate-in delay-150"
            rawValue={view.kpis.pending}
            valueFormat={formatCompact}
          />
          <StatTile
            label={t("dashboard.stat.totalOrders")}
            value={formatCompact(view.kpis.total)}
            delta={view.ordersDelta}
            className="animate-in delay-200"
            rawValue={view.kpis.total}
            valueFormat={formatCompact}
            sparklineData={view.trend.slice(-7).map((pt) => pt.retail + pt.social)}
            sparklineColor={seriesColors.retail}
          />
          <StatTile
            label={t("dashboard.stat.fromSocial")}
            value={`${Math.round(view.kpis.socialShare * 100)}%`}
            accentClassName="text-[#eb6834] dark:text-orange-400"
            className="animate-in delay-200"
          />
        </div>

        {isEmpty ? (
          <div className="mt-6 rounded-2xl bg-surface p-12 text-center text-sm text-text-muted neu-raised">
            {t("dashboard.empty")}
          </div>
        ) : (
          <>
            {/* Grid B: top products / revenue by category / orders by channel */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-6">
              <ChartCard
                title={t("dashboard.topProducts")}
                subtitle={t("dashboard.topProductsSubtitle")}
                className="lg:col-span-2 animate-in delay-225"
              >
                {view.topProducts.length === 0 ? (
                  <p className="text-xs text-text-muted">{t("dashboard.noProductData")}</p>
                ) : (
                  <HorizontalBarChart
                    formatValue={formatEgp}
                    rows={view.topProducts.map((p) => ({
                      key: p.productId,
                      label: p.name,
                      value: p.revenue,
                      color: badgeColorFor(p.productId),
                      detail: `${p.units.toLocaleString("en-US")} ${t("dashboard.unitsSold")}`,
                    }))}
                  />
                )}
              </ChartCard>

              <ChartCard
                title={t("dashboard.revenueByCategory")}
                subtitle={t("dashboard.revenueByCategorySubtitle")}
                className="lg:col-span-2 animate-in delay-225"
              >
                {view.categoryRevenue.length === 0 ? (
                  <p className="text-xs text-text-muted">{t("dashboard.noCategoryData")}</p>
                ) : (
                  <HorizontalBarChart
                    formatValue={formatEgp}
                    rows={view.categoryRevenue.map((c) => ({
                      key: c.categoryId,
                      label: c.name,
                      value: c.revenue,
                      color: badgeColorFor(c.categoryId),
                    }))}
                  />
                )}
              </ChartCard>

              <ChartCard
                title={t("dashboard.ordersByChannel")}
                subtitle={t("dashboard.ordersByChannelSubtitle")}
                className="lg:col-span-2 animate-in delay-225"
              >
                <HorizontalBarChart
                  variant="segmented"
                  rows={view.channels.map((c) => ({
                    key: c.channel,
                    label: t(channelMeta[c.channel].labelKey),
                    value: c.orders,
                    color: channelMeta[c.channel].color,
                    detail: formatEgp(c.revenue),
                  }))}
                />
              </ChartCard>
            </div>

            {/* Grid C: orders by status / top delivery zones */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-6">
              <ChartCard title={t("dashboard.ordersByStatus")} className="lg:col-span-3 animate-in delay-300">
                <DonutChart
                  segments={view.statuses.map((s) => ({
                    key: s.status,
                    label: t(`orders.status.${s.status}` as DictKey),
                    value: s.count,
                    color: badgeColorFor(s.status),
                  }))}
                  centerValue={formatCompact(view.kpis.total)}
                  centerLabel={t("dashboard.donutCenterLabel")}
                />
              </ChartCard>

              <ChartCard title={t("dashboard.topZones")} className="lg:col-span-3 animate-in delay-300">
                {view.zones.length === 0 ? (
                  <p className="text-xs text-text-muted">{t("dashboard.noZoneData")}</p>
                ) : (
                  <HorizontalBarChart
                    color={seriesColors.retail}
                    rows={view.zones.map((z) => ({
                      key: z.zone,
                      label: z.zone,
                      value: z.count,
                    }))}
                  />
                )}
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
