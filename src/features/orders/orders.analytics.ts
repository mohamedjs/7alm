import type { Category, OrderWithDetails, Product } from "@/features/shared/types";

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

/** Orders created within an explicit [start, end] date range (inclusive of both days). */
export function filterByDateRange(
  orders: OrderWithDetails[],
  start: Date,
  end: Date,
): OrderWithDetails[] {
  const rangeStart = startOfDay(start);
  const rangeEnd = new Date(startOfDay(end).getTime() + DAY_MS);
  return orders.filter((o) => {
    const created = new Date(o.created_at);
    return created >= rangeStart && created < rangeEnd;
  });
}

/** Orders in the window of the same length immediately before an explicit [start, end] range. */
export function filterByPreviousDateRange(
  orders: OrderWithDetails[],
  start: Date,
  end: Date,
): OrderWithDetails[] {
  const rangeStart = startOfDay(start);
  const rangeEnd = new Date(startOfDay(end).getTime() + DAY_MS);
  const lengthMs = rangeEnd.getTime() - rangeStart.getTime();
  const prevStart = new Date(rangeStart.getTime() - lengthMs);
  return orders.filter((o) => {
    const created = new Date(o.created_at);
    return created >= prevStart && created < rangeStart;
  });
}

/** Number of calendar days spanned by [start, end], inclusive of both endpoints (minimum 1). */
export function daysBetweenInclusive(start: Date, end: Date): number {
  const s = startOfDay(start).getTime();
  const e = startOfDay(end).getTime();
  return Math.max(1, Math.round((e - s) / DAY_MS) + 1);
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

// --- Shared lookup helpers (join orders -> products -> categories client-side) ---

/** Map of product id -> Product, for O(1) lookups when joining orders to products. */
export function buildProductMap(products: Product[]): Map<string, Product> {
  return new Map(products.map((p) => [p.id, p]));
}

/** Map of category id -> Category, for O(1) lookups when resolving a product's category. */
export function buildCategoryMap(categories: Category[]): Map<string, Category> {
  return new Map(categories.map((c) => [c.id, c]));
}

const UNKNOWN_PRODUCT_KEY = "unknown";
const UNKNOWN_PRODUCT_LABEL = "Unknown product";
const UNCATEGORIZED_KEY = "uncategorized";
const UNCATEGORIZED_LABEL = "Uncategorized";

export interface ProductStat {
  productId: string;
  name: string;
  revenue: number;
  units: number;
}

/**
 * Top products by revenue for the given orders, with units sold.
 * Orders whose product can't be resolved in `products` (deleted/unknown)
 * are grouped under a single "Unknown product" bucket rather than dropped.
 */
export function topProducts(
  orders: OrderWithDetails[],
  products: Product[],
  limit = 5,
): ProductStat[] {
  const productMap = buildProductMap(products);
  const stats = new Map<string, ProductStat>();
  for (const order of orders) {
    const product = order.product_id ? productMap.get(order.product_id) : undefined;
    const key = product ? product.id : UNKNOWN_PRODUCT_KEY;
    const name = product ? product.name : UNKNOWN_PRODUCT_LABEL;
    const entry = stats.get(key) ?? { productId: key, name, revenue: 0, units: 0 };
    entry.revenue += Number(order.total_price) || 0;
    entry.units += Number(order.quantity) || 0;
    stats.set(key, entry);
  }
  return [...stats.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

/** Walk a product's category up to its top-level (root) ancestor. Guards against cycles. */
function topLevelCategory(
  categoryId: string | null | undefined,
  categoryMap: Map<string, Category>,
): Category | null {
  if (!categoryId) return null;
  let current = categoryMap.get(categoryId);
  if (!current) return null;
  const seen = new Set<string>([current.id]);
  while (current.parent_id && categoryMap.has(current.parent_id) && !seen.has(current.parent_id)) {
    current = categoryMap.get(current.parent_id)!;
    seen.add(current.id);
  }
  return current;
}

export interface CategoryRevenueStat {
  categoryId: string;
  name: string;
  revenue: number;
}

/**
 * Revenue grouped by top-level category for the given orders. Products with
 * no category (or an unresolvable one) are bucketed under "Uncategorized",
 * as are orders whose product can't be resolved at all.
 */
export function revenueByCategory(
  orders: OrderWithDetails[],
  products: Product[],
  categories: Category[],
): CategoryRevenueStat[] {
  const productMap = buildProductMap(products);
  const categoryMap = buildCategoryMap(categories);
  const stats = new Map<string, CategoryRevenueStat>();
  for (const order of orders) {
    const product = order.product_id ? productMap.get(order.product_id) : undefined;
    const top = product ? topLevelCategory(product.category_id, categoryMap) : null;
    const key = top ? top.id : UNCATEGORIZED_KEY;
    const name = top ? top.name_en || top.name_ar : UNCATEGORIZED_LABEL;
    const entry = stats.get(key) ?? { categoryId: key, name, revenue: 0 };
    entry.revenue += Number(order.total_price) || 0;
    stats.set(key, entry);
  }
  return [...stats.values()].sort((a, b) => b.revenue - a.revenue);
}

/** Revenue per order for the given orders (0 when there are none). */
export function averageOrderValue(orders: OrderWithDetails[]): number {
  if (orders.length === 0) return 0;
  const revenue = orders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
  return revenue / orders.length;
}

export interface CsvOrderRow {
  id: string;
  date: string;
  customer: string;
  product: string;
  quantity: number;
  total: number;
  status: string;
  channel: OrderChannel;
  zone: string;
}

/** Shape orders into flat CSV-ready rows for export (id, date, customer, product, quantity, total, status, channel, zone). */
export function toCsvRows(orders: OrderWithDetails[], products: Product[]): CsvOrderRow[] {
  const productMap = buildProductMap(products);
  return orders.map((order) => {
    const product = order.product_id ? productMap.get(order.product_id) : undefined;
    const zone =
      order.address?.zone?.english_name || order.address?.zone?.arabic_name || "Unknown";
    return {
      id: order.id,
      date: order.created_at,
      customer: order.customer?.full_name || "",
      product: product ? product.name : UNKNOWN_PRODUCT_LABEL,
      quantity: Number(order.quantity) || 0,
      total: Number(order.total_price) || 0,
      status: order.status,
      channel: channelOf(order),
      zone,
    };
  });
}
