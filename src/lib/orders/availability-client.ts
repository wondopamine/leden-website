import type { OrderAvailability } from "@/lib/types";

export const ORDER_AVAILABILITY_TIMEOUT_MS = 5_000;

type AvailabilityController = {
  refresh: () => Promise<void>;
  dispose: () => void;
};

export function readOrderAvailability(value: unknown): OrderAvailability | null {
  if (typeof value !== "object" || value === null || !("availability" in value)) {
    return null;
  }
  const availability = (value as { availability?: unknown }).availability;
  if (
    typeof availability !== "object" ||
    availability === null ||
    !("hours" in availability) ||
    !Array.isArray(availability.hours) ||
    !("orderingEnabled" in availability) ||
    typeof availability.orderingEnabled !== "boolean" ||
    !("pickupLeadTime" in availability) ||
    typeof availability.pickupLeadTime !== "number"
  ) {
    return null;
  }
  return availability as OrderAvailability;
}

export function createOrderAvailabilityController({
  fetcher,
  onAvailability,
  timeoutMs = ORDER_AVAILABILITY_TIMEOUT_MS,
}: {
  fetcher: typeof fetch;
  onAvailability: (availability: OrderAvailability | null) => void;
  timeoutMs?: number;
}): AvailabilityController {
  let disposed = false;
  let requestSequence = 0;
  let active:
    | { sequence: number; controller: AbortController; pending: boolean }
    | undefined;

  const refresh = async () => {
    const sequence = ++requestSequence;
    if (active?.pending) onAvailability(null);
    active?.controller.abort();

    const controller = new AbortController();
    const request = { sequence, controller, pending: true };
    active = request;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const deadline = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new DOMException("Availability request timed out", "TimeoutError"));
      }, timeoutMs);
    });

    try {
      const response = await Promise.race([
        fetcher("/api/order/availability", {
          cache: "no-store",
          signal: controller.signal,
        }),
        deadline,
      ]);
      const payload = await Promise.race([
        response.json().catch(() => null),
        deadline,
      ]);
      if (disposed || sequence !== requestSequence) return;
      onAvailability(response.ok ? readOrderAvailability(payload) : null);
    } catch {
      if (!disposed && sequence === requestSequence) onAvailability(null);
    } finally {
      if (timeout) clearTimeout(timeout);
      request.pending = false;
      if (active?.sequence === sequence) active = undefined;
    }
  };

  return {
    refresh,
    dispose() {
      disposed = true;
      requestSequence += 1;
      active?.controller.abort();
      active = undefined;
    },
  };
}
