export type OrderErrorCode =
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

export type OrderErrorMetadata = {
  retryAfterSeconds?: number;
  ambiguousChallenge?: boolean;
};

export class OrderBoundaryError extends Error {
  readonly code: OrderErrorCode;
  readonly status: number;
  readonly metadata: OrderErrorMetadata;

  constructor(
    code: OrderErrorCode,
    status: number,
    metadata: OrderErrorMetadata = {},
  ) {
    super(`Order request failed (${code}).`);
    this.name = "OrderBoundaryError";
    this.code = code;
    this.status = status;
    this.metadata = metadata;
  }
}

const DATABASE_ERROR_MAP: Record<
  string,
  { code: OrderErrorCode; status: number }
> = {
  OLH_INVALID_INPUT: { code: "INVALID_REQUEST", status: 400 },
  OLH_IDEMPOTENCY_CONFLICT: { code: "IDEMPOTENCY_CONFLICT", status: 409 },
  OLH_TRACKING_CONFLICT: { code: "IDEMPOTENCY_CONFLICT", status: 409 },
  OLH_MENU_CHANGED: { code: "MENU_CHANGED", status: 409 },
  OLH_MODIFIER_INVALID: { code: "MENU_CHANGED", status: 409 },
  OLH_ORDERING_PAUSED: { code: "ORDERING_PAUSED", status: 409 },
  OLH_CAFE_CLOSED: { code: "CAFE_CLOSED", status: 409 },
  OLH_PICKUP_INVALID: { code: "PICKUP_INVALID", status: 400 },
  OLH_CONFIGURATION_UNAVAILABLE: {
    code: "ORDERING_UNAVAILABLE",
    status: 503,
  },
  OLH_RATE_INPUT_INVALID: { code: "DEPENDENCY_UNAVAILABLE", status: 503 },
};

export function mapDatabaseError(error: unknown): OrderBoundaryError {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : "";
  for (const [databaseCode, contract] of Object.entries(DATABASE_ERROR_MAP)) {
    if (message.includes(databaseCode)) {
      return new OrderBoundaryError(contract.code, contract.status);
    }
  }
  return new OrderBoundaryError("DEPENDENCY_UNAVAILABLE", 503);
}

export function asOrderBoundaryError(error: unknown): OrderBoundaryError {
  return error instanceof OrderBoundaryError
    ? error
    : new OrderBoundaryError("INTERNAL_ERROR", 500);
}

export const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
} as const;

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  for (const [name, value] of Object.entries(PRIVATE_RESPONSE_HEADERS)) {
    headers.set(name, value);
  }
  headers.set("Content-Type", "application/json; charset=utf-8");
  return Response.json(body, { ...init, headers });
}

export function errorResponse(error: OrderBoundaryError): Response {
  const retryAfterSeconds = error.metadata.retryAfterSeconds;
  const headers = new Headers();
  if (retryAfterSeconds !== undefined) {
    headers.set("Retry-After", String(retryAfterSeconds));
  }
  return jsonResponse(
    {
      error: {
        code: error.code,
        ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
      },
    },
    { status: error.status, headers },
  );
}

export function logSafeOrderFailure(
  boundary: "create" | "status" | "recovery",
  error: OrderBoundaryError,
) {
  console.error("Order boundary failure", {
    boundary,
    code: error.code,
    status: error.status,
  });
}
