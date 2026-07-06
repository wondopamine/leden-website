import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { type Order } from "@/components/admin/order-card";
import type { OrderStatus } from "../actions";
import { OrdersFilter } from "@/components/admin/orders-filter";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ORDER_STATUS } from "@/components/admin/status";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  const headClass =
    "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Orders"
        subtitle={`${allOrders.length} ${allOrders.length === 1 ? "order" : "orders"}`}
      />

      <OrdersFilter
        currentDate={selectedDate}
        currentStatus={status || "all"}
        currentSearch={q || ""}
      />

      {allOrders.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-16 text-center text-muted-foreground">
          <p className="text-sm font-medium text-foreground">No orders found</p>
          <p className="mt-1 text-caption">
            {q ? "Try a different search term" : "No orders for this date"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={headClass}>Order</TableHead>
                <TableHead className={headClass}>Customer</TableHead>
                <TableHead className={`${headClass} text-right`}>Items</TableHead>
                <TableHead className={`${headClass} text-right`}>Total</TableHead>
                <TableHead className={headClass}>Status</TableHead>
                <TableHead className={`${headClass} text-right`}>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allOrders.map((order) => {
                const items = order.order_items ?? [];
                const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
                const created = new Date(order.created_at);
                const meta = ORDER_STATUS[order.status];
                return (
                  <TableRow key={order.id} className="relative">
                    <TableCell className="py-2.5">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="rounded-sm font-medium text-foreground after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {order.order_number}
                      </Link>
                    </TableCell>
                    <TableCell className="py-2.5 text-foreground">
                      {order.customer_name}
                    </TableCell>
                    <TableCell className="py-2.5 text-right tabular-nums text-muted-foreground">
                      {itemCount}
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-medium tabular-nums">
                      ${Number(order.total).toFixed(2)}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant="outline" className={meta.badge}>
                        {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="py-2.5 text-right tabular-nums text-muted-foreground"
                      title={created.toLocaleString("en-CA")}
                    >
                      {created.toLocaleTimeString("en-CA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
