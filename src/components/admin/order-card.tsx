"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatus } from "@/app/admin/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type {
  AdminOrder,
  AdminOrderStatus,
} from "@/lib/orders/admin-realtime";
import { reconcileAfterAdminMutation } from "@/lib/orders/admin-realtime";

type OrderItem = {
  id: string;
  menu_item_name: string;
  price: number;
  quantity: number;
  modifiers: { name: string; option: string; priceAdjustment: number }[];
};

export type Order = Omit<
  AdminOrder,
  "order_items" | "status_version" | "promised_pickup_at" | "updated_at"
> & {
  order_items: OrderItem[];
  status_version?: number | null;
  promised_pickup_at?: string | null;
  updated_at?: string | null;
};

type Props = {
  order: Order;
  transitionsDisabled?: boolean;
  onReconcile?: () => Promise<unknown> | void;
  action?: typeof updateOrderStatus;
};

export function OrderCard({
  order,
  transitionsDisabled = false,
  onReconcile,
  action = updateOrderStatus,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const submittingRef = useRef(false);
  const [terminalAction, setTerminalAction] = useState<
    "picked_up" | "cancelled" | null
  >(null);
  const meta = ORDER_STATUS[order.status];
  const StatusIcon = meta.icon;
  const isTerminal = order.status === "picked_up" || order.status === "cancelled";

  function handleStatusChange(newStatus: AdminOrderStatus) {
    if (submittingRef.current || transitionsDisabled) return;
    submittingRef.current = true;
    startTransition(async () => {
      try {
        const result = await action({
          orderId: order.id,
          expectedStatus: order.status,
          expectedVersion: order.status_version ?? 0,
          newStatus,
        });
        if (result.ok) {
          toast.success(
            `Order ${order.order_number} → ${ORDER_STATUS[result.order.status].label}`,
          );
        } else if (result.code === "ORDER_CONFLICT") {
          toast.error(`Order ${order.order_number} changed on another device`, {
            description: result.current
              ? `Current status: ${ORDER_STATUS[result.current.status].label}. The board is refreshing.`
              : "The board is refreshing before another action is allowed.",
          });
        } else {
          toast.error(`Order ${order.order_number} was not updated`, {
            description:
              result.code === "INVALID_TRANSITION"
                ? "This order can no longer take that action. The board is refreshing."
                : "Check your connection, refresh the board, then try again.",
          });
        }
        setTerminalAction(null);
      } catch {
        toast.error(`Order ${order.order_number} was not updated`, {
          description: "Check your connection, refresh the board, then try again.",
        });
      } finally {
        await reconcileAfterAdminMutation(onReconcile, () => router.refresh()).catch(
          () => undefined,
        );
        submittingRef.current = false;
      }
    });
  }

  const pickupTimestamp = order.promised_pickup_at ?? order.pickup_time;
  const pickupDisplay = pickupTimestamp
    ? new Date(pickupTimestamp).toLocaleTimeString("en-CA", {
        timeZone: "America/Toronto",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "ASAP";

  const timeAgo = getTimeAgo(order.created_at);

  return (
    <Card
      aria-busy={isPending}
      className={cn("gap-3 py-4", isPending && "opacity-60")}
    >
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <CardTitle as="h3" className="flex items-center gap-2 font-sans text-lg font-semibold text-foreground">
              <span
                aria-hidden="true"
                className={cn("size-2.5 shrink-0 rounded-full", meta.dot)}
              />
              <span className="truncate tabular-nums">{order.order_number}</span>
            </CardTitle>
            <p className="truncate text-sm font-medium text-foreground">
              {order.customer_name}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant="outline" className={meta.badge}>
              <StatusIcon aria-hidden="true" data-icon="inline-start" />
              {meta.label}
            </Badge>
            {!isTerminal && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={isPending || transitionsDisabled}
                      aria-busy={isPending}
                      aria-label="Order actions"
                    />
                  }
                >
                  <MoreVertical className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setTerminalAction("cancelled")}
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
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg bg-muted/55 p-2.5 text-caption text-muted-foreground">
          <span className="flex items-center gap-1">
            <Phone aria-hidden="true" className="size-3.5" />
            <span className="tabular-nums">{order.customer_phone}</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock aria-hidden="true" className="size-3.5" />
            <span className="tabular-nums">{pickupDisplay}</span>
          </span>
          <span className="col-span-2 flex items-baseline justify-between border-t border-border pt-2">
            <span>Order age</span>
            <span className="font-semibold tabular-nums text-foreground">
              {timeAgo}
            </span>
          </span>
        </div>

        <ul className="divide-y divide-border text-sm">
          {order.order_items.map((item) => (
            <li key={item.id} className="grid grid-cols-[1fr_auto] gap-x-3 py-2 first:pt-0 last:pb-0">
              <span className="min-w-0 font-medium text-foreground">
                <span className="mr-1 font-semibold tabular-nums">
                  {item.quantity}×
                </span>
                {item.menu_item_name}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                ${(
                  (item.price +
                    item.modifiers.reduce((sum, modifier) =>
                      sum + modifier.priceAdjustment, 0)) * item.quantity
                ).toFixed(2)}
              </span>
              {item.modifiers.length > 0 ? (
                <ul className="col-span-2 mt-1 space-y-0.5 border-l-2 border-status-progress-border pl-3 text-caption text-muted-foreground">
                  {item.modifiers.map((modifier, index) => (
                    <li key={`${modifier.name}-${modifier.option}-${index}`}>
                      <span>{modifier.name}: </span>
                      <span className="font-medium text-foreground">
                        {modifier.option}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
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
              onClick={() =>
                meta.next === "picked_up"
                  ? setTerminalAction("picked_up")
                  : handleStatusChange(meta.next!)
              }
              disabled={isPending || transitionsDisabled}
              aria-busy={isPending}
              title={
                transitionsDisabled
                  ? "Refresh the board before changing an order."
                  : undefined
              }
            >
              {meta.nextLabel}
              <ChevronRight aria-hidden="true" className="ml-1 size-4" />
            </Button>
          )}
        </div>
      </CardContent>

      <Dialog
        open={terminalAction === "cancelled"}
        onOpenChange={(open) => setTerminalAction(open ? "cancelled" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-sans">Cancel order {order.order_number}?</DialogTitle>
            <DialogDescription>
              Call {order.customer_name} at {order.customer_phone} before you
              confirm. This marks the order as cancelled and cannot be undone
              from this screen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="default" />}>
              Keep order
            </DialogClose>
            <Button
              variant="destructive"
              size="default"
              onClick={() => handleStatusChange("cancelled")}
              disabled={isPending || transitionsDisabled}
              aria-busy={isPending}
            >
              {isPending ? "Cancelling…" : "Cancel order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={terminalAction === "picked_up"}
        onOpenChange={(open) => setTerminalAction(open ? "picked_up" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-sans">
              Mark order {order.order_number} picked up?
            </DialogTitle>
            <DialogDescription>
              Confirm only after the order has been handed to the customer. This
              terminal action cannot be undone from this screen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="default" />}>
              Keep ready
            </DialogClose>
            <Button
              size="default"
              onClick={() => handleStatusChange("picked_up")}
              disabled={isPending || transitionsDisabled}
              aria-busy={isPending}
            >
              {isPending ? "Confirming…" : "Confirm picked up"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Less than 1 min";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  return `${hours} hr`;
}
