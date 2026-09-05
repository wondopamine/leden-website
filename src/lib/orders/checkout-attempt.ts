import type { PublicOrderReceipt } from "../types";

export const CHECKOUT_ATTEMPT_SESSION_KEY = "cafe-leden-checkout-attempt-v1";
export const STATUS_SESSION_PREFIX = "cafe-leden-order-status-v1:";
const PENDING_STATUS_CONTEXT_KEY = "cafe-leden-order-status-pending-v1";
const ACTIVE_STATUS_CONTEXT_KEY = "cafe-leden-order-status-active-v1";
export const CHECKOUT_CREATE_TIMEOUT_MS = 8_000;
export const CHECKOUT_RECOVERY_TIMEOUT_MS = 5_000;

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type CheckoutMaterial = {
  customer: { name: string; phone: string };
  locale: "en" | "fr";
  pickup:
    | { mode: "asap" }
    | { mode: "scheduled"; scheduledLocal: string };
  items: Array<{
    menuItemId: string;
    quantity: number;
    optionIds: string[];
  }>;
};

export type CheckoutAttempt = {
  attemptId: string;
  trackingSecret: string;
};

export type OrderStatusSession<Receipt = unknown> = {
  version: 1;
  contextId: string;
  trackingSecret: string;
  receipt: Receipt | null;
  recovered: boolean;
  createdAt: string;
};

type PersistedCheckoutAttempt = CheckoutAttempt & {
  version: 1;
  materialTag: string;
  cartTag?: string;
  cartGeneration?: number | null;
  recoveryRequired: boolean;
  acceptanceKnown: boolean;
};

export type CheckoutRecoveryAttempt = CheckoutAttempt & {
  acceptanceKnown: boolean;
  cartTag: string | null;
  cartGeneration: number | null;
};

export class CheckoutRecoveryRequiredError extends Error {
  constructor() {
    super("Checkout recovery is required before another create attempt.");
    this.name = "CheckoutRecoveryRequiredError";
  }
}

type BoundaryCode =
  | "INVALID_REQUEST"
  | "PAYLOAD_TOO_LARGE"
  | "CLIENT_REFRESH_REQUIRED"
  | "ORIGIN_FORBIDDEN"
  | "CLIENT_IDENTITY_UNAVAILABLE"
  | "RATE_LIMITED"
  | "CHALLENGE_FAILED"
  | "CHALLENGE_UNAVAILABLE"
  | "ORDERING_UNAVAILABLE"
  | "ORDERING_PAUSED"
  | "CAFE_CLOSED"
  | "PICKUP_INVALID"
  | "MENU_CHANGED"
  | "IDEMPOTENCY_CONFLICT"
  | "RECEIPT_UNCERTAIN"
  | "TRACKING_UNAVAILABLE"
  | "DEPENDENCY_UNAVAILABLE"
  | "INTERNAL_ERROR";

type SafeBoundaryError = {
  code: BoundaryCode;
  retryAfterSeconds?: number;
};

export type CheckoutSubmissionResult<Receipt = unknown> =
  | { kind: "accepted"; receipt: Receipt }
  | { kind: "recovered"; receipt: Receipt }
  | { kind: "confirmed-not-found"; attempt: CheckoutAttempt }
  | { kind: "still-uncertain" }
  | { kind: "rejected"; error: SafeBoundaryError };

type SubmissionPhase = "submitting" | "checking" | "recovered";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRACKING_SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function safeStorageGet(storage: StorageLike, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageRemove(storage: StorageLike, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    // Storage can be unavailable in privacy modes. Removal is best effort.
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function canonicalizeMaterial(material: CheckoutMaterial): string {
  const items = canonicalizeCart(material.items);
  return JSON.stringify({
    customer: {
      name: material.customer.name.trim(),
      phone: material.customer.phone.trim(),
    },
    locale: material.locale,
    pickup: material.pickup,
    items,
  });
}

function canonicalizeCart(items: CheckoutMaterial["items"]) {
  return items
    .map((item) => ({
      menuItemId: item.menuItemId.toLowerCase(),
      quantity: item.quantity,
      optionIds: item.optionIds.map((id) => id.toLowerCase()).sort(),
    }))
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right), "en"),
    );
}

async function createAttemptTag(
  trackingSecret: string,
  value: string,
): Promise<string> {
  const secretBytes = base64UrlToBytes(trackingSecret);
  const secretKeyData = secretBytes.buffer.slice(
    secretBytes.byteOffset,
    secretBytes.byteOffset + secretBytes.byteLength,
  ) as ArrayBuffer;
  const key = await crypto.subtle.importKey(
    "raw",
    secretKeyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

function createMaterialTag(
  trackingSecret: string,
  material: CheckoutMaterial,
): Promise<string> {
  return createAttemptTag(trackingSecret, canonicalizeMaterial(material));
}

function createCartTag(
  trackingSecret: string,
  items: CheckoutMaterial["items"],
): Promise<string> {
  return createAttemptTag(
    trackingSecret,
    JSON.stringify(canonicalizeCart(items)),
  );
}

function readPersistedAttempt(storage: StorageLike): PersistedCheckoutAttempt | null {
  const raw = safeStorageGet(storage, CHECKOUT_ATTEMPT_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedCheckoutAttempt>;
    if (
      parsed.version !== 1 ||
      typeof parsed.attemptId !== "string" ||
      !UUID_PATTERN.test(parsed.attemptId) ||
      typeof parsed.trackingSecret !== "string" ||
      !TRACKING_SECRET_PATTERN.test(parsed.trackingSecret) ||
      typeof parsed.materialTag !== "string" ||
      (parsed.cartTag !== undefined &&
        (typeof parsed.cartTag !== "string" ||
          !TRACKING_SECRET_PATTERN.test(parsed.cartTag))) ||
      (parsed.cartGeneration !== undefined &&
        parsed.cartGeneration !== null &&
        (typeof parsed.cartGeneration !== "number" ||
          !Number.isSafeInteger(parsed.cartGeneration) ||
          parsed.cartGeneration < 0)) ||
      (parsed.recoveryRequired !== undefined &&
        typeof parsed.recoveryRequired !== "boolean") ||
      (parsed.acceptanceKnown !== undefined &&
        typeof parsed.acceptanceKnown !== "boolean")
    ) {
      safeStorageRemove(storage, CHECKOUT_ATTEMPT_SESSION_KEY);
      return null;
    }
    return {
      ...(parsed as PersistedCheckoutAttempt),
      recoveryRequired: parsed.recoveryRequired === true,
      acceptanceKnown: parsed.acceptanceKnown === true,
    };
  } catch {
    safeStorageRemove(storage, CHECKOUT_ATTEMPT_SESSION_KEY);
    return null;
  }
}

export async function ensureCheckoutAttempt(
  material: CheckoutMaterial,
  storage: StorageLike = window.sessionStorage,
  cartGeneration: number | null = null,
): Promise<CheckoutAttempt> {
  const existing = readPersistedAttempt(storage);
  if (existing) {
    if (existing.recoveryRequired) {
      throw new CheckoutRecoveryRequiredError();
    }
    const materialTag = await createMaterialTag(existing.trackingSecret, material);
    if (
      materialTag === existing.materialTag &&
      (existing.cartGeneration ?? null) === cartGeneration
    ) {
      return {
        attemptId: existing.attemptId,
        trackingSecret: existing.trackingSecret,
      };
    }
  }

  const secretBytes = crypto.getRandomValues(new Uint8Array(32));
  const next: PersistedCheckoutAttempt = {
    version: 1,
    attemptId: crypto.randomUUID(),
    trackingSecret: bytesToBase64Url(secretBytes),
    materialTag: "",
    cartGeneration,
    recoveryRequired: false,
    acceptanceKnown: false,
  };
  next.materialTag = await createMaterialTag(next.trackingSecret, material);
  next.cartTag = await createCartTag(next.trackingSecret, material.items);
  storage.setItem(CHECKOUT_ATTEMPT_SESSION_KEY, JSON.stringify(next));
  return { attemptId: next.attemptId, trackingSecret: next.trackingSecret };
}

export function clearCheckoutAttempt(
  attemptId: string,
  storage: StorageLike = window.sessionStorage,
) {
  const current = readPersistedAttempt(storage);
  if (current?.attemptId === attemptId) {
    safeStorageRemove(storage, CHECKOUT_ATTEMPT_SESSION_KEY);
  }
}

export function getCheckoutRecoveryAttempt(
  storage: StorageLike = window.sessionStorage,
): CheckoutRecoveryAttempt | null {
  const current = readPersistedAttempt(storage);
  if (!current?.recoveryRequired) return null;
  return {
    attemptId: current.attemptId,
    trackingSecret: current.trackingSecret,
    acceptanceKnown: current.acceptanceKnown,
    cartTag: current.cartTag ?? null,
    cartGeneration: current.cartGeneration ?? null,
  };
}

export async function checkoutAttemptOwnsCart(
  attempt: CheckoutRecoveryAttempt,
  items: CheckoutMaterial["items"],
  cartGeneration: number,
): Promise<boolean> {
  if (
    !attempt.cartTag ||
    attempt.cartGeneration === null ||
    attempt.cartGeneration !== cartGeneration
  ) {
    return false;
  }
  return (
    (await createCartTag(attempt.trackingSecret, items)) === attempt.cartTag
  );
}

function updateCheckoutRecoveryState(
  attemptId: string,
  input: { recoveryRequired: boolean; acceptanceKnown: boolean },
  storage: StorageLike,
): boolean {
  const current = readPersistedAttempt(storage);
  if (!current || current.attemptId !== attemptId) return false;
  try {
    storage.setItem(
      CHECKOUT_ATTEMPT_SESSION_KEY,
      JSON.stringify({ ...current, ...input }),
    );
    return true;
  } catch {
    return false;
  }
}

export function requireCheckoutRecovery(
  attemptId: string,
  acceptanceKnown: boolean,
  storage: StorageLike = window.sessionStorage,
): boolean {
  return updateCheckoutRecoveryState(
    attemptId,
    { recoveryRequired: true, acceptanceKnown },
    storage,
  );
}

export function allowCheckoutRetry(
  attemptId: string,
  storage: StorageLike = window.sessionStorage,
): boolean {
  return updateCheckoutRecoveryState(
    attemptId,
    { recoveryRequired: false, acceptanceKnown: false },
    storage,
  );
}

function statusSessionKey(contextId: string) {
  return `${STATUS_SESSION_PREFIX}${contextId}`;
}

function readStatusSession<Receipt>(
  storage: StorageLike,
  contextId: string | null,
): OrderStatusSession<Receipt> | null {
  if (!contextId || !UUID_PATTERN.test(contextId)) return null;
  const raw = safeStorageGet(storage, statusSessionKey(contextId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OrderStatusSession<Receipt>>;
    if (
      parsed.version !== 1 ||
      parsed.contextId !== contextId ||
      typeof parsed.trackingSecret !== "string" ||
      !TRACKING_SECRET_PATTERN.test(parsed.trackingSecret) ||
      typeof parsed.recovered !== "boolean" ||
      typeof parsed.createdAt !== "string"
    ) {
      return null;
    }
    return parsed as OrderStatusSession<Receipt>;
  } catch {
    return null;
  }
}

export function saveOrderStatusSession<Receipt>(
  storage: StorageLike,
  input: {
    trackingSecret: string;
    receipt: Receipt;
    recovered: boolean;
  },
): OrderStatusSession<Receipt> {
  const session: OrderStatusSession<Receipt> = {
    version: 1,
    contextId: crypto.randomUUID(),
    trackingSecret: input.trackingSecret,
    receipt: input.receipt,
    recovered: input.recovered,
    createdAt: new Date().toISOString(),
  };
  try {
    storage.setItem(statusSessionKey(session.contextId), JSON.stringify(session));
    storage.setItem(PENDING_STATUS_CONTEXT_KEY, session.contextId);
    storage.setItem(ACTIVE_STATUS_CONTEXT_KEY, session.contextId);
  } catch (error) {
    safeStorageRemove(storage, statusSessionKey(session.contextId));
    safeStorageRemove(storage, PENDING_STATUS_CONTEXT_KEY);
    safeStorageRemove(storage, ACTIVE_STATUS_CONTEXT_KEY);
    throw error;
  }
  return session;
}

export function resolveOrderStatusSession<Receipt>(
  storage: StorageLike,
  input: {
    fragment: string;
    historyContextId?: string | null;
  },
): { session: OrderStatusSession<Receipt>; consumedFragment: boolean } | null {
  const fragment = input.fragment.replace(/^#/, "");
  if (TRACKING_SECRET_PATTERN.test(fragment)) {
    const pendingId = safeStorageGet(storage, PENDING_STATUS_CONTEXT_KEY);
    const pending = readStatusSession<Receipt>(storage, pendingId);
    safeStorageRemove(storage, PENDING_STATUS_CONTEXT_KEY);
    if (pending?.trackingSecret === fragment) {
      storage.setItem(ACTIVE_STATUS_CONTEXT_KEY, pending.contextId);
      return { session: pending, consumedFragment: true };
    }

    const historySession = readStatusSession<Receipt>(
      storage,
      input.historyContextId ?? null,
    );
    if (historySession?.trackingSecret === fragment) {
      storage.setItem(ACTIVE_STATUS_CONTEXT_KEY, historySession.contextId);
      return { session: historySession, consumedFragment: true };
    }

    const activeSession = readStatusSession<Receipt>(
      storage,
      safeStorageGet(storage, ACTIVE_STATUS_CONTEXT_KEY),
    );
    if (activeSession?.trackingSecret === fragment) {
      return { session: activeSession, consumedFragment: true };
    }

    const session: OrderStatusSession<Receipt> = {
      version: 1,
      contextId: crypto.randomUUID(),
      trackingSecret: fragment,
      receipt: null,
      recovered: false,
      createdAt: new Date().toISOString(),
    };
    storage.setItem(statusSessionKey(session.contextId), JSON.stringify(session));
    storage.setItem(ACTIVE_STATUS_CONTEXT_KEY, session.contextId);
    return { session, consumedFragment: true };
  }

  if (input.fragment.length > 0) return null;

  const historySession = readStatusSession<Receipt>(
    storage,
    input.historyContextId ?? null,
  );
  if (historySession) return { session: historySession, consumedFragment: false };

  const active = readStatusSession<Receipt>(
    storage,
    safeStorageGet(storage, ACTIVE_STATUS_CONTEXT_KEY),
  );
  return active ? { session: active, consumedFragment: false } : null;
}

export function removeOrderStatusSession(
  storage: StorageLike,
  contextId: string,
) {
  safeStorageRemove(storage, statusSessionKey(contextId));
  if (safeStorageGet(storage, ACTIVE_STATUS_CONTEXT_KEY) === contextId) {
    safeStorageRemove(storage, ACTIVE_STATUS_CONTEXT_KEY);
  }
  if (safeStorageGet(storage, PENDING_STATUS_CONTEXT_KEY) === contextId) {
    safeStorageRemove(storage, PENDING_STATUS_CONTEXT_KEY);
  }
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requestJsonWithDeadline(
  fetcher: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<{ response: Response; payload: unknown }> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new DOMException("Checkout request timed out", "TimeoutError"));
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      fetcher(input, { ...init, signal: controller.signal }),
      deadline,
    ]);
    const payload = await Promise.race([safeJson(response), deadline]);
    return { response, payload };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function readError(value: unknown): SafeBoundaryError | null {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return null;
  }
  const error = (value as { error?: unknown }).error;
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }
  const code = (error as { code?: unknown }).code;
  if (typeof code !== "string") return null;
  const retryAfterSeconds = (error as { retryAfterSeconds?: unknown })
    .retryAfterSeconds;
  return {
    code: code as BoundaryCode,
    ...(typeof retryAfterSeconds === "number" &&
    Number.isFinite(retryAfterSeconds)
      ? { retryAfterSeconds }
      : {}),
  };
}

function readReceipt<Receipt>(value: unknown): Receipt | null {
  if (typeof value !== "object" || value === null || !("receipt" in value)) {
    return null;
  }
  const receipt = (value as { receipt?: unknown }).receipt;
  return isPublicOrderReceipt(receipt) ? (receipt as unknown as Receipt) : null;
}

export function isPublicOrderReceipt(
  receipt: unknown,
): receipt is PublicOrderReceipt {
  if (!isRecord(receipt)) return false;
  const status = receipt.status;
  if (
    typeof receipt.receipt_id !== "string" ||
    typeof receipt.order_number !== "string" ||
    (status !== "new" &&
      status !== "preparing" &&
      status !== "ready" &&
      status !== "picked_up" &&
      status !== "cancelled") ||
    !Number.isInteger(receipt.status_version) ||
    typeof receipt.promised_pickup_at !== "string" ||
    typeof receipt.created_at !== "string" ||
    !isFiniteNumber(receipt.subtotal) ||
    !isFiniteNumber(receipt.tax_gst) ||
    !isFiniteNumber(receipt.tax_qst) ||
    !isFiniteNumber(receipt.total) ||
    !isFiniteNumber(receipt.gst_rate) ||
    !isFiniteNumber(receipt.qst_rate) ||
    !Array.isArray(receipt.items) ||
    !receipt.items.every(isReceiptItem)
  ) {
    return false;
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isReceiptItem(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.modifiers)) return false;
  return (
    typeof value.name === "string" &&
    Number.isInteger(value.quantity) &&
    (value.quantity as number) > 0 &&
    isFiniteNumber(value.base_price) &&
    isFiniteNumber(value.modifier_total) &&
    isFiniteNumber(value.unit_price) &&
    isFiniteNumber(value.line_total) &&
    value.modifiers.every(
      (modifier) =>
        isRecord(modifier) &&
        typeof modifier.modifier_name === "string" &&
        typeof modifier.option_name === "string" &&
        isFiniteNumber(modifier.price_adjustment),
    )
  );
}

export type CheckoutRecoveryResult<Receipt = unknown> =
  | { kind: "recovered"; receipt: Receipt }
  | { kind: "confirmed-not-found"; attempt: CheckoutAttempt }
  | { kind: "still-uncertain" };

export async function recoverCheckoutAttempt<Receipt>(
  fetcher: typeof fetch,
  attempt: CheckoutAttempt,
  timeoutMs = CHECKOUT_RECOVERY_TIMEOUT_MS,
): Promise<CheckoutRecoveryResult<Receipt>> {
  try {
    const { response: recoveryResponse, payload: recoveryPayload } =
      await requestJsonWithDeadline(
        fetcher,
        "/api/order/recover",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId: attempt.attemptId,
            trackingSecret: attempt.trackingSecret,
          }),
        },
        timeoutMs,
      );
    if (recoveryResponse.ok) {
      const recovered = readReceipt<Receipt>(recoveryPayload);
      return recovered
        ? { kind: "recovered", receipt: recovered }
        : { kind: "still-uncertain" };
    }
    const error = readError(recoveryPayload);
    if (
      recoveryResponse.status === 404 &&
      error?.code === "TRACKING_UNAVAILABLE"
    ) {
      return { kind: "confirmed-not-found", attempt };
    }
  } catch {
    // A recovery outage cannot prove that the create failed.
  }
  return { kind: "still-uncertain" };
}

export async function runCheckoutSubmission<Receipt>({
  fetcher,
  attempt,
  createBody,
  onPhase,
  createTimeoutMs = CHECKOUT_CREATE_TIMEOUT_MS,
  recoveryTimeoutMs = CHECKOUT_RECOVERY_TIMEOUT_MS,
}: {
  fetcher: typeof fetch;
  attempt: CheckoutAttempt;
  createBody: Record<string, unknown>;
  onPhase?: (phase: SubmissionPhase) => void;
  createTimeoutMs?: number;
  recoveryTimeoutMs?: number;
}): Promise<CheckoutSubmissionResult<Receipt>> {
  onPhase?.("submitting");
  let shouldRecover = false;
  try {
    const { response: createResponse, payload: createPayload } =
      await requestJsonWithDeadline(
        fetcher,
        "/api/order",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...createBody, ...attempt }),
        },
        createTimeoutMs,
      );
    if (createResponse.ok) {
      const accepted = readReceipt<Receipt>(createPayload);
      if (accepted) return { kind: "accepted", receipt: accepted };
      shouldRecover = true;
    } else {
      const error = readError(createPayload);
      if (error?.code !== "RECEIPT_UNCERTAIN") {
        return {
          kind: "rejected",
          error: error ?? { code: "DEPENDENCY_UNAVAILABLE" },
        };
      }
      shouldRecover = true;
    }
  } catch {
    shouldRecover = true;
  }

  if (!shouldRecover) return { kind: "still-uncertain" };
  onPhase?.("checking");
  const recovery = await recoverCheckoutAttempt<Receipt>(
    fetcher,
    attempt,
    recoveryTimeoutMs,
  );
  if (recovery.kind === "recovered") {
    onPhase?.("recovered");
  }
  if (recovery.kind === "confirmed-not-found") {
    // An immediate probe cannot prove an aborted or timed-out create will not
    // still commit. Only a later, explicit recovery cycle may unlock retry.
    return { kind: "still-uncertain" };
  }
  return recovery;
}
