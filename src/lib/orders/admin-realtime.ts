export const ADMIN_STALE_AFTER_MS = 45_000;
// A healthy canonical poll must land before the freshness lockout. The margin
// absorbs ordinary browser timer drift without ever presenting a known-stale
// queue as actionable.
export const ADMIN_LIVE_POLL_MS = 30_000;
export const ADMIN_DEGRADED_POLL_MS = 15_000;

export type AdminOrderStatus =
  | "new"
  | "preparing"
  | "ready"
  | "picked_up"
  | "cancelled";

export type AdminOrderModifier = {
  name: string;
  option: string;
  priceAdjustment: number;
};

export type AdminOrderItem = {
  id: string;
  menu_item_name: string;
  price: number;
  quantity: number;
  modifiers: AdminOrderModifier[];
};

export type AdminOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  pickup_time: string | null;
  promised_pickup_at: string | null;
  status: AdminOrderStatus;
  status_version: number;
  subtotal: number;
  tax_gst: number;
  tax_qst: number;
  total: number;
  created_at: string;
  updated_at: string;
  order_items: AdminOrderItem[];
};

export type AdminOrdersSnapshot = {
  orders: AdminOrder[];
  orderingEnabled: boolean;
  localDate: string;
  refreshedAt: string;
};

export type AdminTransportState = "live" | "reconnecting" | "polling";
export type AdminConnectionState = AdminTransportState | "stale";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStatus(value: unknown): value is AdminOrderStatus {
  return (
    value === "new" ||
    value === "preparing" ||
    value === "ready" ||
    value === "picked_up" ||
    value === "cancelled"
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parseAdminOrdersSnapshot(value: unknown): AdminOrdersSnapshot {
  if (
    !isRecord(value) ||
    !Array.isArray(value.orders) ||
    typeof value.orderingEnabled !== "boolean" ||
    typeof value.localDate !== "string" ||
    typeof value.refreshedAt !== "string"
  ) {
    throw new Error("Invalid admin orders response.");
  }

  const orders = value.orders.map((raw): AdminOrder => {
    if (!isRecord(raw) || !Array.isArray(raw.order_items)) {
      throw new Error("Invalid admin order response.");
    }
    const items = raw.order_items.map((item): AdminOrderItem => {
      if (!isRecord(item) || !Array.isArray(item.modifiers)) {
        throw new Error("Invalid admin order item response.");
      }
      const modifiers = item.modifiers.map((modifier): AdminOrderModifier => {
        if (
          !isRecord(modifier) ||
          typeof modifier.name !== "string" ||
          typeof modifier.option !== "string" ||
          !isFiniteNumber(modifier.priceAdjustment)
        ) {
          throw new Error("Invalid admin order modifier response.");
        }
        return {
          name: modifier.name,
          option: modifier.option,
          priceAdjustment: modifier.priceAdjustment,
        };
      });
      if (
        typeof item.id !== "string" ||
        typeof item.menu_item_name !== "string" ||
        !isFiniteNumber(item.price) ||
        !Number.isInteger(item.quantity) ||
        (item.quantity as number) < 1
      ) {
        throw new Error("Invalid admin order item response.");
      }
      return {
        id: item.id,
        menu_item_name: item.menu_item_name,
        price: item.price,
        quantity: item.quantity as number,
        modifiers,
      };
    });
    if (
      typeof raw.id !== "string" ||
      typeof raw.order_number !== "string" ||
      typeof raw.customer_name !== "string" ||
      typeof raw.customer_phone !== "string" ||
      (raw.pickup_time !== null && typeof raw.pickup_time !== "string") ||
      (raw.promised_pickup_at !== null &&
        typeof raw.promised_pickup_at !== "string") ||
      !isStatus(raw.status) ||
      !Number.isInteger(raw.status_version) ||
      !isFiniteNumber(raw.subtotal) ||
      !isFiniteNumber(raw.tax_gst) ||
      !isFiniteNumber(raw.tax_qst) ||
      !isFiniteNumber(raw.total) ||
      typeof raw.created_at !== "string" ||
      typeof raw.updated_at !== "string"
    ) {
      throw new Error("Invalid admin order response.");
    }
    return {
      id: raw.id,
      order_number: raw.order_number,
      customer_name: raw.customer_name,
      customer_phone: raw.customer_phone,
      pickup_time: raw.pickup_time as string | null,
      promised_pickup_at: raw.promised_pickup_at as string | null,
      status: raw.status,
      status_version: raw.status_version as number,
      subtotal: raw.subtotal,
      tax_gst: raw.tax_gst,
      tax_qst: raw.tax_qst,
      total: raw.total,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      order_items: items,
    };
  });

  return {
    orders: sortAdminOrders(orders),
    orderingEnabled: value.orderingEnabled,
    localDate: value.localDate,
    refreshedAt: value.refreshedAt,
  };
}

function timestamp(value: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

export function sortAdminOrders(orders: AdminOrder[]): AdminOrder[] {
  return [...orders].sort((left, right) => {
    const promiseDifference =
      timestamp(left.promised_pickup_at ?? left.pickup_time) -
      timestamp(right.promised_pickup_at ?? right.pickup_time);
    if (promiseDifference !== 0) return promiseDifference;
    const createdDifference = timestamp(left.created_at) - timestamp(right.created_at);
    if (createdDifference !== 0) return createdDifference;
    return left.id.localeCompare(right.id);
  });
}

export function reconcileAdminOrders(
  current: AdminOrder[],
  incoming: AdminOrder[],
): AdminOrder[] {
  const currentById = new Map(current.map((order) => [order.id, order]));
  const incomingById = new Map<string, AdminOrder>();
  for (const order of incoming) {
    const duplicate = incomingById.get(order.id);
    if (!duplicate || order.status_version >= duplicate.status_version) {
      incomingById.set(order.id, order);
    }
  }
  const reconciled = [...incomingById.values()].map((order) => {
    const existing = currentById.get(order.id);
    return existing && existing.status_version > order.status_version
      ? existing
      : order;
  });
  return sortAdminOrders(reconciled);
}

export function shouldApplyAdminSnapshot(
  lastAppliedRequest: number,
  responseRequest: number,
): boolean {
  return responseRequest >= lastAppliedRequest;
}

export function getAdminConnectionState(
  transport: AdminTransportState,
  lastSuccessfulRefresh: number | null,
  now: number,
): AdminConnectionState {
  if (
    lastSuccessfulRefresh === null ||
    now - lastSuccessfulRefresh >= ADMIN_STALE_AFTER_MS
  ) {
    return "stale";
  }
  return transport;
}

export function getAdminPollInterval(
  state: AdminConnectionState,
): number {
  return state === "live" ? ADMIN_LIVE_POLL_MS : ADMIN_DEGRADED_POLL_MS;
}

export function canTransitionOrders(state: AdminConnectionState): boolean {
  return state === "live" || state === "polling";
}

export async function reconcileAfterAdminMutation(
  boardReconcile: (() => Promise<unknown> | void) | undefined,
  routeRefresh: () => void,
) {
  if (boardReconcile) {
    await boardReconcile();
    return;
  }
  routeRefresh();
}
