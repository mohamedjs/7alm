import type { OrderWithDetails } from "@/features/shared/types";

/**
 * Pure client-side analytics over the orders list returned by
 * `useGetOrdersQuery("all")`. The n8n social agents stamp
 * `platform_source` with the chat channel; website checkout stores a
 * utm_source (or nothing), so anything outside the known chat channels
 * counts as retail.
 */

export const SOCIAL_CHANNELS = ["whatsapp", "facebook", "instagram"] as const;
export type SocialChannel = (typeof SOCIAL_CHANNELS)[number];
export type OrderChannel = SocialChannel | "website";

export function channelOf(order: OrderWithDetails): OrderChannel {
  const source = (order.platform_source || "").trim().toLowerCase();
  return (SOCIAL_CHANNELS as readonly string[]).includes(source)
    ? (source as SocialChannel)
    : "website";
}

export const isSocialOrder = (order: OrderWithDetails): boolean =>
  channelOf(order) !== "website";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Orders created within the last `days` days (inclusive of today). */
export function filterByRange(
  orders: OrderWithDetails[],
  days: number,
  now: Date = new Date(),
): OrderWithDetails[] {
  const start = startOfDay(new Date(now.getTime() - (days - 1) * DAY_MS));
  return orders.filter((o) => new Date(o.created_at) >= start);
}

/** Orders in the window of the same length immediately before the range. */
export function filterByPreviousRange(
  orders: OrderWithDetails[],
  days: number,
  now: Date = new Date(),
): OrderWithDetails[] {
  const rangeStart = startOfDay(new Date(now.getTime() - (days - 1) * DAY_MS));
  const prevStart = new Date(rangeStart.getTime() - days * DAY_MS);
  return orders.filter((o) => {
    const created = new Date(o.created_at);
    return created >= prevStart && created < rangeStart;
  });
}

export interface TrendPoint {
  key: string;
  label: string;
  retail: number;
  social: number;
}

/** One point per calendar day for the last `days` days, retail vs social. */
export function buildDailyTrend(
  orders: OrderWithDetails[],
  days: number,
  now: Date = new Date(),
): TrendPoint[] {
  const counts = new Map<string, { retail: number; social: number }>();
  for (const order of orders) {
    const key = dayKey(new Date(order.created_at));
    const entry = counts.get(key) ?? { retail: 0, social: 0 };
    if (isSocialOrder(order)) entry.social += 1;
    else entry.retail += 1;
    counts.set(key, entry);
  }

  const points: TrendPoint[] = [];
  const today = startOfDay(now);
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today.getTime() - i * DAY_MS);
    const key = dayKey(date);
    const entry = counts.get(key) ?? { retail: 0, social: 0 };
    points.push({
      key,
      label: date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      retail: entry.retail,
      social: entry.social,
    });
  }
  return points;
}

export interface ChannelStat {
  channel: OrderChannel;
  orders: number;
  revenue: number;
}

const CHANNEL_ORDER: OrderChannel[] = [
  "website",
  "whatsapp",
  "facebook",
  "instagram",
];

/** Orders and revenue per channel, in a fixed display order. */
export function channelBreakdown(orders: OrderWithDetails[]): ChannelStat[] {
  const stats = new Map<OrderChannel, ChannelStat>(
    CHANNEL_ORDER.map((channel) => [channel, { channel, orders: 0, revenue: 0 }]),
  );
  for (const order of orders) {
    const stat = stats.get(channelOf(order))!;
    stat.orders += 1;
    stat.revenue += Number(order.total_price) || 0;
  }
  return CHANNEL_ORDER.map((channel) => stats.get(channel)!);
}

export interface StatusStat {
  status: string;
  count: number;
}

const STATUS_ORDER = [
  "pending",
  "approved",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

/** Order counts per status in lifecycle order (extra statuses appended). */
export function statusBreakdown(orders: OrderWithDetails[]): StatusStat[] {
  const counts = new Map<string, number>();
  for (const order of orders) {
    counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
  }
  const known = STATUS_ORDER.map((status) => ({
    status,
    count: counts.get(status) ?? 0,
  }));
  const extras = [...counts.keys()]
    .filter((status) => !STATUS_ORDER.includes(status))
    .map((status) => ({ status, count: counts.get(status)! }));
  return [...known, ...extras];
}

export interface ZoneStat {
  zone: string;
  count: number;
}

/** Most frequent delivery zones, largest first. */
export function topZones(
  orders: OrderWithDetails[],
  limit = 6,
): ZoneStat[] {
  const counts = new Map<string, number>();
  for (const order of orders) {
    const zone =
      order.address?.zone?.english_name ||
      order.address?.zone?.arabic_name ||
      "Unknown";
    counts.set(zone, (counts.get(zone) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([zone, count]) => ({ zone, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export interface DashboardKpis {
  total: number;
  revenue: number;
  pending: number;
  socialCount: number;
  socialShare: number;
}

export function computeKpis(orders: OrderWithDetails[]): DashboardKpis {
  const total = orders.length;
  const socialCount = orders.filter(isSocialOrder).length;
  return {
    total,
    revenue: orders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0),
    pending: orders.filter((o) => o.status === "pending").length,
    socialCount,
    socialShare: total > 0 ? socialCount / total : 0,
  };
}
