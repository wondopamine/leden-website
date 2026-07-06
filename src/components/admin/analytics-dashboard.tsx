"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodSelector } from "./period-selector";
import {
  type Period,
  type AnalyticsData,
  fetchAnalytics,
} from "@/lib/supabase/analytics";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  XCircle,
} from "lucide-react";

const TOOLTIP_CONTENT_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  color: "var(--popover-foreground)",
  fontSize: "13px",
} as const;

const TOOLTIP_TEXT_STYLE = { color: "var(--popover-foreground)" } as const;

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>("daily");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      const result = await fetchAnalytics(period);
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-sans text-lg font-semibold text-foreground">
          Order Analysis
        </h2>
        <PeriodSelector selected={period} onSelect={handlePeriodChange} />
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : data ? (
        <>
          {/* Stat strip */}
          <div className="grid grid-cols-2 rounded-lg border border-border bg-card sm:grid-cols-4">
            <StatTile
              label="Total Orders"
              value={data.totalOrders.toString()}
              icon={<ShoppingBag className="size-3.5" />}
            />
            <StatTile
              label="Revenue"
              value={`$${data.totalRevenue.toFixed(2)}`}
              icon={<DollarSign className="size-3.5" />}
            />
            <StatTile
              label="Avg Order"
              value={`$${data.avgOrderValue.toFixed(2)}`}
              icon={<TrendingUp className="size-3.5" />}
            />
            <StatTile
              label="Cancelled"
              value={`${data.cancelledRate}%`}
              icon={<XCircle className="size-3.5" />}
            />
          </div>

          {/* Revenue trend chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-sans text-sm font-semibold text-foreground">
                Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.revenueTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="label"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--muted-foreground)" }}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      formatter={(value) => [`$${Number(value).toFixed(2)}`, "Revenue"]}
                      contentStyle={TOOLTIP_CONTENT_STYLE}
                      labelStyle={TOOLTIP_TEXT_STYLE}
                      itemStyle={TOOLTIP_TEXT_STYLE}
                      cursor={{ fill: "var(--muted)" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--chart-1)"
                      fill="var(--chart-1)"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState text="No revenue data for this period" />
              )}
            </CardContent>
          </Card>

          {/* Bottom row: Top Items + Peak Hours */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Top items */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-sans text-sm font-semibold text-foreground">
                  Top Selling Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.topItems.length > 0 ? (
                  <div className="space-y-3">
                    {data.topItems.map((item, i) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 text-right text-sm font-medium tabular-nums text-muted-foreground">
                            {i + 1}.
                          </span>
                          <span className="text-sm font-medium text-foreground">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm tabular-nums text-muted-foreground">
                            {item.quantity} sold
                          </span>
                          <span className="w-20 text-right text-sm font-medium tabular-nums text-foreground">
                            ${item.revenue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState text="No items sold in this period" />
                )}
              </CardContent>
            </Card>

            {/* Peak hours */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-sans text-sm font-semibold text-foreground">
                  Orders by Hour
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.peakHours.some((h) => h.orders > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.peakHours.filter((h) => h.orders > 0)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="hour"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "var(--muted-foreground)" }}
                      />
                      <YAxis
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "var(--muted-foreground)" }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        formatter={(value) => [value, "Orders"]}
                        contentStyle={TOOLTIP_CONTENT_STYLE}
                        labelStyle={TOOLTIP_TEXT_STYLE}
                        itemStyle={TOOLTIP_TEXT_STYLE}
                        cursor={{ fill: "var(--muted)" }}
                      />
                      <Bar
                        dataKey="orders"
                        fill="var(--chart-2)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState text="No orders in this period" />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="border-border p-4 [&:nth-child(-n+2)]:border-b [&:nth-child(odd)]:border-r sm:border-b-0 sm:[&:nth-child(2)]:border-r">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-label uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 rounded-lg border border-border bg-card sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-border p-4 [&:nth-child(-n+2)]:border-b [&:nth-child(odd)]:border-r sm:border-b-0 sm:[&:nth-child(2)]:border-r"
          >
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-6 w-24 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <Card>
        <CardContent>
          <div className="h-[300px] animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
