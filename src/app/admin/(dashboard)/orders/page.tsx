import Link from "next/link";
import type { Metadata } from "next";
import {
  getTorontoDayBounds,
  listAdminOrderHistory,
} from "@/lib/orders/admin.server";
import type { AdminOrderStatus } from "@/lib/orders/admin-realtime";
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

export const metadata: Metadata = {
  title: "Order history",
  description: "Search and review Café Le Den pickup orders by date and status.",
};

export default async function OrdersPage({ searchParams }: Props) {
  const { date, status, q } = await searchParams;
  const selectedDate = date || getTorontoDayBounds().localDate;
  const validStatuses: AdminOrderStatus[] = [
    "new",
    "preparing",
    "ready",
    "picked_up",
    "cancelled",
  ];
  const selectedStatus = validStatuses.includes(status as AdminOrderStatus)
    ? (status as AdminOrderStatus)
    : undefined;
  const allOrders = await listAdminOrderHistory({
    localDate: selectedDate,
    status: selectedStatus,
    query: q,
  });

  const headClass = "text-xs font-semibold text-muted-foreground";

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
          <Table containerClassName="max-h-[calc(100dvh-16rem)]">
            <TableHeader sticky>
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
                        <meta.icon aria-hidden="true" data-icon="inline-start" />
                        {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="py-2.5 text-right tabular-nums text-muted-foreground"
                      title={created.toLocaleString("en-CA")}
                    >
                      {created.toLocaleTimeString("en-CA", {
                        timeZone: "America/Toronto",
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
