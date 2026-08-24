import { describe, expect, it, vi } from "vitest";

import {
  ADMIN_DEGRADED_POLL_MS,
  ADMIN_LIVE_POLL_MS,
  ADMIN_STALE_AFTER_MS,
  canTransitionOrders,
  getAdminConnectionState,
  getAdminPollInterval,
  reconcileAfterAdminMutation,
  reconcileAdminOrders,
  shouldApplyAdminSnapshot,
  type AdminOrder,
} from "../../src/lib/orders/admin-realtime";

function order(
  id: string,
  statusVersion: number,
  overrides: Partial<AdminOrder> = {},
): AdminOrder {
  return {
    id,
    order_number: `LD-${id}`,
    customer_name: "Ada",
    customer_phone: "5145550101",
    pickup_time: null,
    promised_pickup_at: "2026-08-24T16:00:00.000Z",
    status: "new",
    status_version: statusVersion,
    subtotal: 5,
    tax_gst: 0.25,
    tax_qst: 0.5,
    total: 5.75,
    created_at: "2026-08-24T15:00:00.000Z",
    updated_at: "2026-08-24T15:00:00.000Z",
    order_items: [],
    ...overrides,
  };
}

describe("admin canonical reconciliation", () => {
  it("deduplicates IDs, keeps the greatest canonical version, and sorts by promise/FIFO", () => {
    const current = [
      order("one", 3, { promised_pickup_at: "2026-08-24T17:00:00.000Z" }),
      order("removed", 1),
    ];
    const incoming = [
      order("one", 2, {
        status: "preparing",
        promised_pickup_at: "2026-08-24T17:00:00.000Z",
      }),
      order("two", 1, {
        status: "preparing",
        promised_pickup_at: "2026-08-24T16:00:00.000Z",
      }),
      order("two", 2, {
        status: "ready",
        promised_pickup_at: "2026-08-24T16:00:00.000Z",
      }),
    ];

    expect(reconcileAdminOrders(current, incoming)).toEqual([
      expect.objectContaining({ id: "two", status: "ready", status_version: 2 }),
      expect.objectContaining({ id: "one", status: "new", status_version: 3 }),
    ]);
  });

  it("rejects a response older than the last applied request", () => {
    expect(shouldApplyAdminSnapshot(8, 7)).toBe(false);
    expect(shouldApplyAdminSnapshot(8, 8)).toBe(true);
    expect(shouldApplyAdminSnapshot(8, 9)).toBe(true);
  });
});

describe("admin connection and freshness contract", () => {
  const refreshedAt = Date.parse("2026-08-24T12:00:00.000Z");

  it("distinguishes Live, Reconnecting, Polling, and Stale", () => {
    expect(
      getAdminConnectionState("live", refreshedAt, refreshedAt + 1_000),
    ).toBe("live");
    expect(
      getAdminConnectionState("reconnecting", refreshedAt, refreshedAt + 1_000),
    ).toBe("reconnecting");
    expect(
      getAdminConnectionState("polling", refreshedAt, refreshedAt + 1_000),
    ).toBe("polling");
    expect(
      getAdminConnectionState(
        "live",
        refreshedAt,
        refreshedAt + ADMIN_STALE_AFTER_MS,
      ),
    ).toBe("stale");
    expect(getAdminConnectionState("polling", null, refreshedAt)).toBe("stale");
  });

  it("uses healthy and degraded polling bounds and locks stale/reconnecting transitions", () => {
    expect(ADMIN_LIVE_POLL_MS).toBeLessThan(ADMIN_STALE_AFTER_MS);
    expect(getAdminPollInterval("live")).toBe(ADMIN_LIVE_POLL_MS);
    expect(getAdminPollInterval("polling")).toBe(ADMIN_DEGRADED_POLL_MS);
    expect(getAdminPollInterval("reconnecting")).toBe(ADMIN_DEGRADED_POLL_MS);
    expect(getAdminPollInterval("stale")).toBe(ADMIN_DEGRADED_POLL_MS);
    expect(canTransitionOrders("live")).toBe(true);
    expect(canTransitionOrders("polling")).toBe(true);
    expect(canTransitionOrders("reconnecting")).toBe(false);
    expect(canTransitionOrders("stale")).toBe(false);
  });

  it("falls back to a route refresh when a detail card has no board reconciler", async () => {
    const routeRefresh = vi.fn();
    await reconcileAfterAdminMutation(undefined, routeRefresh);
    expect(routeRefresh).toHaveBeenCalledTimes(1);

    const boardRefresh = vi.fn().mockResolvedValue(true);
    await reconcileAfterAdminMutation(boardRefresh, routeRefresh);
    expect(boardRefresh).toHaveBeenCalledTimes(1);
    expect(routeRefresh).toHaveBeenCalledTimes(1);
  });
});
