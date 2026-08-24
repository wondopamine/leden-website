import { describe, expect, it } from "vitest";

import { createOrderStatusRequestCoordinator } from "@/components/order/order-status";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

async function applyDeferredCompletion(
  lease: ReturnType<
    ReturnType<typeof createOrderStatusRequestCoordinator>["begin"]
  >,
  completion: Promise<"ready" | "unavailable">,
  apply: (state: "ready" | "unavailable") => void,
) {
  const state = await completion;
  if (lease.isCurrent()) apply(state);
  lease.release();
}

describe("order status request coordination", () => {
  it.each(["ready", "unavailable"] as const)(
    "ignores a deferred %s completion after the private order is removed",
    async (responseState) => {
      const coordinator = createOrderStatusRequestCoordinator();
      const lease = coordinator.begin("private-session");
      const response = deferred<"ready" | "unavailable">();
      let visibleState: "removed" | "ready" | "unavailable" = "removed";
      const completion = applyDeferredCompletion(lease, response.promise, (state) => {
        visibleState = state;
      });

      coordinator.invalidate();
      response.resolve(responseState);
      await completion;

      expect(lease.signal.aborted).toBe(true);
      expect(visibleState).toBe("removed");
    },
  );

  it("aborts the previous session generation when a different session starts", () => {
    const coordinator = createOrderStatusRequestCoordinator();
    const previous = coordinator.begin("previous-session");
    const current = coordinator.begin("current-session");

    expect(previous.signal.aborted).toBe(true);
    expect(previous.isCurrent()).toBe(false);
    expect(current.signal.aborted).toBe(false);
    expect(current.isCurrent()).toBe(true);
  });
});
