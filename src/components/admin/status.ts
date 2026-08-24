import type { AdminOrderStatus } from "@/lib/orders/admin-realtime";
import {
  BellRing,
  CheckCircle2,
  ChefHat,
  CircleSlash2,
  CircleX,
  EyeOff,
  PackageCheck,
  type LucideIcon,
} from "lucide-react";

export type MenuStatus = "available" | "sold_out" | "hidden";
export type OrderStatus = AdminOrderStatus;

type OrderStatusMeta = {
  label: string;
  badge: string;
  dot: string;
  icon: LucideIcon;
  next?: OrderStatus;
  nextLabel?: string;
};

export const ORDER_STATUS: Record<OrderStatus, OrderStatusMeta> = {
  new: {
    label: "New",
    badge:
      "border-transparent bg-status-active-solid text-accent-foreground",
    dot: "bg-status-active-solid",
    icon: BellRing,
    next: "preparing",
    nextLabel: "Start preparing",
  },
  preparing: {
    label: "Preparing",
    badge:
      "border-status-progress-border bg-status-progress-surface text-status-progress-foreground",
    dot: "bg-status-progress-solid",
    icon: ChefHat,
    next: "ready",
    nextLabel: "Mark ready",
  },
  ready: {
    label: "Ready",
    badge:
      "border-status-ready-border bg-status-ready-surface text-status-ready-foreground",
    dot: "bg-status-ready-solid",
    icon: CheckCircle2,
    next: "picked_up",
    nextLabel: "Mark picked up",
  },
  picked_up: {
    label: "Picked up",
    badge:
      "border-status-neutral-border bg-status-neutral-surface text-status-neutral-foreground",
    dot: "bg-status-neutral-solid",
    icon: PackageCheck,
  },
  cancelled: {
    label: "Cancelled",
    badge: "border-destructive/30 bg-destructive/10 text-destructive",
    dot: "bg-destructive",
    icon: CircleX,
  },
};

/** Canonical ordering of every status. */
export const ORDER_STATUS_SEQUENCE: OrderStatus[] = [
  "new",
  "preparing",
  "ready",
  "picked_up",
  "cancelled",
];

/** The live-work columns of the KDS board (active, actionable states). */
export const KDS_COLUMNS: OrderStatus[] = ["new", "preparing", "ready"];

/** Terminal states, shown in a collapsed "recent" strip, not a live column. */
export const ORDER_TERMINAL: OrderStatus[] = ["picked_up", "cancelled"];

export const MENU_STATUS: Record<
  MenuStatus,
  { label: string; badge: string; dot: string; icon: LucideIcon }
> = {
  available: {
    label: "Available",
    badge:
      "border-status-ready-border bg-status-ready-surface text-status-ready-foreground",
    dot: "bg-status-ready-solid",
    icon: CheckCircle2,
  },
  sold_out: {
    label: "Sold out",
    badge:
      "border-status-progress-border bg-status-progress-surface text-status-progress-foreground",
    dot: "bg-status-progress-solid",
    icon: CircleSlash2,
  },
  hidden: {
    label: "Hidden",
    badge:
      "border-status-neutral-border bg-status-neutral-surface text-status-neutral-foreground",
    dot: "bg-status-neutral-solid",
    icon: EyeOff,
  },
};
