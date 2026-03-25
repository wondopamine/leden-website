"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { OrderCard, type Order } from "./order-card";
import { toast } from "sonner";

type Props = {
  initialOrders: Order[];
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
    const supabase = createClient();
    const channel = supabase
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
            description: `${newOrder.customer_name} — Pickup: ${newOrder.pickup_time ? new Date(newOrder.pickup_time).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" }) : "ASAP"}`,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const updated = payload.new as Order;
          setOrders((prev) =>
            prev.map((o) =>
              o.id === updated.id ? { ...o, ...updated } : o
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrderItems]);

  const grouped = {
    new: orders.filter((o) => o.status === "new"),
    preparing: orders.filter((o) => o.status === "preparing"),
    ready: orders.filter((o) => o.status === "ready"),
    picked_up: orders.filter((o) => o.status === "picked_up"),
    cancelled: orders.filter((o) => o.status === "cancelled"),
  };

  return (
    <div className="space-y-6">
      {/* Active orders in columns */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatusColumn
          title="New"
          orders={grouped.new}
          emptyText="No new orders"
          dotColor="bg-red-500"
        />
        <StatusColumn
          title="Preparing"
          orders={grouped.preparing}
          emptyText="Nothing being prepared"
          dotColor="bg-yellow-500"
        />
        <StatusColumn
          title="Ready"
          orders={grouped.ready}
          emptyText="Nothing ready"
          dotColor="bg-green-500"
        />
      </div>

      {/* Completed / cancelled below */}
      {(grouped.picked_up.length > 0 || grouped.cancelled.length > 0) && (
        <div>
          <h3 className="text-sm font-medium text-stone-400 mb-3">
            Completed ({grouped.picked_up.length}) &middot; Cancelled (
            {grouped.cancelled.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...grouped.picked_up, ...grouped.cancelled].map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusColumn({
  title,
  orders,
  emptyText,
  dotColor,
}: {
  title: string;
  orders: Order[];
  emptyText: string;
  dotColor: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className={`h-2 w-2 rounded-full ${dotColor}`} />
        <h3 className="text-sm font-semibold text-stone-700">
          {title} ({orders.length})
        </h3>
      </div>
      <div className="space-y-3">
        {orders.length === 0 ? (
          <p className="text-sm text-stone-400 py-8 text-center border border-dashed rounded-lg">
            {emptyText}
          </p>
        ) : (
          orders.map((order) => <OrderCard key={order.id} order={order} />)
        )}
      </div>
    </div>
  );
}
