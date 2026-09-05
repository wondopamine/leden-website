import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHECKOUT_ATTEMPT_SESSION_KEY,
  STATUS_SESSION_PREFIX,
  CheckoutRecoveryRequiredError,
  allowCheckoutRetry,
  clearCheckoutAttempt,
  ensureCheckoutAttempt,
  getCheckoutRecoveryAttempt,
  recoverCheckoutAttempt,
  requireCheckoutRecovery,
  resolveOrderStatusSession,
  runCheckoutSubmission,
  saveOrderStatusSession,
  type CheckoutMaterial,
  type StorageLike,
} from "@/lib/orders/checkout-attempt";
import { migratePersistedCart } from "@/lib/cart-store";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

afterEach(() => {
  vi.useRealTimers();
});

const material = (overrides: Partial<CheckoutMaterial> = {}): CheckoutMaterial => ({
  customer: { name: "Mina Test", phone: "5145550199" },
  locale: "en",
  pickup: { mode: "asap" },
  items: [
    {
      menuItemId: "11111111-1111-4111-8111-111111111111",
      quantity: 2,
      optionIds: ["22222222-2222-4222-8222-222222222222"],
    },
  ],
  ...overrides,
});

const receipt = {
  receipt_id: "receipt-safe",
  order_number: "LDN-2042",
  status: "new",
  status_version: 1,
  promised_pickup_at: "2026-08-24T15:30:00.000Z",
  subtotal: 12,
  tax_gst: 0.6,
  tax_qst: 1.2,
  total: 13.8,
  gst_rate: 0.05,
  qst_rate: 0.09975,
  created_at: "2026-08-24T15:00:00.000Z",
  items: [],
};

describe("checkout attempt identity", () => {
  it("reuses unchanged material but rotates cart, contact, pickup, and locale edits", async () => {
    const storage = new MemoryStorage();
    const first = await ensureCheckoutAttempt(material(), storage);
    const unchanged = await ensureCheckoutAttempt(material(), storage);

    expect(unchanged).toEqual(first);
    expect(first.attemptId).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.trackingSecret).toMatch(/^[A-Za-z0-9_-]{43}$/);

    for (const changed of [
      material({ customer: { name: "Mina Test", phone: "5145550101" } }),
      material({ pickup: { mode: "scheduled", scheduledLocal: "2026-08-24T12:15" } }),
      material({ locale: "fr" }),
      material({
        items: [
          {
            menuItemId: "11111111-1111-4111-8111-111111111111",
            quantity: 3,
            optionIds: ["22222222-2222-4222-8222-222222222222"],
          },
        ],
      }),
    ]) {
      const before = await ensureCheckoutAttempt(material(), storage);
      const rotated = await ensureCheckoutAttempt(changed, storage);
      expect(rotated.attemptId).not.toBe(before.attemptId);
      expect(rotated.trackingSecret).not.toBe(before.trackingSecret);
      storage.removeItem(CHECKOUT_ATTEMPT_SESSION_KEY);
    }

    const persisted = storage.getItem(CHECKOUT_ATTEMPT_SESSION_KEY) ?? "";
    expect(persisted).not.toContain("Mina Test");
    expect(persisted).not.toContain("5145550199");
  });

  it("strips legacy PII and attempt fields from durable cart persistence", () => {
    expect(
      migratePersistedCart({
        items: [{ id: "line-1", menuItemId: "item-1" }],
        customerInfo: { name: "Legacy Name", phone: "5145550199" },
        pickupTime: "12:15",
        attemptId: "legacy-attempt",
        trackingSecret: "legacy-secret",
      }),
    ).toEqual({
      items: [{ id: "line-1", menuItemId: "item-1" }],
      cartGeneration: 0,
    });
  });

  it("rotates an otherwise identical attempt after the cart generation changes", async () => {
    const storage = new MemoryStorage();
    const first = await ensureCheckoutAttempt(material(), storage, 4);
    const unchanged = await ensureCheckoutAttempt(material(), storage, 4);
    const rebuilt = await ensureCheckoutAttempt(material(), storage, 6);

    expect(unchanged).toEqual(first);
    expect(rebuilt.attemptId).not.toBe(first.attemptId);
    expect(rebuilt.trackingSecret).not.toBe(first.trackingSecret);
  });

  it("keeps prior secret-only status sessions when a later checkout starts", async () => {
    const storage = new MemoryStorage();
    const previous = saveOrderStatusSession(storage, {
      trackingSecret: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      receipt,
      recovered: false,
    });
    const activeAttempt = await ensureCheckoutAttempt(material(), storage);

    clearCheckoutAttempt(activeAttempt.attemptId, storage);

    const restored = resolveOrderStatusSession<typeof receipt>(storage, {
      fragment: "#bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });
    expect(restored?.session.contextId).toBe(previous.contextId);
    expect(storage.getItem(`${STATUS_SESSION_PREFIX}${previous.contextId}`)).not.toBeNull();
    expect(JSON.stringify(restored)).not.toContain(activeAttempt.attemptId);
  });

  it("blocks material rotation until a persisted ambiguous attempt is recovered", async () => {
    const storage = new MemoryStorage();
    const attempt = await ensureCheckoutAttempt(material(), storage);
    expect(requireCheckoutRecovery(attempt.attemptId, false, storage)).toBe(true);
    expect(getCheckoutRecoveryAttempt(storage)).toMatchObject({
      ...attempt,
      acceptanceKnown: false,
      cartTag: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
    });

    await expect(
      ensureCheckoutAttempt(
        material({ customer: { name: "Changed", phone: "5145550111" } }),
        storage,
      ),
    ).rejects.toBeInstanceOf(CheckoutRecoveryRequiredError);

    expect(allowCheckoutRetry(attempt.attemptId, storage)).toBe(true);
    const rotated = await ensureCheckoutAttempt(
      material({ customer: { name: "Changed", phone: "5145550111" } }),
      storage,
    );
    expect(rotated.attemptId).not.toBe(attempt.attemptId);
  });

  it("accepts only a raw 43-character tracking secret from the fragment", () => {
    const storage = new MemoryStorage();
    expect(
      resolveOrderStatusSession(storage, {
        fragment:
          "#v1.33333333-3333-4333-8333-333333333333.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      }),
    ).toBeNull();

    const resolved = resolveOrderStatusSession(storage, {
      fragment: "#aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    expect(resolved?.consumedFragment).toBe(true);
    expect(resolved?.session.trackingSecret).toBe(
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
  });

  it("never falls back to another stored order for a malformed fragment", () => {
    const storage = new MemoryStorage();
    saveOrderStatusSession(storage, {
      trackingSecret: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      receipt,
      recovered: false,
    });

    expect(
      resolveOrderStatusSession(storage, {
        fragment: "#not-a-private-order-secret",
      }),
    ).toBeNull();
  });

  it("keeps the cached authoritative receipt when a locale switch reuses the fragment", () => {
    const storage = new MemoryStorage();
    const existing = saveOrderStatusSession(storage, {
      trackingSecret: "ccccccccccccccccccccccccccccccccccccccccccc",
      receipt,
      recovered: true,
    });
    resolveOrderStatusSession(storage, {
      fragment: "#ccccccccccccccccccccccccccccccccccccccccccc",
    });

    const switched = resolveOrderStatusSession<typeof receipt>(storage, {
      fragment: "#ccccccccccccccccccccccccccccccccccccccccccc",
      historyContextId: existing.contextId,
    });
    expect(switched?.session.contextId).toBe(existing.contextId);
    expect(switched?.session.receipt).toEqual(receipt);
  });
});

describe("ambiguous checkout recovery", () => {
  it("serializes only the recovery DTO from a persisted attempt", async () => {
    const attempt = {
      attemptId: "33333333-3333-4333-8333-333333333333",
      trackingSecret: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      acceptanceKnown: false,
    };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ receipt }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await recoverCheckoutAttempt(fetcher, attempt);

    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      attemptId: attempt.attemptId,
      trackingSecret: attempt.trackingSecret,
    });
  });

  it("recovers a committed order after the create response is dropped", async () => {
    const attempt = {
      attemptId: "33333333-3333-4333-8333-333333333333",
      trackingSecret: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    };
    const phases: string[] = [];
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("response dropped"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ receipt }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const result = await runCheckoutSubmission({
      fetcher,
      attempt,
      createBody: { example: "ids-only" },
      onPhase: (phase) => phases.push(phase),
    });

    expect(result).toEqual({ kind: "recovered", receipt });
    expect(phases).toEqual(["submitting", "checking", "recovered"]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toEqual(attempt);
  });

  it("treats a malformed successful receipt as ambiguous and recovers it", async () => {
    const attempt = {
      attemptId: "33333333-3333-4333-8333-333333333333",
      trackingSecret: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ receipt: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ receipt }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    await expect(
      runCheckoutSubmission({ fetcher, attempt, createBody: {} }),
    ).resolves.toEqual({ kind: "recovered", receipt });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("keeps an ambiguous create uncertain when its immediate recovery finds no order", async () => {
    const attempt = {
      attemptId: "33333333-3333-4333-8333-333333333333",
      trackingSecret: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: "RECEIPT_UNCERTAIN" } }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: "TRACKING_UNAVAILABLE" } }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const result = await runCheckoutSubmission({
      fetcher,
      attempt,
      createBody: {},
    });

    expect(result).toEqual({ kind: "still-uncertain" });
    expect("attempt" in result).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("allows a later explicit recovery cycle to confirm no order", async () => {
    const attempt = {
      attemptId: "33333333-3333-4333-8333-333333333333",
      trackingSecret: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "TRACKING_UNAVAILABLE" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(recoverCheckoutAttempt(fetcher, attempt)).resolves.toEqual({
      kind: "confirmed-not-found",
      attempt,
    });
  });

  it("never exposes a resubmit action while recovery is still uncertain", async () => {
    const attempt = {
      attemptId: "33333333-3333-4333-8333-333333333333",
      trackingSecret: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("response dropped"))
      .mockRejectedValueOnce(new TypeError("recovery unavailable"));

    const result = await runCheckoutSubmission({
      fetcher,
      attempt,
      createBody: {},
    });

    expect(result).toEqual({ kind: "still-uncertain" });
    expect("canRetry" in result).toBe(false);
  });

  it("times out create into same-attempt recovery without issuing another create", async () => {
    vi.useFakeTimers();
    const attempt = {
      attemptId: "33333333-3333-4333-8333-333333333333",
      trackingSecret: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    };
    const urls: string[] = [];
    const signals: AbortSignal[] = [];
    const bodies: string[] = [];
    const fetcher = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      urls.push(String(input));
      if (init?.signal) signals.push(init.signal);
      if (init?.body) bodies.push(String(init.body));
      if (urls.length === 1) return new Promise<Response>(() => undefined);
      return Promise.resolve(
        new Response(JSON.stringify({ receipt }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }) as unknown as typeof fetch;
    const phases: string[] = [];

    const submission = runCheckoutSubmission({
      fetcher,
      attempt,
      createBody: { example: "ids-only" },
      onPhase: (phase) => phases.push(phase),
      createTimeoutMs: 50,
      recoveryTimeoutMs: 50,
    });
    await vi.advanceTimersByTimeAsync(50);

    await expect(submission).resolves.toEqual({ kind: "recovered", receipt });
    expect(urls).toEqual(["/api/order/v1", "/api/order/recover"]);
    expect(signals[0]?.aborted).toBe(true);
    expect(phases).toEqual(["submitting", "checking", "recovered"]);
    expect(JSON.parse(bodies[1] ?? "null")).toEqual(attempt);
  });

  it("does not unlock retry when a timed-out create gets an immediate recovery 404", async () => {
    vi.useFakeTimers();
    const attempt = {
      attemptId: "33333333-3333-4333-8333-333333333333",
      trackingSecret: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    };
    const urls: string[] = [];
    const fetcher = vi.fn((input: RequestInfo | URL) => {
      urls.push(String(input));
      if (urls.length === 1) return new Promise<Response>(() => undefined);
      return Promise.resolve(
        new Response(
          JSON.stringify({ error: { code: "TRACKING_UNAVAILABLE" } }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    }) as unknown as typeof fetch;

    const submission = runCheckoutSubmission({
      fetcher,
      attempt,
      createBody: {},
      createTimeoutMs: 50,
      recoveryTimeoutMs: 50,
    });
    await vi.advanceTimersByTimeAsync(50);
    const result = await submission;

    expect(result).toEqual({ kind: "still-uncertain" });
    expect("attempt" in result).toBe(false);
    expect("canRetry" in result).toBe(false);
    expect(urls).toEqual(["/api/order/v1", "/api/order/recover"]);
  });

  it("keeps the attempt uncertain when the recovery deadline expires", async () => {
    vi.useFakeTimers();
    const attempt = {
      attemptId: "33333333-3333-4333-8333-333333333333",
      trackingSecret: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    };
    const signals: AbortSignal[] = [];
    const fetcher = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.signal) signals.push(init.signal);
      if (String(input) === "/api/order/v1") {
        return Promise.reject(new TypeError("response dropped"));
      }
      return new Promise<Response>(() => undefined);
    }) as unknown as typeof fetch;

    const submission = runCheckoutSubmission({
      fetcher,
      attempt,
      createBody: {},
      createTimeoutMs: 50,
      recoveryTimeoutMs: 50,
    });
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(50);

    await expect(submission).resolves.toEqual({ kind: "still-uncertain" });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(signals[1]?.aborted).toBe(true);
  });

  it("returns a definitive rejection without starting ambiguity recovery", async () => {
    const attempt = {
      attemptId: "33333333-3333-4333-8333-333333333333",
      trackingSecret: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "MENU_CHANGED" } }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      runCheckoutSubmission({ fetcher, attempt, createBody: {} }),
    ).resolves.toEqual({
      kind: "rejected",
      error: { code: "MENU_CHANGED" },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
