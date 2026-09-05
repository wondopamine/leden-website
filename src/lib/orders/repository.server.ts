import "server-only";

import type { Json } from "../supabase/database.types";
import { SUPABASE_REQUEST_TIMEOUT_MS } from "../supabase/bounded-fetch.server";
import { createPrivilegedClient } from "../supabase/privileged.server";
import {
  OrderBoundaryError,
  mapDatabaseError,
} from "./errors";
import type {
  CanonicalCreateMaterial,
  CreateOrderInput,
} from "./contracts";
import {
  constantTimeHexEqual,
  fingerprintCreateMaterial,
  normalizeDatabaseBytea,
  postgresBytea,
} from "./tracking.server";

export type OrderStatus =
  | "new"
  | "preparing"
  | "ready"
  | "picked_up"
  | "cancelled";

type ReceiptModifier = {
  modifier_name: string;
  option_name: string;
  price_adjustment: number;
};

type ReceiptItem = {
  name: string;
  base_price: number;
  modifier_total: number;
  unit_price: number;
  quantity: number;
  line_total: number;
  modifiers: ReceiptModifier[];
};

export type OrderReceipt = {
  receipt_id: string;
  order_number: string;
  status: OrderStatus;
  status_version: number;
  promised_pickup_at: string;
  subtotal: number;
  tax_gst: number;
  tax_qst: number;
  total: number;
  gst_rate: number;
  qst_rate: number;
  created_at: string;
  items: ReceiptItem[];
};

export type OrderStatusProjection = {
  order_number: string;
  status: OrderStatus;
  status_version: number;
  promised_pickup_at: string;
  updated_at: string;
  cafe: { address: string | null; phone: string | null };
};

type RatePurpose = "create" | "status" | "recovery";
type PrivilegedClient = ReturnType<typeof createPrivilegedClient>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStatus(value: unknown): value is OrderStatus {
  return (
    value === "new" ||
    value === "preparing" ||
    value === "ready" ||
    value === "picked_up" ||
    value === "cancelled"
  );
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseReceipt(value: unknown): OrderReceipt {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new OrderBoundaryError("DEPENDENCY_UNAVAILABLE", 503);
  }
  const items = value.items.map((raw): ReceiptItem => {
    if (!isRecord(raw) || !Array.isArray(raw.modifiers)) {
      throw new OrderBoundaryError("DEPENDENCY_UNAVAILABLE", 503);
    }
    const modifiers = raw.modifiers.map((modifier): ReceiptModifier => {
      if (!isRecord(modifier)) {
        throw new OrderBoundaryError("DEPENDENCY_UNAVAILABLE", 503);
      }
      const adjustment = finiteNumber(modifier.price_adjustment);
      if (
        typeof modifier.modifier_name !== "string" ||
        typeof modifier.option_name !== "string" ||
        adjustment === null
      ) {
        throw new OrderBoundaryError("DEPENDENCY_UNAVAILABLE", 503);
      }
      return {
        modifier_name: modifier.modifier_name,
        option_name: modifier.option_name,
        price_adjustment: adjustment,
      };
    });
    const basePrice = finiteNumber(raw.base_price);
    const modifierTotal = finiteNumber(raw.modifier_total);
    const unitPrice = finiteNumber(raw.unit_price);
    const lineTotal = finiteNumber(raw.line_total);
    if (
      typeof raw.name !== "string" ||
      basePrice === null ||
      modifierTotal === null ||
      unitPrice === null ||
      !Number.isInteger(raw.quantity) ||
      lineTotal === null
    ) {
      throw new OrderBoundaryError("DEPENDENCY_UNAVAILABLE", 503);
    }
    return {
      name: raw.name,
      base_price: basePrice,
      modifier_total: modifierTotal,
      unit_price: unitPrice,
      quantity: raw.quantity as number,
      line_total: lineTotal,
      modifiers,
    };
  });

  const subtotal = finiteNumber(value.subtotal);
  const taxGst = finiteNumber(value.tax_gst);
  const taxQst = finiteNumber(value.tax_qst);
  const total = finiteNumber(value.total);
  const gstRate = finiteNumber(value.gst_rate);
  const qstRate = finiteNumber(value.qst_rate);
  if (
    typeof value.receipt_id !== "string" ||
    typeof value.order_number !== "string" ||
    !isStatus(value.status) ||
    !Number.isInteger(value.status_version) ||
    typeof value.promised_pickup_at !== "string" ||
    subtotal === null ||
    taxGst === null ||
    taxQst === null ||
    total === null ||
    gstRate === null ||
    qstRate === null ||
    typeof value.created_at !== "string"
  ) {
    throw new OrderBoundaryError("DEPENDENCY_UNAVAILABLE", 503);
  }
  return {
    receipt_id: value.receipt_id,
    order_number: value.order_number,
    status: value.status,
    status_version: value.status_version as number,
    promised_pickup_at: value.promised_pickup_at,
    subtotal,
    tax_gst: taxGst,
    tax_qst: taxQst,
    total,
    gst_rate: gstRate,
    qst_rate: qstRate,
    created_at: value.created_at,
    items,
  };
}

function parseStatusProjection(value: unknown): OrderStatusProjection {
  if (!isRecord(value) || !isRecord(value.cafe)) {
    throw new OrderBoundaryError("DEPENDENCY_UNAVAILABLE", 503);
  }
  if (
    typeof value.order_number !== "string" ||
    !isStatus(value.status) ||
    !Number.isInteger(value.status_version) ||
    typeof value.promised_pickup_at !== "string" ||
    typeof value.updated_at !== "string" ||
    (value.cafe.address !== null && typeof value.cafe.address !== "string") ||
    (value.cafe.phone !== null && typeof value.cafe.phone !== "string")
  ) {
    throw new OrderBoundaryError("DEPENDENCY_UNAVAILABLE", 503);
  }
  return {
    order_number: value.order_number,
    status: value.status,
    status_version: value.status_version as number,
    promised_pickup_at: value.promised_pickup_at,
    updated_at: value.updated_at,
    cafe: {
      address: value.cafe.address as string | null,
      phone: value.cafe.phone as string | null,
    },
  };
}

async function delay(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function dependencyCall<T>(
  operation: (signal: AbortSignal) => PromiseLike<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new DOMException("Supabase operation timed out", "TimeoutError"));
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      Promise.resolve().then(() => operation(controller.signal)),
      deadline,
    ]);
  } catch {
    throw new OrderBoundaryError("DEPENDENCY_UNAVAILABLE", 503);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export class OrderRepository {
  constructor(
    private readonly client: PrivilegedClient = createPrivilegedClient(),
    private readonly requestTimeoutMs = SUPABASE_REQUEST_TIMEOUT_MS,
  ) {}

  async consumeRateLimit(
    purpose: RatePurpose,
    keyHashHex: string,
    limit: number,
    windowSeconds: number,
  ): Promise<void> {
    const { data, error } = await dependencyCall(
      (signal) =>
        this.client
          .rpc("consume_order_rate_limit_v1", {
            p_purpose: purpose,
            p_key_hash: postgresBytea(keyHashHex),
            p_limit: limit,
            p_window_seconds: windowSeconds,
          })
          .abortSignal(signal),
      this.requestTimeoutMs,
    );
    if (error || !isRecord(data)) throw mapDatabaseError(error);
    if (
      typeof data.allowed !== "boolean" ||
      !Number.isInteger(data.retry_after_seconds)
    ) {
      throw new OrderBoundaryError("DEPENDENCY_UNAVAILABLE", 503);
    }
    if (!data.allowed) {
      throw new OrderBoundaryError("RATE_LIMITED", 429, {
        retryAfterSeconds: Math.max(0, data.retry_after_seconds as number),
      });
    }
  }

  async findCommittedReplay(
    attemptId: string,
    trackingHashHex: string,
    material: CanonicalCreateMaterial,
    requestTimeoutMs = this.requestTimeoutMs,
  ): Promise<OrderReceipt | null> {
    const operationDeadline = Date.now() + requestTimeoutMs;
    const { data, error } = await dependencyCall(
      (signal) =>
        this.client
          .from("orders")
          .select("request_fingerprint, tracking_token_hash")
          .eq("idempotency_key", attemptId)
          .abortSignal(signal)
          .maybeSingle(),
      requestTimeoutMs,
    );
    if (error) throw mapDatabaseError(error);
    if (!data) return null;

    const storedTracking = normalizeDatabaseBytea(data.tracking_token_hash);
    const storedFingerprint = normalizeDatabaseBytea(data.request_fingerprint);
    const expectedFingerprint = fingerprintCreateMaterial(material);
    if (
      !storedTracking ||
      !storedFingerprint ||
      !constantTimeHexEqual(storedTracking, trackingHashHex) ||
      !constantTimeHexEqual(storedFingerprint, expectedFingerprint)
    ) {
      throw new OrderBoundaryError("IDEMPOTENCY_CONFLICT", 409);
    }
    return this.recover(
      attemptId,
      trackingHashHex,
      "RECEIPT_UNCERTAIN",
      Math.max(1, operationDeadline - Date.now()),
    );
  }

  async waitForCommittedReplay(
    attemptId: string,
    trackingHashHex: string,
    material: CanonicalCreateMaterial,
    waitMilliseconds = 900,
  ): Promise<OrderReceipt | null> {
    const deadline = Date.now() + waitMilliseconds;
    do {
      const remainingMilliseconds = deadline - Date.now();
      if (remainingMilliseconds <= 0) return null;
      const receipt = await this.findCommittedReplay(
        attemptId,
        trackingHashHex,
        material,
        Math.min(this.requestTimeoutMs, remainingMilliseconds),
      );
      if (receipt) return receipt;
      const delayMilliseconds = Math.min(75, deadline - Date.now());
      if (delayMilliseconds > 0) await delay(delayMilliseconds);
    } while (Date.now() < deadline);
    return null;
  }

  async create(input: CreateOrderInput, trackingHashHex: string): Promise<OrderReceipt> {
    const items = input.items.map((item) => ({
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      option_ids: item.optionIds,
    })) as Json;
    const { data, error } = await dependencyCall(
      (signal) =>
        this.client
          .rpc("create_order_v1", {
            p_idempotency_key: input.attemptId,
            p_tracking_token_hash: postgresBytea(trackingHashHex),
            p_customer_name: input.customer.name,
            p_customer_phone: input.customer.phone,
            p_locale: input.locale,
            p_notes: input.notes,
            p_pickup_mode: input.pickup.mode,
            p_scheduled_pickup_local: input.pickup
              .scheduledLocal as unknown as string,
            p_items: items,
          })
          .abortSignal(signal),
      this.requestTimeoutMs,
    );
    if (error) throw mapDatabaseError(error);
    return parseReceipt(data);
  }

  async status(trackingHashHex: string): Promise<OrderStatusProjection | null> {
    const { data, error } = await dependencyCall(
      (signal) =>
        this.client
          .rpc("get_order_status_v1", {
            p_tracking_token_hash: postgresBytea(trackingHashHex),
          })
          .abortSignal(signal),
      this.requestTimeoutMs,
    );
    if (error) throw mapDatabaseError(error);
    return data === null ? null : parseStatusProjection(data);
  }

  async recover(
    attemptId: string,
    trackingHashHex: string,
    absentCode: "TRACKING_UNAVAILABLE" | "RECEIPT_UNCERTAIN" =
      "TRACKING_UNAVAILABLE",
    requestTimeoutMs = this.requestTimeoutMs,
  ): Promise<OrderReceipt> {
    const { data, error } = await dependencyCall(
      (signal) =>
        this.client
          .rpc("recover_order_v1", {
            p_idempotency_key: attemptId,
            p_tracking_token_hash: postgresBytea(trackingHashHex),
          })
          .abortSignal(signal),
      requestTimeoutMs,
    );
    if (error) throw mapDatabaseError(error);
    if (data === null) {
      throw new OrderBoundaryError(
        absentCode,
        absentCode === "TRACKING_UNAVAILABLE" ? 404 : 503,
      );
    }
    return parseReceipt(data);
  }
}

export function createOrderRepository() {
  return new OrderRepository();
}
