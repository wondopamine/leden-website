import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { OrdersDashboard } from "@/components/admin/orders-dashboard";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatStrip } from "@/components/admin/stat-strip";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Get today's date range in local timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: orders } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .gte("created_at", today.toISOString())
    .lt("created_at", tomorrow.toISOString())
    .order("created_at", { ascending: false });

  const todayOrders = orders ?? [];
  const totalRevenue = todayOrders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.total), 0);
  const activeOrders = todayOrders.filter(
    (o) => o.status === "new" || o.status === "preparing" || o.status === "ready"
  ).length;
  const readyOrders = todayOrders.filter((o) => o.status === "ready").length;
  const completedOrders = todayOrders.filter(
    (o) => o.status === "picked_up"
  ).length;

  const dateLabel = today.toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const tiles = [
    { label: "Orders", value: String(todayOrders.length) },
    { label: "Submitted value", value: `$${totalRevenue.toFixed(2)}` },
    { label: "Active", value: String(activeOrders) },
    { label: "Ready", value: String(readyOrders) },
    { label: "Completed", value: String(completedOrders) },
  ];

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Live orders" subtitle={dateLabel} />

      {/* Compact stat strip */}
      <StatStrip tiles={tiles} />

      {/* Live KDS board */}
      <OrdersDashboard initialOrders={todayOrders} />

      {/* Order analysis — loads independently */}
      <Suspense
        fallback={
          <div
            role="status"
            className="h-64 animate-pulse rounded-xl bg-muted"
          >
            <span className="sr-only">Loading order analysis…</span>
          </div>
        }
      >
        <AnalyticsDashboard />
      </Suspense>
    </div>
  );
}
