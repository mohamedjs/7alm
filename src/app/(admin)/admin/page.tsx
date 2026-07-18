"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/features/auth/auth.hooks";
import { useGetOrdersQuery } from "@/features/orders/orders.api";
import {
  buildDailyTrend,
  channelBreakdown,
  computeKpis,
  filterByPreviousRange,
  filterByRange,
  statusBreakdown,
  topZones,
} from "@/features/orders/orders.analytics";
import StatTile from "@/components/admin/charts/StatTile";
import OrdersTrendChart from "@/components/admin/charts/OrdersTrendChart";
import HorizontalBarChart from "@/components/admin/charts/HorizontalBarChart";
import {
  channelMeta,
  formatCompact,
  formatEgp,
  seriesColors,
} from "@/components/admin/charts/chartTheme";

const RANGE_PRESETS = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
] as const;

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
      className={`bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm ${className}`}
    >
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return (current - previous) / previous;
}

export default function AdminOverviewPage() {
  const { token } = useAuth();
  const { data: orders, isLoading } = useGetOrdersQuery("all");
  const [rangeDays, setRangeDays] = useState<number>(30);

  const view = useMemo(() => {
    const list = orders ?? [];
    const inRange = filterByRange(list, rangeDays);
    const previous = filterByPreviousRange(list, rangeDays);
    const kpis = computeKpis(inRange);
    const prevKpis = computeKpis(previous);
    return {
      inRange,
      kpis,
      ordersDelta: percentChange(kpis.total, prevKpis.total),
      revenueDelta: percentChange(kpis.revenue, prevKpis.revenue),
      trend: buildDailyTrend(inRange, rangeDays),
      channels: channelBreakdown(inRange),
      statuses: statusBreakdown(inRange).filter(
        (s) =>
          s.count > 0 ||
          ["pending", "approved", "shipped", "delivered"].includes(s.status),
      ),
      zones: topZones(inRange),
    };
  }, [orders, rangeDays]);

  if (!token) return null;

  const isEmpty = !isLoading && view.inRange.length === 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
        <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
          {RANGE_PRESETS.map((preset) => (
            <button
              key={preset.days}
              type="button"
              onClick={() => setRangeDays(preset.days)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                rangeDays === preset.days
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`transition-opacity ${isLoading ? "opacity-50" : "opacity-100"}`}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <StatTile
            label="Total orders"
            value={formatCompact(view.kpis.total)}
            delta={view.ordersDelta}
          />
          <StatTile
            label="Revenue"
            value={formatEgp(view.kpis.revenue)}
            accentClassName="text-green-700"
            delta={view.revenueDelta}
          />
          <StatTile
            label="Pending orders"
            value={formatCompact(view.kpis.pending)}
            accentClassName="text-amber-500"
          />
          <StatTile
            label="From social media"
            value={`${Math.round(view.kpis.socialShare * 100)}%`}
            accentClassName="text-[#eb6834]"
          />
        </div>

        {isEmpty ? (
          <div className="mt-6 bg-white border border-gray-200 rounded-xl p-12 text-center text-sm text-gray-500 shadow-sm">
            No orders in this period yet.
          </div>
        ) : (
          <>
            <div className="mt-6">
              <ChartCard
                title="Orders per day"
                subtitle="Retail (website checkout) vs orders taken by the social-media assistant"
              >
                <OrdersTrendChart data={view.trend} />
              </ChartCard>
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <ChartCard
                title="Orders by channel"
                subtitle="Hover a bar for revenue"
              >
                <HorizontalBarChart
                  rows={view.channels.map((c) => ({
                    key: c.channel,
                    label: channelMeta[c.channel].label,
                    value: c.orders,
                    color: channelMeta[c.channel].color,
                    detail: `${c.orders.toLocaleString("en-US")} orders · ${formatEgp(c.revenue)}`,
                  }))}
                />
              </ChartCard>

              <ChartCard title="Orders by status">
                <HorizontalBarChart
                  color={seriesColors.retail}
                  rows={view.statuses.map((s) => ({
                    key: s.status,
                    label: s.status.charAt(0).toUpperCase() + s.status.slice(1),
                    value: s.count,
                  }))}
                />
              </ChartCard>

              <ChartCard title="Top delivery zones">
                {view.zones.length === 0 ? (
                  <p className="text-xs text-gray-500">No zone data yet.</p>
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
