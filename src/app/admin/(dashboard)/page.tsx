import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { OrdersDashboard } from "@/components/admin/orders-dashboard";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, DollarSign, Clock, CheckCircle } from "lucide-react";

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
  const totalRevenue = todayOrders.reduce(
    (sum, o) => sum + Number(o.total),
    0
  );
  const activeOrders = todayOrders.filter(
    (o) => o.status === "new" || o.status === "preparing" || o.status === "ready"
  ).length;
  const completedOrders = todayOrders.filter(
    (o) => o.status === "picked_up"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>
        <p className="text-sm text-stone-500">
          {today.toLocaleDateString("en-CA", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Orders"
          value={todayOrders.length.toString()}
          icon={<ClipboardList className="h-4 w-4 text-stone-500" />}
        />
        <StatCard
          title="Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
          icon={<DollarSign className="h-4 w-4 text-stone-500" />}
        />
        <StatCard
          title="Active"
          value={activeOrders.toString()}
          icon={<Clock className="h-4 w-4 text-stone-500" />}
        />
        <StatCard
          title="Completed"
          value={completedOrders.toString()}
          icon={<CheckCircle className="h-4 w-4 text-stone-500" />}
        />
      </div>

      {/* Live orders board */}
      <OrdersDashboard initialOrders={todayOrders} />

      {/* Order analysis — loads independently */}
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-stone-100" />}>
        <AnalyticsDashboard />
      </Suspense>
    </div>
  );
}

function StatCard({
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
