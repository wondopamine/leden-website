// Canonical status → design-token mapping for the admin (product register).
//
// Single source of truth for how order + menu statuses render as color. The
// brand palette has no green/yellow "success/warning" scale, so status color is
// expressed entirely in the in-brand Radix scales (orange / forest / cream) plus
// the destructive red — never raw Tailwind green/yellow/amber.
//
// Temperature model for orders: the loud brand accent (orange) marks the states
// that demand staff action (new = solid, preparing = soft), forest marks "ready"
// (go / hand off), neutral cream marks "done" (receded), destructive marks void.
// Every foreground/background pairing here is WCAG AA (see DESIGN.md).
import type { OrderStatus } from "@/app/admin/(dashboard)/actions";

export type MenuStatus = "available" | "sold_out" | "hidden";

type OrderStatusMeta = {
  label: string;
  /** Full badge className: background + text + border. */
  badge: string;
  /** Solid status-dot className (background only). */
  dot: string;
  /** The next status in the fulfillment flow, if any. */
  next?: OrderStatus;
  /** Verb label for the advance-status action button. */
  nextLabel?: string;
};

export const ORDER_STATUS: Record<OrderStatus, OrderStatusMeta> = {
  new: {
    label: "New",
    badge: "bg-orange-9 text-forest-12 border-transparent",
    dot: "bg-orange-9",
    next: "preparing",
    nextLabel: "Start preparing",
  },
  preparing: {
    label: "Preparing",
    badge: "bg-orange-3 text-orange-12 border-orange-6",
    dot: "bg-orange-8",
    next: "ready",
    nextLabel: "Mark ready",
  },
  ready: {
    label: "Ready",
    badge: "bg-forest-3 text-forest-11 border-forest-6",
    dot: "bg-forest-9",
    next: "picked_up",
    nextLabel: "Mark picked up",
  },
  picked_up: {
    label: "Picked up",
    badge: "bg-cream-3 text-cream-11 border-cream-6",
    dot: "bg-cream-8",
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-destructive/10 text-destructive border-transparent",
    dot: "bg-destructive",
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

export const MENU_STATUS: Record<MenuStatus, { label: string; badge: string }> = {
  available: {
    label: "Available",
    badge: "bg-forest-3 text-forest-11 border-forest-6",
  },
  sold_out: {
    label: "Sold out",
    badge: "bg-orange-3 text-orange-12 border-orange-6",
  },
  hidden: {
    label: "Hidden",
    badge: "bg-cream-3 text-cream-11 border-cream-6",
  },
};
