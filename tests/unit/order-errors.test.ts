import { describe, expect, it } from "vitest";

import {
  OrderBoundaryError,
  errorResponse,
  mapDatabaseError,
} from "../../src/lib/orders/errors";

describe("order boundary errors", () => {
  it.each([
    ["OLH_IDEMPOTENCY_CONFLICT", "IDEMPOTENCY_CONFLICT", 409],
    ["OLH_TRACKING_CONFLICT", "IDEMPOTENCY_CONFLICT", 409],
    ["OLH_MENU_CHANGED", "MENU_CHANGED", 409],
    ["OLH_MODIFIER_INVALID", "MENU_CHANGED", 409],
    ["OLH_ORDERING_PAUSED", "ORDERING_PAUSED", 409],
    ["OLH_CAFE_CLOSED", "CAFE_CLOSED", 409],
    ["OLH_PICKUP_INVALID", "PICKUP_INVALID", 400],
    ["OLH_CONFIGURATION_UNAVAILABLE", "ORDERING_UNAVAILABLE", 503],
  ])("maps %s to a stable safe contract", (raw, code, status) => {
    expect(mapDatabaseError({ message: `${raw}: raw detail` })).toMatchObject({
      code,
      status,
    });
  });

  it("collapses unknown infrastructure failures", () => {
    const mapped = mapDatabaseError({
      message: "password=secret postgres.internal customer@example.test",
      details: "tracking secret",
    });
    expect(mapped).toMatchObject({ code: "DEPENDENCY_UNAVAILABLE", status: 503 });
    expect(mapped.message).not.toMatch(/secret|postgres|customer/i);
  });

  it("returns only a code and retry metadata to clients", async () => {
    const response = errorResponse(
      new OrderBoundaryError("RATE_LIMITED", 429, { retryAfterSeconds: 17 }),
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("17");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(await response.json()).toEqual({
      error: { code: "RATE_LIMITED", retryAfterSeconds: 17 },
    });
  });
});
