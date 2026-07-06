"use client";

import { useTransition } from "react";
import {
  updateOrderStatus,
  type OrderStatus,
} from "@/app/admin/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ORDER_STATUS } from "@/components/admin/status";
import { cn } from "@/lib/utils";
import { ChevronRight, Phone, Clock, MoreVertical, X } from "lucide-react";
import { toast } from "sonner";

type OrderItem = {
  id: string;
  menu_item_name: string;
  price: number;
  quantity: number;
  modifiers: { name: string; option: string; priceAdjustment: number }[];
};

export type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  pickup_time: string | null;
  status: OrderStatus;
  subtotal: number;
  tax_gst: number;
  tax_qst: number;
  total: number;
  created_at: string;
  order_items: OrderItem[];
};

export function OrderCard({ order }: { order: Order }) {
  const [isPending, startTransition] = useTransition();
  const meta = ORDER_STATUS[order.status];
  const isTerminal = order.status === "picked_up" || order.status === "cancelled";

  function handleStatusChange(newStatus: OrderStatus) {
    startTransition(async () => {
      try {
        await updateOrderStatus(order.id, newStatus);
        toast.success(
          `Order ${order.order_number} → ${ORDER_STATUS[newStatus].label}`
        );
      } catch {
        toast.error("Failed to update order status");
      }
    });
  }

  const pickupDisplay = order.pickup_time
    ? new Date(order.pickup_time).toLocaleTimeString("en-CA", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "ASAP";

  const timeAgo = getTimeAgo(order.created_at);

  return (
    <Card className={cn("gap-3 py-4", isPending && "opacity-60")}>
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <CardTitle className="flex items-center gap-2 font-sans text-sm font-semibold text-foreground">
              <span className={cn("size-2 shrink-0 rounded-full", meta.dot)} />
              <span className="truncate tabular-nums">{order.order_number}</span>
            </CardTitle>
            <p className="truncate text-sm font-medium text-foreground">
              {order.customer_name}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant="outline" className={meta.badge}>
              {meta.label}
            </Badge>
            {!isTerminal && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Order actions"
                    />
                  }
                >
                  <MoreVertical className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("cancelled")}
                    className="text-destructive"
                  >
                    <X className="mr-2 size-4" />
                    Cancel order
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Phone className="size-3" />
            <span className="tabular-nums">{order.customer_phone}</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            <span className="tabular-nums">{pickupDisplay}</span>
          </span>
          <span className="tabular-nums">{timeAgo}</span>
        </div>

        <ul className="space-y-1 text-sm">
          {order.order_items.map((item) => (
            <li key={item.id} className="flex justify-between gap-2">
              <span className="min-w-0">
                <span className="tabular-nums">{item.quantity}x</span>{" "}
                {item.menu_item_name}
                {item.modifiers.length > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({item.modifiers.map((m) => m.option).join(", ")})
                  </span>
                )}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                $
                {(
                  (item.price +
                    item.modifiers.reduce((s, m) => s + m.priceAdjustment, 0)) *
                  item.quantity
                ).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
          <span className="text-sm font-semibold tabular-nums text-foreground">
            ${Number(order.total).toFixed(2)}
          </span>
          {meta.next && (
            <Button
              variant="default"
              size="sm"
              onClick={() => handleStatusChange(meta.next!)}
              disabled={isPending}
            >
              {meta.nextLabel}
              <ChevronRight className="ml-1 size-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}
