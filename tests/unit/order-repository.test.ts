import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  canonicalizeCreateMaterial,
  parseCreateOrderRequest,
} from "../../src/lib/orders/contracts";
import { OrderRepository } from "../../src/lib/orders/repository.server";

const ATTEMPT = "f1000000-0000-4000-8000-000000000001";
const ITEM = "d2000000-0000-4000-8000-000000000001";
const SECRET = "A".repeat(43);
const TRACKING_HASH = "ab".repeat(32);
const FINGERPRINT = "806673bffc4f40c44ae6a66fa974bc1d6773a7d2f6e684a6cef751e8f6e2abaa";

afterEach(() => {
  vi.useRealTimers();
});

function input() {
  return parseCreateOrderRequest({
    attemptId: ATTEMPT,
    trackingSecret: SECRET,
    customer: { name: "Ada", phone: "5145550101" },
    locale: "en",
    pickup: { mode: "asap" },
    items: [{ menuItemId: ITEM, quantity: 1, optionIds: [] }],
    turnstileToken: "challenge",
  });
}

const RECEIPT = {
  receipt_id: "f9000000-0000-4000-8000-000000000001",
  order_number: "LD-1",
  status: "new",
  status_version: 0,
  promised_pickup_at: "2026-08-24T17:00:00Z",
  subtotal: 5,
  tax_gst: 0.25,
  tax_qst: 0.5,
  total: 5.75,
  gst_rate: 0.05,
  qst_rate: 0.09975,
  created_at: "2026-08-24T16:45:00Z",
  customer_name: "must be filtered",
  items: [
    {
      name: "Latte",
      base_price: 5,
      modifier_total: 0,
      unit_price: 5,
      quantity: 1,
      line_total: 5,
      modifiers: [],
      menu_item_id: ITEM,
    },
  ],
};

function fakeClient(row: unknown, rpcResult: unknown = RECEIPT) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const queryAbortSignal = vi.fn(() => ({ maybeSingle }));
  const eq = vi.fn(() => ({ abortSignal: queryAbortSignal }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn(() => ({
    abortSignal: vi.fn().mockResolvedValue({ data: rpcResult, error: null }),
  }));
  return { client: { from, rpc }, rpc };
}

describe("OrderRepository committed replay", () => {
  it("returns a filtered authoritative receipt for an exact stored fingerprint", async () => {
    const parsed = input();
    const material = canonicalizeCreateMaterial(parsed, TRACKING_HASH);
    // This test fixture is intentionally fixed to the canonical material above.
    const { client, rpc } = fakeClient({
      tracking_token_hash: `\\x${TRACKING_HASH}`,
      request_fingerprint: `\\x${FINGERPRINT}`,
    });
    const repository = new OrderRepository(client as never);
    const receipt = await repository.findCommittedReplay(
      ATTEMPT,
      TRACKING_HASH,
      material,
    );
    expect(receipt).not.toHaveProperty("customer_name");
    expect(receipt?.items[0]).not.toHaveProperty("menu_item_id");
    expect(rpc).toHaveBeenCalledWith("recover_order_v1", {
      p_idempotency_key: ATTEMPT,
      p_tracking_token_hash: `\\x${TRACKING_HASH}`,
    });
  });

  it("conflicts before recovery when any material semantic differs", async () => {
    const parsed = input();
    const baseline = canonicalizeCreateMaterial(parsed, TRACKING_HASH);
    const { client, rpc } = fakeClient({
      tracking_token_hash: `\\x${TRACKING_HASH}`,
      request_fingerprint: `\\x${FINGERPRINT}`,
    });
    const repository = new OrderRepository(client as never);
    await expect(
      repository.findCommittedReplay(ATTEMPT, TRACKING_HASH, {
        ...baseline,
        notes: "changed",
      }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT", status: 409 });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("collapses raw transport rejection to dependency unavailability", async () => {
    const { client } = fakeClient(null);
    client.rpc.mockReturnValue({
      abortSignal: vi
        .fn()
        .mockRejectedValue(new Error("raw connection and secret details")),
    });
    const repository = new OrderRepository(client as never);
    await expect(repository.status(TRACKING_HASH)).rejects.toMatchObject({
      code: "DEPENDENCY_UNAVAILABLE",
      status: 503,
    });
  });

  it.each(["create", "status"] as const)(
    "aborts a hanging %s operation at the repository deadline",
    async (operation) => {
      vi.useFakeTimers();
      let signal: AbortSignal | undefined;
      const never = {
        abortSignal: vi.fn((nextSignal: AbortSignal) => {
          signal = nextSignal;
          return new Promise<never>(() => undefined);
        }),
      };
      const client = {
        from: vi.fn(),
        rpc: vi.fn(() => never),
      };
      const repository = new OrderRepository(client as never, 40);
      const pending =
        operation === "create"
          ? repository.create(input(), TRACKING_HASH)
          : repository.status(TRACKING_HASH);
      const assertion = expect(pending).rejects.toMatchObject({
        code: "DEPENDENCY_UNAVAILABLE",
        status: 503,
      });

      await vi.advanceTimersByTimeAsync(40);

      await assertion;
      expect(signal?.aborted).toBe(true);
    },
  );

  it("keeps the committed-replay wait bounded when one lookup never settles", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            abortSignal: vi.fn((nextSignal: AbortSignal) => {
              signal = nextSignal;
              return {
                maybeSingle: vi.fn(
                  () => new Promise<never>(() => undefined),
                ),
              };
            }),
          })),
        })),
      })),
      rpc: vi.fn(),
    };
    const repository = new OrderRepository(client as never, 2_000);
    const pending = repository.waitForCommittedReplay(
      ATTEMPT,
      TRACKING_HASH,
      canonicalizeCreateMaterial(input(), TRACKING_HASH),
      90,
    );
    const assertion = expect(pending).rejects.toMatchObject({
      code: "DEPENDENCY_UNAVAILABLE",
      status: 503,
    });

    await vi.advanceTimersByTimeAsync(90);

    await assertion;
    expect(signal?.aborted).toBe(true);
  });
});
