import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ADMIN_DEGRADED_POLL_MS,
  ADMIN_LIVE_POLL_MS,
  ADMIN_REFRESH_TIMEOUT_MS,
  ADMIN_STALE_AFTER_MS,
  canTransitionOrders,
  createAdminRefreshCoordinator,
  getAdminConnectionState,
  getAdminPollInterval,
  reconcileAfterAdminMutation,
  reconcileAdminOrders,
  shouldApplyAdminSnapshot,
  type AdminOrder,
} from "../../src/lib/orders/admin-realtime";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

afterEach(() => {
  vi.useRealTimers();
});

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
    expect(ADMIN_REFRESH_TIMEOUT_MS).toBeLessThan(ADMIN_DEGRADED_POLL_MS);
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

describe("admin refresh coordination", () => {
  it("coalesces a burst into one active request and one trailing refresh", async () => {
    const first = deferred<ReturnType<typeof snapshot>>();
    const second = deferred<ReturnType<typeof snapshot>>();
    const load = vi
      .fn<(signal: AbortSignal) => Promise<ReturnType<typeof snapshot>>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const applied: string[] = [];
    const coordinator = createAdminRefreshCoordinator({
      load,
      onSnapshot: (value) => applied.push(value.refreshedAt),
      onFailure: vi.fn(),
      onRunningChange: vi.fn(),
    });

    const cycle = coordinator.request();
    const coalesced = coordinator.request();
    void coordinator.request();
    expect(load).toHaveBeenCalledTimes(1);

    first.resolve(snapshot("2026-08-24T15:00:01.000Z", [order("one", 1)]));
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2));

    second.resolve(snapshot("2026-08-24T15:00:02.000Z", [order("one", 2)]));
    await expect(cycle).resolves.toBe(true);
    await expect(coalesced).resolves.toBe(true);
    expect(load).toHaveBeenCalledTimes(2);
    expect(applied).toEqual([
      "2026-08-24T15:00:01.000Z",
      "2026-08-24T15:00:02.000Z",
    ]);
  });

  it("times out a hung refresh, reports failure, and permits recovery", async () => {
    vi.useFakeTimers();
    const first = deferred<ReturnType<typeof snapshot>>();
    const recovered = snapshot("2026-08-24T15:00:03.000Z", [order("one", 3)]);
    const signals: AbortSignal[] = [];
    const load = vi.fn((signal: AbortSignal) => {
      signals.push(signal);
      return signals.length === 1 ? first.promise : Promise.resolve(recovered);
    });
    const onSnapshot = vi.fn();
    const onFailure = vi.fn();
    const running: boolean[] = [];
    const coordinator = createAdminRefreshCoordinator({
      load,
      onSnapshot,
      onFailure,
      onRunningChange: (value) => running.push(value),
      timeoutMs: 50,
    });

    const timedOut = coordinator.request();
    await vi.advanceTimersByTimeAsync(50);
    await expect(timedOut).resolves.toBe(false);
    expect(signals[0]?.aborted).toBe(true);
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(running).toEqual([true, false]);

    await expect(coordinator.request()).resolves.toBe(true);
    expect(onSnapshot).toHaveBeenCalledWith(recovered);
    expect(running).toEqual([true, false, true, false]);
  });

  it("aborts and ignores an active refresh after disposal", async () => {
    const active = deferred<ReturnType<typeof snapshot>>();
    let signal: AbortSignal | undefined;
    const onSnapshot = vi.fn();
    const coordinator = createAdminRefreshCoordinator({
      load: (nextSignal) => {
        signal = nextSignal;
        return active.promise;
      },
      onSnapshot,
      onFailure: vi.fn(),
      onRunningChange: vi.fn(),
    });

    const cycle = coordinator.request();
    coordinator.dispose();
    active.resolve(snapshot("2026-08-24T15:00:04.000Z", []));
    await expect(cycle).resolves.toBe(false);

    expect(signal?.aborted).toBe(true);
    expect(onSnapshot).not.toHaveBeenCalled();
  });
});

function snapshot(refreshedAt: string, orders: AdminOrder[]) {
  return {
    orders,
    orderingEnabled: true,
    localDate: "2026-08-24",
    refreshedAt,
  };
}
