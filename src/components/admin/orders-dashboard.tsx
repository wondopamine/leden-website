"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { OrderCard, type Order } from "./order-card";
import {
  ORDER_STATUS,
  KDS_COLUMNS,
  ORDER_TERMINAL,
} from "@/components/admin/status";
import type { OrderStatus } from "@/app/admin/(dashboard)/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  initialOrders: Order[];
};

const COLUMN_EMPTY_STATE: Record<
  string,
  { title: string; description: string }
> = {
  new: {
    title: "No new orders",
    description: "Incoming pickup orders will appear here.",
  },
  preparing: {
    title: "Nothing in preparation",
    description: "Orders move here after preparation starts.",
  },
  ready: {
    title: "Nothing ready",
    description: "Orders waiting for handoff will appear here.",
  },
};

export function OrdersDashboard({ initialOrders }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);

  const fetchOrderItems = useCallback(async (orderId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);
    return data ?? [];
  }, []);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    // Guard createClient()/subscribe so a missing or invalid Supabase env (e.g. the
    // preview harness) logs and no-ops instead of crashing render. When it works, the
    // realtime subscription still drives the new-order sound + toast.
    let supabase: ReturnType<typeof createClient> | undefined;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | undefined;

    try {
      supabase = createClient();
      channel = supabase
        .channel("admin-orders-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "orders" },
          async (payload) => {
            const newOrder = payload.new as Order;
            const items = await fetchOrderItems(newOrder.id);
            const orderWithItems = { ...newOrder, order_items: items };
            setOrders((prev) => [orderWithItems, ...prev]);

            // Notification sound
            try {
              const audio = new Audio("/sounds/notification.mp3");
              audio.volume = 0.5;
              audio.play().catch(() => {});
            } catch {}

            toast.success(`New order: ${newOrder.order_number}`, {
              description: `${newOrder.customer_name} · Pickup: ${newOrder.pickup_time ? new Date(newOrder.pickup_time).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" }) : "ASAP"}`,
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "orders" },
          (payload) => {
            const updated = payload.new as Order;
            setOrders((prev) =>
              prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
            );
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("[orders-dashboard] realtime disabled:", err);
      return;
    }

    return () => {
      try {
        if (channel) supabase?.removeChannel(channel);
      } catch {}
    };
  }, [fetchOrderItems]);

  const byStatus = (status: OrderStatus) =>
    orders.filter((o) => o.status === status);

  const terminalOrders = ORDER_TERMINAL.flatMap((status) => byStatus(status));
  const pickedUpCount = byStatus("picked_up").length;
  const cancelledCount = byStatus("cancelled").length;

  return (
    <div className="space-y-4">
      {/* KDS columns: New / Preparing / Ready */}
      <div className="grid gap-4 lg:grid-cols-3">
        {KDS_COLUMNS.map((status) => (
          <KdsColumn
            key={status}
            status={status}
            orders={byStatus(status)}
            emptyState={COLUMN_EMPTY_STATE[status] ?? {
              title: "No orders",
              description: "Orders in this state will appear here.",
            }}
          />
        ))}
      </div>

      {/* Quiet terminal strip: recently picked up / cancelled */}
      {terminalOrders.length > 0 && (
        <section className="space-y-3 border-t border-border pt-4">
          <h2 className="font-sans text-sm font-semibold text-foreground">
            Recently picked up ({pickedUpCount}) / cancelled ({cancelledCount})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {terminalOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function KdsColumn({
  status,
  orders,
  emptyState,
}: {
  status: OrderStatus;
  orders: Order[];
  emptyState: { title: string; description: string };
}) {
  const meta = ORDER_STATUS[status];
  const StatusIcon = meta.icon;
  const headingId = `orders-${status}-heading`;

  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3">
      <div className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
        <span aria-hidden="true" className={cn("size-2.5 rounded-full", meta.dot)} />
        <StatusIcon aria-hidden="true" className="size-4 text-muted-foreground" />
        <h2 id={headingId} className="font-sans text-sm font-semibold text-foreground">
          {meta.label}
        </h2>
        <span
          aria-label={`${orders.length} ${orders.length === 1 ? "order" : "orders"}`}
          className="ml-auto rounded-full bg-muted px-2 py-0.5 text-caption font-semibold tabular-nums text-foreground"
        >
          {orders.length}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {orders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm font-medium text-foreground">{emptyState.title}</p>
            <p className="mt-1 text-caption text-muted-foreground">
              {emptyState.description}
            </p>
          </div>
        ) : (
          orders.map((order) => <OrderCard key={order.id} order={order} />)
        )}
      </div>
    </section>
  );
}
