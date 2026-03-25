import { createClient } from "@/lib/supabase/server";
import { OrderCard, type Order } from "@/components/admin/order-card";
import type { OrderStatus } from "../actions";
import { OrdersFilter } from "@/components/admin/orders-filter";

type Props = {
  searchParams: Promise<{
    date?: string;
    status?: string;
    q?: string;
  }>;
};

export default async function OrdersPage({ searchParams }: Props) {
  const { date, status, q } = await searchParams;
  const supabase = await createClient();

  // Default to today
  const selectedDate = date || new Date().toISOString().split("T")[0];
  const dayStart = new Date(selectedDate + "T00:00:00");
  const dayEnd = new Date(selectedDate + "T23:59:59.999");

  let query = supabase
    .from("orders")
    .select("*, order_items(*)")
    .gte("created_at", dayStart.toISOString())
    .lte("created_at", dayEnd.toISOString())
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status as OrderStatus);
  }

  if (q) {
    query = query.or(
      `order_number.ilike.%${q}%,customer_name.ilike.%${q}%`
    );
  }

  const { data: orders } = await query;
  const allOrders = (orders ?? []) as Order[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Orders</h1>
        <p className="text-sm text-stone-500">
          Browse and manage orders
        </p>
      </div>

      <OrdersFilter
        currentDate={selectedDate}
        currentStatus={status || "all"}
        currentSearch={q || ""}
      />

      {allOrders.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <p className="text-lg">No orders found</p>
          <p className="text-sm">
            {q
              ? "Try a different search term"
              : "No orders for this date"}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
