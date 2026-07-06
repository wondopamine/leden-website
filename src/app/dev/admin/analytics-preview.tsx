"use client";

// Dev-only static preview of the analytics chart area.
//
// The real <AnalyticsDashboard /> fetches from Supabase on mount, so without env
// it can only ever render its loading skeleton (a graceful, non-crashing degrade).
// This wrapper renders the SAME chart JSX + token props against inline sample data
// so the recharts token migration (chart series, grid, axis, tooltip surface) can
// actually be screenshot-verified. It mirrors src/components/admin/analytics-dashboard.tsx;
// keep the token props in sync if that file changes. No Supabase, no network.

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
import type { AnalyticsData } from "@/lib/supabase/analytics";
import { DollarSign, ShoppingBag, TrendingUp, XCircle } from "lucide-react";

const TOOLTIP_CONTENT_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  color: "var(--popover-foreground)",
  fontSize: "13px",
} as const;

const TOOLTIP_TEXT_STYLE = { color: "var(--popover-foreground)" } as const;

// Inline sample in the exact AnalyticsData shape fetchAnalytics() returns.
const SAMPLE: AnalyticsData = {
  totalOrders: 42,
  totalRevenue: 486.5,
  avgOrderValue: 11.58,
  cancelledRate: 4.8,
  revenueTrend: [
    { label: "08", revenue: 42.0, orders: 4 },
    { label: "09", revenue: 88.5, orders: 8 },
    { label: "10", revenue: 121.0, orders: 10 },
    { label: "11", revenue: 96.5, orders: 9 },
    { label: "12", revenue: 74.0, orders: 7 },
    { label: "13", revenue: 64.5, orders: 4 },
  ],
  topItems: [
    { name: "Flat White", quantity: 18, revenue: 90.0 },
    { name: "Almond Croissant", quantity: 12, revenue: 60.0 },
    { name: "Cold Brew", quantity: 9, revenue: 49.5 },
    { name: "Avocado Toast", quantity: 7, revenue: 84.0 },
    { name: "Matcha Latte", quantity: 6, revenue: 36.0 },
  ],
  statusBreakdown: [],
  peakHours: [
    { hour: "08:00", orders: 4 },
    { hour: "09:00", orders: 8 },
    { hour: "10:00", orders: 10 },
    { hour: "11:00", orders: 9 },
    { hour: "12:00", orders: 7 },
    { hour: "13:00", orders: 4 },
  ],
};

export function AnalyticsPreview() {
  const data = SAMPLE;

  return (
    <div className="space-y-4">
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
        </CardContent>
      </Card>

      {/* Bottom row: Top Items + Peak Hours */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-sans text-sm font-semibold text-foreground">
              Top Selling Items
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-sans text-sm font-semibold text-foreground">
              Orders by Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.peakHours}>
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
                <Bar dataKey="orders" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
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
