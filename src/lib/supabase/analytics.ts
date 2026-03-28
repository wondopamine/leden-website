import { createClient } from "./client";

export type Period = "daily" | "weekly" | "monthly" | "3months" | "6months" | "yearly" | "all";

export type RevenueDataPoint = {
  label: string;
  revenue: number;
  orders: number;
};

export type TopItem = {
  name: string;
  quantity: number;
  revenue: number;
};

export type StatusBreakdown = {
  status: string;
  count: number;
};

export type HourlyData = {
  hour: string;
  orders: number;
};

export type AnalyticsData = {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  cancelledRate: number;
  revenueTrend: RevenueDataPoint[];
  topItems: TopItem[];
  statusBreakdown: StatusBreakdown[];
  peakHours: HourlyData[];
};

function getDateRange(period: Period): { start: Date | null; end: Date } {
  const now = new Date();
  const end = new Date(now);

  switch (period) {
    case "daily": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case "weekly": {
      const start = new Date(now);
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday as start
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case "monthly": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end };
    }
    case "3months": {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case "6months": {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 6);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case "yearly": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end };
    }
    case "all":
      return { start: null, end };
  }
}

function groupByInterval(
  orders: Array<{ created_at: string; total: number }>,
  period: Period
): RevenueDataPoint[] {
  const map = new Map<string, { revenue: number; orders: number }>();

  for (const order of orders) {
    const date = new Date(order.created_at);
    let key: string;

    switch (period) {
      case "daily":
        key = date.toLocaleTimeString("en-CA", { hour: "2-digit", hour12: false });
        break;
      case "weekly":
      case "monthly":
        key = date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
        break;
      case "3months":
      case "6months": {
        // Group by week — use the Monday of that week
        const d = new Date(date);
        const day = d.getDay();
        const diff = day === 0 ? 6 : day - 1;
        d.setDate(d.getDate() - diff);
        key = d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
        break;
      }
      case "yearly":
      case "all":
        key = date.toLocaleDateString("en-CA", { year: "numeric", month: "short" });
        break;
    }

    const existing = map.get(key) ?? { revenue: 0, orders: 0 };
    existing.revenue += Number(order.total);
    existing.orders += 1;
    map.set(key, existing);
  }

  return Array.from(map.entries()).map(([label, data]) => ({
    label,
    revenue: Math.round(data.revenue * 100) / 100,
    orders: data.orders,
  }));
}

export async function fetchAnalytics(period: Period): Promise<AnalyticsData> {
  const supabase = createClient();
  const { start, end } = getDateRange(period);

  // Fetch orders with items in a single joined query
  let query = supabase
    .from("orders")
    .select("id, status, total, created_at, order_items(menu_item_name, quantity, price)")
    .lte("created_at", end.toISOString())
    .order("created_at", { ascending: true });

  if (start) {
    query = query.gte("created_at", start.toISOString());
  }

  const { data: orders } = await query;
  const allOrders = (orders ?? []) as Array<{
    id: string;
    status: string;
    total: number;
    created_at: string;
    order_items: Array<{ menu_item_name: string; quantity: number; price: number }>;
  }>;

  // Flatten order items from the joined query
  const items = allOrders.flatMap((o) => o.order_items ?? []);

  // Calculate stats
  const nonCancelled = allOrders.filter((o) => o.status !== "cancelled");
  const cancelled = allOrders.filter((o) => o.status === "cancelled");
  const totalRevenue = nonCancelled.reduce((sum, o) => sum + Number(o.total), 0);
  const totalOrders = allOrders.length;
  const avgOrderValue = nonCancelled.length > 0 ? totalRevenue / nonCancelled.length : 0;
  const cancelledRate = totalOrders > 0 ? (cancelled.length / totalOrders) * 100 : 0;

  // Revenue trend
  const revenueTrend = groupByInterval(nonCancelled, period);

  // Top items
  const itemMap = new Map<string, { quantity: number; revenue: number }>();
  for (const item of items) {
    const existing = itemMap.get(item.menu_item_name) ?? { quantity: 0, revenue: 0 };
    existing.quantity += item.quantity;
    existing.revenue += Number(item.price) * item.quantity;
    itemMap.set(item.menu_item_name, existing);
  }
  const topItems = Array.from(itemMap.entries())
    .map(([name, data]) => ({
      name,
      quantity: data.quantity,
      revenue: Math.round(data.revenue * 100) / 100,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // Status breakdown
  const statusMap = new Map<string, number>();
  for (const order of allOrders) {
    statusMap.set(order.status, (statusMap.get(order.status) ?? 0) + 1);
  }
  const statusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({
    status,
    count,
  }));

  // Peak hours
  const hourMap = new Map<number, number>();
  for (const order of allOrders) {
    const hour = new Date(order.created_at).getHours();
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
  }
  const peakHours = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, "0")}:00`,
    orders: hourMap.get(i) ?? 0,
  }));

  return {
    totalOrders,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    cancelledRate: Math.round(cancelledRate * 10) / 10,
    revenueTrend,
    topItems,
    statusBreakdown,
    peakHours,
  };
}
