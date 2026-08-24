import { Suspense } from "react";
import type { Metadata } from "next";
import {
  AdminOrdersError,
  getTorontoDayBounds,
  listAdminOrders,
} from "@/lib/orders/admin.server";
import { OrdersDashboard } from "@/components/admin/orders-dashboard";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatStrip } from "@/components/admin/stat-strip";

export const metadata: Metadata = {
  title: "Live orders",
  description: "Monitor and advance Café Le Den pickup orders.",
};

export default async function AdminDashboardPage() {
  let initialError = false;
  let snapshot;
  try {
    snapshot = await listAdminOrders();
  } catch (error) {
    if (!(error instanceof AdminOrdersError)) throw error;
    initialError = true;
    const now = new Date();
    snapshot = {
      orders: [],
      orderingEnabled: false,
      localDate: getTorontoDayBounds(now).localDate,
      refreshedAt: now.toISOString(),
    };
  }

  const visibleOrders = snapshot.orders;
  const totalRevenue = visibleOrders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.total), 0);
  const activeOrders = visibleOrders.filter(
    (o) => o.status === "new" || o.status === "preparing" || o.status === "ready"
  ).length;
  const readyOrders = visibleOrders.filter((o) => o.status === "ready").length;
  const completedOrders = visibleOrders.filter(
    (o) => o.status === "picked_up"
  ).length;

  const dateLabel = new Date(`${snapshot.localDate}T12:00:00Z`).toLocaleDateString("en-CA", {
    timeZone: "America/Toronto",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const tiles = [
    { label: "Visible orders", value: String(visibleOrders.length) },
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
      <OrdersDashboard
        initialOrders={visibleOrders}
        initialRefreshedAt={initialError ? null : snapshot.refreshedAt}
        initialOrderingEnabled={initialError ? null : snapshot.orderingEnabled}
        initialError={initialError}
      />

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
