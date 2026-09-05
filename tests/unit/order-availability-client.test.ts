import { afterEach, describe, expect, it, vi } from "vitest";
import { createOrderAvailabilityController } from "@/lib/orders/availability-client";
import type { OrderAvailability } from "@/lib/types";

const enabled: OrderAvailability = {
  hours: [
    { day: "Monday", open: "07:30", close: "15:00", closed: false },
  ],
  orderingEnabled: true,
  pickupLeadTime: 15,
};

function availabilityResponse(availability: OrderAvailability) {
  return new Response(JSON.stringify({ availability }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("order availability refresh", () => {
  it("fails closed when the request deadline expires", async () => {
    vi.useFakeTimers();
    const onAvailability = vi.fn();
    const fetcher = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    ) as unknown as typeof fetch;
    const controller = createOrderAvailabilityController({
      fetcher,
      onAvailability,
      timeoutMs: 50,
    });

    const refresh = controller.refresh();
    await vi.advanceTimersByTimeAsync(50);
    await refresh;

    expect(onAvailability).toHaveBeenLastCalledWith(null);
    controller.dispose();
  });

  it("fails closed on replacement and ignores an older late response", async () => {
    let resolveFirst!: (response: Response) => void;
    let resolveSecond!: (response: Response) => void;
    const first = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });
    const second = new Promise<Response>((resolve) => {
      resolveSecond = resolve;
    });
    const fetcher = vi
      .fn<typeof fetch>()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);
    const observed: Array<OrderAvailability | null> = [];
    const controller = createOrderAvailabilityController({
      fetcher,
      onAvailability: (availability) => observed.push(availability),
      timeoutMs: 1_000,
    });

    const olderRefresh = controller.refresh();
    const newerRefresh = controller.refresh();
    expect(observed).toEqual([null]);

    const paused = { ...enabled, orderingEnabled: false };
    resolveSecond(availabilityResponse(paused));
    await newerRefresh;
    resolveFirst(availabilityResponse(enabled));
    await olderRefresh;

    expect(observed).toEqual([null, paused]);
    controller.dispose();
  });
});
