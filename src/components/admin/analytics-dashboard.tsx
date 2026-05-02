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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-stone-900">Order Analysis</h2>
        <PeriodSelector selected={period} onSelect={handlePeriodChange} />
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : data ? (
        <>
          {/* Stats cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AnalyticsStatCard
              title="Total Orders"
              value={data.totalOrders.toString()}
              icon={<ShoppingBag className="h-4 w-4 text-stone-500" />}
            />
            <AnalyticsStatCard
              title="Revenue"
              value={`$${data.totalRevenue.toFixed(2)}`}
              icon={<DollarSign className="h-4 w-4 text-stone-500" />}
            />
            <AnalyticsStatCard
              title="Avg Order"
              value={`$${data.avgOrderValue.toFixed(2)}`}
              icon={<TrendingUp className="h-4 w-4 text-stone-500" />}
            />
            <AnalyticsStatCard
              title="Cancelled"
              value={`${data.cancelledRate}%`}
              icon={<XCircle className="h-4 w-4 text-stone-500" />}
            />
          </div>

          {/* Revenue trend chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-stone-500">
                Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.revenueTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis
                      dataKey="label"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#78716c" }}
                    />
                    <YAxis
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#78716c" }}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      formatter={(value) => [`$${Number(value).toFixed(2)}`, "Revenue"]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e7e5e4",
                        fontSize: "13px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#292524"
                      fill="#d6d3d1"
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
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-stone-500">
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
                          <span className="text-sm font-medium text-stone-400 w-5 text-right">
                            {i + 1}.
                          </span>
                          <span className="text-sm font-medium text-stone-900">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-stone-500">
                            {item.quantity} sold
                          </span>
                          <span className="text-sm font-medium text-stone-700 w-20 text-right">
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
              <CardHeader>
                <CardTitle className="text-sm font-medium text-stone-500">
                  Orders by Hour
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.peakHours.some((h) => h.orders > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.peakHours.filter((h) => h.orders > 0)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                      <XAxis
                        dataKey="hour"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#78716c" }}
                      />
                      <YAxis
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#78716c" }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        formatter={(value) => [value, "Orders"]}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #e7e5e4",
                          fontSize: "13px",
                        }}
                      />
                      <Bar
                        dataKey="orders"
                        fill="#78716c"
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

function AnalyticsStatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-stone-500">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-20 bg-stone-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-24 bg-stone-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="h-[300px] bg-stone-100 rounded animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-[200px] text-sm text-stone-400">
      {text}
    </div>
  );
}
