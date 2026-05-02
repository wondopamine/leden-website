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

const statusConfig: Record<
  OrderStatus,
  { label: string; color: string; next?: OrderStatus; nextLabel?: string }
> = {
  new: {
    label: "New",
    color: "bg-red-100 text-red-800",
    next: "preparing",
    nextLabel: "Start Preparing",
  },
  preparing: {
    label: "Preparing",
    color: "bg-yellow-100 text-yellow-800",
    next: "ready",
    nextLabel: "Mark Ready",
  },
  ready: {
    label: "Ready",
    color: "bg-green-100 text-green-800",
    next: "picked_up",
    nextLabel: "Picked Up",
  },
  picked_up: {
    label: "Picked Up",
    color: "bg-stone-100 text-stone-600",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-stone-100 text-stone-400",
  },
};

export function OrderCard({ order }: { order: Order }) {
  const [isPending, startTransition] = useTransition();
  const config = statusConfig[order.status];

  function handleStatusChange(newStatus: OrderStatus) {
    startTransition(async () => {
      try {
        await updateOrderStatus(order.id, newStatus);
        toast.success(`Order ${order.order_number} → ${statusConfig[newStatus].label}`);
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
    <Card className={isPending ? "opacity-60" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              {order.order_number}
            </CardTitle>
            <p className="text-sm font-medium text-stone-700">
              {order.customer_name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={config.color} variant="secondary">
              {config.label}
            </Badge>
            {order.status !== "picked_up" && order.status !== "cancelled" && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
                >
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("cancelled")}
                    className="text-red-600"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel Order
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-xs text-stone-500">
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {order.customer_phone}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {pickupDisplay}
          </span>
          <span>{timeAgo}</span>
        </div>

        <ul className="space-y-1 text-sm">
          {order.order_items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>
                {item.quantity}x {item.menu_item_name}
                {item.modifiers.length > 0 && (
                  <span className="text-stone-400 text-xs ml-1">
                    ({item.modifiers.map((m) => m.option).join(", ")})
                  </span>
                )}
              </span>
              <span className="text-stone-500">
                ${((item.price + item.modifiers.reduce((s, m) => s + m.priceAdjustment, 0)) * item.quantity).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between border-t pt-2">
          <span className="font-semibold text-sm">
            ${Number(order.total).toFixed(2)}
          </span>
          {config.next && (
            <Button
              variant="default"
              size="sm"
              onClick={() => handleStatusChange(config.next!)}
              disabled={isPending}
            >
              {config.nextLabel}
              <ChevronRight className="ml-1 h-4 w-4" />
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
