import "server-only";

import type { Json } from "../supabase/database.types";
import { requireStaff } from "../supabase/admin.server";
import {
  sortAdminOrders,
  type AdminOrder,
  type AdminOrderItem,
  type AdminOrderModifier,
  type AdminOrdersSnapshot,
  type AdminOrderStatus,
} from "./admin-realtime";

const CAFE_TIME_ZONE = "America/Toronto";
const ACTIVE_STATUSES: AdminOrderStatus[] = ["new", "preparing", "ready"];
const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StaffClient = Awaited<ReturnType<typeof requireStaff>>["supabase"];

export class AdminOrdersError extends Error {
  readonly code = "ADMIN_ORDERS_UNAVAILABLE";
  readonly status = 503;

  constructor() {
    super("Admin orders are temporarily unavailable.");
    this.name = "AdminOrdersError";
  }
}

export type AdminTransitionInput = {
  orderId: string;
  expectedStatus: AdminOrderStatus;
  expectedVersion: number;
  newStatus: AdminOrderStatus;
};

export type AdminTransitionResult =
  | {
      ok: true;
      order: {
        id: string;
        status: AdminOrderStatus;
        statusVersion: number;
        updatedAt: string;
      };
    }
  | {
      ok: false;
      code:
        | "INVALID_TRANSITION"
        | "ORDER_CONFLICT"
        | "ORDER_UPDATE_UNAVAILABLE";
      current?: {
        status: AdminOrderStatus;
        statusVersion: number;
        updatedAt: string;
      };
    };

export type AdminMenuItemGraph = {
  category_id: string;
  name_en: string;
  name_fr: string;
  description_en: string;
  description_fr: string;
  price: string;
  status: "available" | "sold_out" | "hidden";
  image_url: string | null;
  sort_order?: number;
};

export type AdminMenuModifierGraph = {
  name_en: string;
  name_fr: string;
  min_selections: 0 | 1;
  max_selections: 1;
  options: {
    name_en: string;
    name_fr: string;
    price_adjustment: string;
    available: boolean;
  }[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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

function localDateAt(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAFE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function parseLocalDate(value: string) {
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return { year: Number(year), month: Number(month), day: Number(day) };
}

function addLocalDays(localDate: string, days: number): string {
  const parsed = parseLocalDate(localDate);
  if (!parsed) throw new AdminOrdersError();
  const date = new Date(
    Date.UTC(parsed.year, parsed.month - 1, parsed.day + days),
  );
  return `${date.getUTCFullYear().toString().padStart(4, "0")}-${(date.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}-${date.getUTCDate().toString().padStart(2, "0")}`;
}

function timeZoneOffsetMilliseconds(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAFE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const renderedAsUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );
  return renderedAsUtc - date.getTime();
}

function localMidnightUtc(localDate: string): Date {
  const parsed = parseLocalDate(localDate);
  if (!parsed) throw new AdminOrdersError();
  const wallClockUtc = Date.UTC(parsed.year, parsed.month - 1, parsed.day);
  const firstGuess = new Date(wallClockUtc);
  const candidate = new Date(
    wallClockUtc - timeZoneOffsetMilliseconds(firstGuess),
  );
  return new Date(wallClockUtc - timeZoneOffsetMilliseconds(candidate));
}

export function getTorontoDayBounds(now: Date = new Date()) {
  return getTorontoDayBoundsForDate(localDateAt(now));
}

export function getTorontoDayBoundsForDate(localDate: string) {
  if (!parseLocalDate(localDate)) throw new AdminOrdersError();
  return {
    localDate,
    start: localMidnightUtc(localDate).toISOString(),
    end: localMidnightUtc(addLocalDays(localDate, 1)).toISOString(),
  };
}

function parseModifier(value: unknown): AdminOrderModifier {
  if (!isRecord(value)) throw new AdminOrdersError();
  const name = value.name ?? value.modifier_name;
  const option = value.option ?? value.option_name;
  const priceAdjustment = finiteNumber(
    value.priceAdjustment ?? value.price_adjustment,
  );
  if (
    typeof name !== "string" ||
    typeof option !== "string" ||
    priceAdjustment === null
  ) {
    throw new AdminOrdersError();
  }
  return { name, option, priceAdjustment };
}

function parseItem(value: unknown): AdminOrderItem {
  if (!isRecord(value) || !Array.isArray(value.modifiers)) {
    throw new AdminOrdersError();
  }
  const price = finiteNumber(value.price);
  if (
    typeof value.id !== "string" ||
    typeof value.menu_item_name !== "string" ||
    price === null ||
    !Number.isInteger(value.quantity) ||
    (value.quantity as number) < 1
  ) {
    throw new AdminOrdersError();
  }
  return {
    id: value.id,
    menu_item_name: value.menu_item_name,
    price,
    quantity: value.quantity as number,
    modifiers: value.modifiers.map(parseModifier),
  };
}

function parseOrder(value: unknown): AdminOrder {
  if (!isRecord(value) || !Array.isArray(value.order_items)) {
    throw new AdminOrdersError();
  }
  const subtotal = finiteNumber(value.subtotal);
  const taxGst = finiteNumber(value.tax_gst);
  const taxQst = finiteNumber(value.tax_qst);
  const total = finiteNumber(value.total);
  const version = value.status_version === null ? 0 : value.status_version;
  const updatedAt = value.updated_at ?? value.created_at;
  if (
    typeof value.id !== "string" ||
    typeof value.order_number !== "string" ||
    typeof value.customer_name !== "string" ||
    typeof value.customer_phone !== "string" ||
    (value.pickup_time !== null && typeof value.pickup_time !== "string") ||
    (value.promised_pickup_at !== null &&
      typeof value.promised_pickup_at !== "string") ||
    !isStatus(value.status) ||
    !Number.isInteger(version) ||
    (version as number) < 0 ||
    subtotal === null ||
    taxGst === null ||
    taxQst === null ||
    total === null ||
    typeof value.created_at !== "string" ||
    typeof updatedAt !== "string"
  ) {
    throw new AdminOrdersError();
  }
  return {
    id: value.id,
    order_number: value.order_number,
    customer_name: value.customer_name,
    customer_phone: value.customer_phone,
    pickup_time: value.pickup_time as string | null,
    promised_pickup_at: value.promised_pickup_at as string | null,
    status: value.status,
    status_version: version as number,
    subtotal,
    tax_gst: taxGst,
    tax_qst: taxQst,
    total,
    created_at: value.created_at,
    updated_at: updatedAt,
    order_items: value.order_items.map(parseItem),
  };
}

const ORDER_SELECT = `
  id,
  order_number,
  customer_name,
  customer_phone,
  pickup_time,
  promised_pickup_at,
  status,
  status_version,
  subtotal,
  tax_gst,
  tax_qst,
  total,
  created_at,
  updated_at,
  order_items(id, menu_item_name, price, quantity, modifiers)
`;

export async function listAdminOrdersWithClient(
  supabase: StaffClient,
  now: Date = new Date(),
): Promise<AdminOrdersSnapshot> {
  const bounds = getTorontoDayBounds(now);
  let ordersResult;
  let cafeResult;
  try {
    [ordersResult, cafeResult] = await Promise.all([
      supabase
        .from("orders")
        .select(ORDER_SELECT)
        .or(
          `status.in.(${ACTIVE_STATUSES.join(",")}),and(created_at.gte.${bounds.start},created_at.lt.${bounds.end})`,
        )
        .order("promised_pickup_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("cafe_info")
        .select("ordering_enabled")
        .eq("singleton", true)
        .maybeSingle(),
    ]);
  } catch {
    throw new AdminOrdersError();
  }
  if (
    ordersResult.error ||
    cafeResult.error ||
    !Array.isArray(ordersResult.data) ||
    !cafeResult.data ||
    typeof cafeResult.data.ordering_enabled !== "boolean"
  ) {
    throw new AdminOrdersError();
  }
  return {
    orders: sortAdminOrders(ordersResult.data.map(parseOrder)),
    orderingEnabled: cafeResult.data.ordering_enabled,
    localDate: bounds.localDate,
    refreshedAt: now.toISOString(),
  };
}

export async function listAdminOrders(): Promise<AdminOrdersSnapshot> {
  const { supabase } = await requireStaff();
  return listAdminOrdersWithClient(supabase);
}

export async function listAdminOrderHistory(input: {
  localDate: string;
  status?: AdminOrderStatus;
  query?: string;
}): Promise<AdminOrder[]> {
  const { supabase } = await requireStaff();
  const bounds = getTorontoDayBoundsForDate(input.localDate);
  let request = supabase
    .from("orders")
    .select(ORDER_SELECT)
    .gte("created_at", bounds.start)
    .lt("created_at", bounds.end)
    .order("created_at", { ascending: false });
  if (input.status) request = request.eq("status", input.status);
  let result;
  try {
    result = await request;
  } catch {
    throw new AdminOrdersError();
  }
  const { data, error } = result;
  if (error || !Array.isArray(data)) throw new AdminOrdersError();
  const normalized = data.map(parseOrder);
  const query = input.query?.trim().toLocaleLowerCase("en-CA");
  return query
    ? normalized.filter(
        (order) =>
          order.order_number.toLocaleLowerCase("en-CA").includes(query) ||
          order.customer_name.toLocaleLowerCase("en-CA").includes(query),
      )
    : normalized;
}

export async function getAdminOrder(orderId: string): Promise<AdminOrder | null> {
  const { supabase } = await requireStaff();
  if (!UUID_PATTERN.test(orderId)) return null;
  let result;
  try {
    result = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("id", orderId)
      .maybeSingle();
  } catch {
    throw new AdminOrdersError();
  }
  const { data, error } = result;
  if (error) throw new AdminOrdersError();
  return data ? parseOrder(data) : null;
}

const ALLOWED_TRANSITIONS: Record<AdminOrderStatus, AdminOrderStatus[]> = {
  new: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["picked_up", "cancelled"],
  picked_up: [],
  cancelled: [],
};

function validTransitionInput(input: unknown): input is AdminTransitionInput {
  return (
    isRecord(input) &&
    typeof input.orderId === "string" &&
    UUID_PATTERN.test(input.orderId) &&
    isStatus(input.expectedStatus) &&
    isStatus(input.newStatus) &&
    typeof input.expectedVersion === "number" &&
    Number.isInteger(input.expectedVersion) &&
    input.expectedVersion >= 0 &&
    ALLOWED_TRANSITIONS[input.expectedStatus].includes(input.newStatus)
  );
}

function isTransitionConflict(error: unknown): boolean {
  return (
    isRecord(error) &&
    typeof error.message === "string" &&
    error.message.includes("OLH_TRANSITION_CONFLICT")
  );
}

function isTransitionInvalid(error: unknown): boolean {
  return (
    isRecord(error) &&
    typeof error.message === "string" &&
    error.message.includes("OLH_TRANSITION_INVALID")
  );
}

async function loadCurrentTransitionState(
  supabase: StaffClient,
  orderId: string,
) {
  let result;
  try {
    result = await supabase
      .from("orders")
      .select("status, status_version, updated_at")
      .eq("id", orderId)
      .maybeSingle();
  } catch {
    return undefined;
  }
  const { data, error } = result;
  if (
    error ||
    !data ||
    !isStatus(data.status) ||
    !Number.isInteger(data.status_version) ||
    typeof data.updated_at !== "string"
  ) {
    return undefined;
  }
  return {
    status: data.status,
    statusVersion: data.status_version as number,
    updatedAt: data.updated_at,
  };
}

export async function transitionAdminOrderWithClient(
  supabase: StaffClient,
  input: unknown,
): Promise<AdminTransitionResult> {
  if (!validTransitionInput(input)) {
    return { ok: false, code: "INVALID_TRANSITION" };
  }
  let result;
  try {
    result = await supabase.rpc("transition_order_status_v1", {
      p_order_id: input.orderId,
      p_expected_status: input.expectedStatus,
      p_expected_version: input.expectedVersion,
      p_new_status: input.newStatus,
    });
  } catch {
    return { ok: false, code: "ORDER_UPDATE_UNAVAILABLE" };
  }
  const { data, error } = result;
  if (error) {
    if (isTransitionConflict(error)) {
      const current = await loadCurrentTransitionState(supabase, input.orderId);
      return { ok: false, code: "ORDER_CONFLICT", ...(current ? { current } : {}) };
    }
    if (isTransitionInvalid(error)) {
      return { ok: false, code: "INVALID_TRANSITION" };
    }
    return { ok: false, code: "ORDER_UPDATE_UNAVAILABLE" };
  }
  if (
    !isRecord(data) ||
    data.order_id !== input.orderId ||
    !isStatus(data.status) ||
    !Number.isInteger(data.status_version) ||
    typeof data.updated_at !== "string"
  ) {
    return { ok: false, code: "ORDER_UPDATE_UNAVAILABLE" };
  }
  return {
    ok: true,
    order: {
      id: data.order_id,
      status: data.status,
      statusVersion: data.status_version as number,
      updatedAt: data.updated_at,
    },
  };
}

export async function transitionAdminOrder(
  input: AdminTransitionInput,
): Promise<AdminTransitionResult> {
  const { supabase } = await requireStaff();
  return transitionAdminOrderWithClient(supabase, input);
}

export async function updateOnlineOrderingWithClient(
  supabase: StaffClient,
  enabled: boolean,
): Promise<
  | { ok: true; enabled: boolean }
  | { ok: false; code: "ORDERING_GATE_UNAVAILABLE" }
> {
  if (typeof enabled !== "boolean") {
    return { ok: false, code: "ORDERING_GATE_UNAVAILABLE" };
  }
  let result;
  try {
    result = await supabase
      .from("cafe_info")
      .update({ ordering_enabled: enabled })
      .eq("singleton", true)
      .select("ordering_enabled")
      .single();
  } catch {
    return { ok: false, code: "ORDERING_GATE_UNAVAILABLE" };
  }
  const { data, error } = result;
  if (
    error ||
    !data ||
    typeof data.ordering_enabled !== "boolean" ||
    data.ordering_enabled !== enabled
  ) {
    return { ok: false, code: "ORDERING_GATE_UNAVAILABLE" };
  }
  return { ok: true, enabled: data.ordering_enabled };
}

export async function updateOnlineOrdering(enabled: boolean) {
  const { supabase } = await requireStaff();
  return updateOnlineOrderingWithClient(supabase, enabled);
}

export async function saveMenuItemGraphWithClient(
  supabase: Pick<StaffClient, "rpc">,
  menuItemId: string,
  item: AdminMenuItemGraph,
  modifiers: AdminMenuModifierGraph[],
): Promise<string> {
  if (!UUID_PATTERN.test(menuItemId)) throw new AdminOrdersError();
  let result;
  try {
    result = await supabase.rpc("save_menu_item_graph_v1", {
      p_menu_item_id: menuItemId,
      p_item: item as Json,
      p_modifiers: modifiers as Json,
    });
  } catch {
    throw new AdminOrdersError();
  }
  const { data, error } = result;
  if (error || data !== menuItemId) throw new AdminOrdersError();
  return data;
}

export async function createMenuItemGraphWithClient(
  supabase: Pick<StaffClient, "rpc">,
  menuItemId: string,
  item: AdminMenuItemGraph,
  modifiers: AdminMenuModifierGraph[],
): Promise<string> {
  if (!UUID_PATTERN.test(menuItemId)) throw new AdminOrdersError();
  let result;
  try {
    result = await supabase.rpc("create_menu_item_graph_v1", {
      p_menu_item_id: menuItemId,
      p_item: item as Json,
      p_modifiers: modifiers as Json,
    });
  } catch {
    throw new AdminOrdersError();
  }
  const { data, error } = result;
  if (error || data !== menuItemId) throw new AdminOrdersError();
  return data;
}
