import { OrderBoundaryError } from "./errors";

export const MAX_ORDER_BODY_BYTES = 16_384;
export const MAX_TRACKING_BODY_BYTES = 1_024;
export const MAX_ORDER_LINES = 50;
export const MAX_LINE_QUANTITY = 20;
export const MAX_TOTAL_QUANTITY = 100;
export const MAX_OPTIONS_PER_LINE = 20;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRACKING_SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const LEGACY_TOP_LEVEL_FIELDS = new Set([
  "total",
  "customerInfo",
  "pickupTime",
  "orderNumber",
]);
const LEGACY_LINE_FIELDS = new Set([
  "id",
  "name",
  "nameEn",
  "nameFr",
  "price",
  "priceAdjustment",
  "modifiers",
  "option",
]);

export type CreateOrderLine = {
  menuItemId: string;
  quantity: number;
  optionIds: string[];
};

export type CreateOrderInput = {
  attemptId: string;
  trackingSecret: string;
  customer: { name: string; phone: string };
  locale: "en" | "fr";
  notes: string;
  pickup:
    | { mode: "asap"; scheduledLocal: null }
    | { mode: "scheduled"; scheduledLocal: string };
  items: CreateOrderLine[];
  turnstileToken: string;
};

export type CanonicalCreateMaterial = {
  version: 1;
  tracking_hash: string;
  customer_name: string;
  customer_phone: string;
  locale: "en" | "fr";
  notes: string;
  pickup_mode: "asap" | "scheduled";
  scheduled_pickup_local: string | null;
  items: Array<{
    menu_item_id: string;
    quantity: number;
    option_ids: string[];
  }>;
};

function invalid(
  code: "INVALID_REQUEST" | "CLIENT_REFRESH_REQUIRED" = "INVALID_REQUEST",
): never {
  throw new OrderBoundaryError(code, code === "CLIENT_REFRESH_REQUIRED" ? 409 : 400);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  legacy: ReadonlySet<string> = new Set(),
) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      invalid(legacy.has(key) ? "CLIENT_REFRESH_REQUIRED" : "INVALID_REQUEST");
    }
  }
}

function requiredTrimmedString(
  value: unknown,
  min: number,
  max: number,
): string {
  if (typeof value !== "string") invalid();
  const normalized = value.trim();
  if (
    normalized.length < min ||
    normalized.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(normalized)
  ) {
    invalid();
  }
  return normalized;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isTrackingSecret(value: unknown): value is string {
  return typeof value === "string" && TRACKING_SECRET_PATTERN.test(value);
}

function parseTrackingSecret(value: unknown): string {
  if (!isTrackingSecret(value)) invalid();
  return value;
}

function parseLine(value: unknown): CreateOrderLine {
  if (!isRecord(value)) invalid();
  assertOnlyKeys(
    value,
    ["menuItemId", "quantity", "optionIds"],
    LEGACY_LINE_FIELDS,
  );
  if (!isUuid(value.menuItemId)) invalid();
  if (
    !Number.isInteger(value.quantity) ||
    (value.quantity as number) < 1 ||
    (value.quantity as number) > MAX_LINE_QUANTITY
  ) {
    invalid();
  }
  if (
    !Array.isArray(value.optionIds) ||
    value.optionIds.length > MAX_OPTIONS_PER_LINE ||
    value.optionIds.some((id) => !isUuid(id))
  ) {
    invalid();
  }
  if (new Set(value.optionIds).size !== value.optionIds.length) invalid();
  return {
    menuItemId: value.menuItemId.toLowerCase(),
    quantity: value.quantity as number,
    optionIds: (value.optionIds as string[]).map((id) => id.toLowerCase()),
  };
}

export function parseCreateOrderRequest(value: unknown): CreateOrderInput {
  if (!isRecord(value)) invalid();
  assertOnlyKeys(
    value,
    [
      "attemptId",
      "trackingSecret",
      "customer",
      "locale",
      "notes",
      "pickup",
      "items",
      "turnstileToken",
    ],
    LEGACY_TOP_LEVEL_FIELDS,
  );
  if (!isUuid(value.attemptId)) invalid();
  const trackingSecret = parseTrackingSecret(value.trackingSecret);

  if (!isRecord(value.customer)) invalid();
  assertOnlyKeys(value.customer, ["name", "phone"]);
  const name = requiredTrimmedString(value.customer.name, 1, 100);
  const phone = requiredTrimmedString(value.customer.phone, 7, 32);
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 7 || phoneDigits.length > 15) invalid();

  if (value.locale !== "en" && value.locale !== "fr") invalid();
  const notes =
    value.notes === undefined || value.notes === null
      ? ""
      : requiredTrimmedString(value.notes, 0, 500);

  if (!isRecord(value.pickup)) invalid();
  if (value.pickup.mode === "asap") {
    assertOnlyKeys(value.pickup, ["mode"]);
  } else if (value.pickup.mode === "scheduled") {
    assertOnlyKeys(value.pickup, ["mode", "scheduledLocal"]);
    if (typeof value.pickup.scheduledLocal !== "string") invalid();
  } else {
    invalid();
  }

  if (
    !Array.isArray(value.items) ||
    value.items.length < 1 ||
    value.items.length > MAX_ORDER_LINES
  ) {
    invalid();
  }
  const items = value.items.map(parseLine);
  if (items.reduce((sum, item) => sum + item.quantity, 0) > MAX_TOTAL_QUANTITY) {
    invalid();
  }
  const turnstileToken = requiredTrimmedString(value.turnstileToken, 1, 2_048);

  return {
    attemptId: value.attemptId.toLowerCase(),
    trackingSecret,
    customer: { name, phone },
    locale: value.locale,
    notes,
    pickup:
      value.pickup.mode === "asap"
        ? { mode: "asap", scheduledLocal: null }
        : { mode: "scheduled", scheduledLocal: value.pickup.scheduledLocal as string },
    items,
    turnstileToken,
  };
}

export function canonicalizeCreateMaterial(
  input: CreateOrderInput,
  trackingHashHex: string,
): CanonicalCreateMaterial {
  const items = input.items
    .map((line) => ({
      menu_item_id: line.menuItemId.toLowerCase(),
      quantity: line.quantity,
      option_ids: line.optionIds.map((id) => id.toLowerCase()).sort(),
    }))
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right), "en"),
    );
  return {
    version: 1,
    tracking_hash: trackingHashHex,
    customer_name: input.customer.name,
    customer_phone: input.customer.phone,
    locale: input.locale,
    notes: input.notes,
    pickup_mode: input.pickup.mode,
    scheduled_pickup_local: input.pickup.scheduledLocal,
    items,
  };
}

export function parseStatusRequest(value: unknown): { trackingSecret: string } {
  if (!isRecord(value)) invalid();
  assertOnlyKeys(value, ["trackingSecret"]);
  return { trackingSecret: parseTrackingSecret(value.trackingSecret) };
}

export function parseRecoveryRequest(value: unknown): {
  attemptId: string;
  trackingSecret: string;
} {
  if (!isRecord(value)) invalid();
  assertOnlyKeys(value, ["attemptId", "trackingSecret"]);
  if (!isUuid(value.attemptId)) invalid();
  return {
    attemptId: value.attemptId.toLowerCase(),
    trackingSecret: parseTrackingSecret(value.trackingSecret),
  };
}

export async function readBoundedJson(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "application/json") invalid();

  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      throw new OrderBoundaryError("PAYLOAD_TOO_LARGE", 413);
    }
  }
  const body = request.body;
  if (!body) invalid();

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > maxBytes) {
      await reader.cancel();
      throw new OrderBoundaryError("PAYLOAD_TOO_LARGE", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    invalid();
  }
  try {
    return JSON.parse(text!);
  } catch {
    invalid();
  }
}
