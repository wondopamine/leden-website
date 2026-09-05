import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ORDER_STATUS_POLL_INTERVAL_MS,
  ORDER_STATUS_REQUEST_TIMEOUT_MS,
  createOrderStatusRequestCoordinator,
} from "@/components/order/order-status";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

async function applyDeferredCompletion(
  lease: NonNullable<
    ReturnType<ReturnType<typeof createOrderStatusRequestCoordinator>["begin"]>
  >,
  completion: Promise<"ready" | "unavailable">,
  apply: (state: "ready" | "unavailable") => void,
) {
  const state = await completion;
  if (lease.isCurrent()) apply(state);
  lease.release();
}

afterEach(() => {
  vi.useRealTimers();
});

describe("order status request coordination", () => {
  it("bounds each request before the next production poll", () => {
    expect(ORDER_STATUS_REQUEST_TIMEOUT_MS).toBeLessThan(
      ORDER_STATUS_POLL_INTERVAL_MS,
    );
  });

  it.each(["ready", "unavailable"] as const)(
    "ignores a deferred %s completion after the private order is removed",
    async (responseState) => {
      const coordinator = createOrderStatusRequestCoordinator();
      const lease = coordinator.begin("private-session");
      expect(lease).not.toBeNull();
      const response = deferred<"ready" | "unavailable">();
      let visibleState: "removed" | "ready" | "unavailable" = "removed";
      const completion = applyDeferredCompletion(
        lease!,
        response.promise,
        (state) => {
          visibleState = state;
        },
      );

      coordinator.invalidate();
      response.resolve(responseState);
      await completion;

      expect(lease?.signal.aborted).toBe(true);
      expect(visibleState).toBe("removed");
    },
  );

  it("aborts the previous session generation when a different session starts", () => {
    const coordinator = createOrderStatusRequestCoordinator();
    const previous = coordinator.begin("previous-session");
    const current = coordinator.begin("current-session");

    expect(previous?.signal.aborted).toBe(true);
    expect(previous?.isCurrent()).toBe(false);
    expect(current?.signal.aborted).toBe(false);
    expect(current?.isCurrent()).toBe(true);
    current?.release();
  });

  it("times out a hung poll, releases its gate, and permits a later recovery", async () => {
    vi.useFakeTimers();
    const coordinator = createOrderStatusRequestCoordinator(50);
    const hung = coordinator.begin("private-session");
    expect(hung).not.toBeNull();
    expect(coordinator.begin("private-session")).toBeNull();

    let visibleState: "fresh" | "stale" | "ready" = "fresh";
    const firstPoll = hung!
      .waitFor(new Promise<"ready">(() => undefined))
      .catch(() => {
        if (hung?.isCurrent()) visibleState = "stale";
      })
      .finally(() => hung?.release());

    await vi.advanceTimersByTimeAsync(50);
    await firstPoll;
    expect(hung?.signal.aborted).toBe(true);
    expect(visibleState).toBe("stale");

    const recovered = coordinator.begin("private-session");
    expect(recovered).not.toBeNull();
    visibleState = await recovered!.waitFor(Promise.resolve("ready" as const));
    recovered?.release();
    expect(visibleState).toBe("ready");
  });
});
