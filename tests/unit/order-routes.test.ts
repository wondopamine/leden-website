import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  findCommittedReplay: vi.fn(),
  waitForCommittedReplay: vi.fn(),
  create: vi.fn(),
  status: vi.fn(),
  recover: vi.fn(),
  verifyTurnstile: vi.fn(),
  loadRequestTrust: vi.fn(),
}));

vi.mock("@/lib/orders/abuse.server", () => ({
  loadRequestTrust: mocks.loadRequestTrust,
  verifyTurnstile: mocks.verifyTurnstile,
}));

vi.mock("@/lib/orders/repository.server", () => ({
  createOrderRepository: () => ({
    consumeRateLimit: mocks.consumeRateLimit,
    findCommittedReplay: mocks.findCommittedReplay,
    waitForCommittedReplay: mocks.waitForCommittedReplay,
    create: mocks.create,
    status: mocks.status,
    recover: mocks.recover,
  }),
}));

import { POST as createOrder } from "../../src/app/api/order/route";
import { POST as recoverOrder } from "../../src/app/api/order/recover/route";
import { POST as getOrderStatus } from "../../src/app/api/order/status/route";
import { OrderBoundaryError } from "../../src/lib/orders/errors";

const ATTEMPT = "f1000000-0000-4000-8000-000000000001";
const ITEM = "d2000000-0000-4000-8000-000000000001";
const SECRET = "A".repeat(43);
const RECEIPT = { receipt_id: "receipt", order_number: "LD-1", status: "new" };

function request(path: string, body: unknown) {
  return new Request(`http://127.0.0.1${path}`, {
    method: "POST",
    headers: {
      origin: "http://127.0.0.1",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function createBody() {
  return {
    attemptId: ATTEMPT,
    trackingSecret: SECRET,
    customer: { name: "Ada", phone: "5145550101" },
    locale: "en",
    pickup: { mode: "asap" },
    items: [{ menuItemId: ITEM, quantity: 1, optionIds: [] }],
    turnstileToken: "challenge",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadRequestTrust.mockReturnValue({
    rateKeyHex: "ab".repeat(32),
    turnstile: {
      secret: "test-secret",
      expectedAction: "order_create",
      expectedHostname: "127.0.0.1",
      timeoutMs: 50,
    },
  });
  mocks.consumeRateLimit.mockResolvedValue(undefined);
  mocks.findCommittedReplay.mockResolvedValue(null);
  mocks.waitForCommittedReplay.mockResolvedValue(null);
  mocks.verifyTurnstile.mockResolvedValue(undefined);
  mocks.create.mockResolvedValue(RECEIPT);
});

describe("create order Route Handler", () => {
  it("returns 201 through the thin validated orchestration path", async () => {
    const response = await createOrder(request("/api/order", createBody()));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ receipt: RECEIPT });
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith(
      "create",
      "ab".repeat(32),
      10,
      60,
    );
    expect(mocks.findCommittedReplay).toHaveBeenCalledTimes(1);
    expect(mocks.verifyTurnstile).toHaveBeenCalledWith(
      "challenge",
      expect.objectContaining({ expectedAction: "order_create" }),
    );
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.consumeRateLimit.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.findCommittedReplay.mock.invocationCallOrder[0],
    );
    expect(mocks.findCommittedReplay.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.verifyTurnstile.mock.invocationCallOrder[0],
    );
    expect(mocks.verifyTurnstile.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.create.mock.invocationCallOrder[0],
    );
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("rejects the legacy price-bearing shape before any privileged call", async () => {
    const body = createBody() as ReturnType<typeof createBody> & { total: number };
    body.total = 5.75;
    const response = await createOrder(request("/api/order", body));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: { code: "CLIENT_REFRESH_REQUIRED" },
    });
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
    expect(mocks.findCommittedReplay).not.toHaveBeenCalled();
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns a committed replay before requesting a fresh challenge", async () => {
    mocks.findCommittedReplay.mockResolvedValue(RECEIPT);
    const response = await createOrder(request("/api/order", createBody()));
    expect(response.status).toBe(200);
    expect(mocks.findCommittedReplay.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.verifyTurnstile.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns an idempotency conflict without challenge or database creation", async () => {
    mocks.findCommittedReplay.mockRejectedValue(
      new OrderBoundaryError("IDEMPOTENCY_CONFLICT", 409),
    );
    const response = await createOrder(request("/api/order", createBody()));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: { code: "IDEMPOTENCY_CONFLICT" },
    });
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("recovers a concurrent commit after the single-use challenge loses", async () => {
    mocks.verifyTurnstile.mockRejectedValue(
      new OrderBoundaryError("CHALLENGE_FAILED", 403, {
        ambiguousChallenge: true,
      }),
    );
    mocks.waitForCommittedReplay.mockResolvedValue(RECEIPT);
    const response = await createOrder(request("/api/order", createBody()));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ receipt: RECEIPT });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects a definite challenge failure without polling the database", async () => {
    mocks.verifyTurnstile.mockRejectedValue(
      new OrderBoundaryError("CHALLENGE_FAILED", 403),
    );
    const response = await createOrder(request("/api/order", createBody()));
    expect(response.status).toBe(403);
    expect(mocks.waitForCommittedReplay).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns receipt uncertainty when a possibly consumed challenge has no bounded replay", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.verifyTurnstile.mockRejectedValue(
      new OrderBoundaryError("CHALLENGE_FAILED", 403, {
        ambiguousChallenge: true,
      }),
    );
    const response = await createOrder(request("/api/order", createBody()));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: { code: "RECEIPT_UNCERTAIN" },
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("never includes raw dependency text in the public response", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.create.mockRejectedValue(
      new OrderBoundaryError("DEPENDENCY_UNAVAILABLE", 503),
    );
    const response = await createOrder(request("/api/order", createBody()));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toMatch(
      /postgres|supabase|cloudflare|secret|customer/i,
    );
  });

  it("returns receipt uncertainty when both creation and its commit probe fail", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.create.mockRejectedValue(
      new OrderBoundaryError("DEPENDENCY_UNAVAILABLE", 503),
    );
    mocks.waitForCommittedReplay.mockRejectedValue(
      new OrderBoundaryError("DEPENDENCY_UNAVAILABLE", 503),
    );
    const response = await createOrder(request("/api/order", createBody()));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: { code: "RECEIPT_UNCERTAIN" },
    });
  });
});

describe("tracking Route Handlers", () => {
  it("returns a no-store minimal status projection", async () => {
    mocks.status.mockResolvedValue({
      order_number: "LD-1",
      status: "ready",
      status_version: 2,
      promised_pickup_at: "2026-08-24T18:00:00Z",
      updated_at: "2026-08-24T17:00:00Z",
      cafe: { address: "121 Donegani", phone: "5145550100" },
    });
    const response = await getOrderStatus(
      request("/api/order/status", { trackingSecret: SECRET }),
    );
    expect(response.status).toBe(200);
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith(
      "status",
      "ab".repeat(32),
      120,
      60,
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("makes invalid status and recovery credentials indistinguishable", async () => {
    mocks.status.mockResolvedValue(null);
    mocks.recover.mockRejectedValue(
      new OrderBoundaryError("TRACKING_UNAVAILABLE", 404),
    );
    const statusResponse = await getOrderStatus(
      request("/api/order/status", { trackingSecret: SECRET }),
    );
    const recoveryResponse = await recoverOrder(
      request("/api/order/recover", {
        attemptId: ATTEMPT,
        trackingSecret: SECRET,
      }),
    );
    expect(statusResponse.status).toBe(404);
    expect(recoveryResponse.status).toBe(404);
    expect(await statusResponse.json()).toEqual(
      await recoveryResponse.json(),
    );
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith(
      "recovery",
      "ab".repeat(32),
      10,
      60,
    );
  });
});
