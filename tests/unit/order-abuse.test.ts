import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  assertSameOrigin,
  deriveRateKey,
  resolveTrustedClientIdentity,
  verifyTurnstile,
} from "../../src/lib/orders/abuse.server";

describe("origin and trusted identity", () => {
  it("requires the browser Origin to match the configured application origin", () => {
    expect(() =>
      assertSameOrigin(
        new Request("https://cafe.example/api/order", {
          method: "POST",
          headers: { origin: "https://evil.example" },
        }),
        "https://cafe.example",
      ),
    ).toThrow(expect.objectContaining({ code: "ORIGIN_FORBIDDEN" }));
  });

  it("ignores spoofable forwarding headers and trusts Cloudflare only in a locked profile", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.10",
      "x-forwarded-for": "198.51.100.2",
      "x-real-ip": "192.0.2.4",
    });
    expect(() =>
      resolveTrustedClientIdentity(headers, {
        local: false,
        trustCloudflare: false,
      }),
    ).toThrow(expect.objectContaining({ code: "CLIENT_IDENTITY_UNAVAILABLE" }));
    expect(
      resolveTrustedClientIdentity(headers, {
        local: false,
        trustCloudflare: true,
      }),
    ).toBe("203.0.113.10");
  });

  it("derives a versioned HMAC without retaining the raw identity", () => {
    const first = deriveRateKey("203.0.113.10", {
      version: "v1",
      key: "k".repeat(32),
    });
    const second = deriveRateKey("203.0.113.11", {
      version: "v1",
      key: "k".repeat(32),
    });
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain("203.0.113.10");
    expect(second).not.toBe(first);
  });
});

describe("Turnstile verification", () => {
  it("accepts only the expected action and hostname", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      Response.json({
        success: true,
        action: "order_create",
        hostname: "cafe.example",
      }),
    );
    await expect(
      verifyTurnstile("token", {
        secret: "secret",
        expectedAction: "order_create",
        expectedHostname: "cafe.example",
        fetchImpl,
        timeoutMs: 50,
      }),
    ).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries only Siteverify uncertainty with one stable retry identity", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce(
        Response.json({
          success: true,
          action: "order_create",
          hostname: "cafe.example",
        }),
      );
    await verifyTurnstile("token", {
      secret: "secret",
      expectedAction: "order_create",
      expectedHostname: "cafe.example",
      fetchImpl,
      timeoutMs: 50,
    });
    const first = fetchImpl.mock.calls[0][1]?.body as URLSearchParams;
    const second = fetchImpl.mock.calls[1][1]?.body as URLSearchParams;
    expect(first.get("idempotency_key")).toBe(second.get("idempotency_key"));
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("maps a bounded Siteverify timeout to challenge unavailability", async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      }),
    );
    await expect(
      verifyTurnstile("token", {
        secret: "secret",
        expectedAction: "order_create",
        expectedHostname: "cafe.example",
        fetchImpl: fetchImpl as typeof fetch,
        timeoutMs: 5,
      }),
    ).rejects.toMatchObject({ code: "CHALLENGE_UNAVAILABLE" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it.each([
    [{ success: false, "error-codes": ["invalid-input-response"] }, "CHALLENGE_FAILED"],
    [{ success: true, action: "wrong", hostname: "cafe.example" }, "CHALLENGE_FAILED"],
    [{ success: true, action: "order_create", hostname: "wrong.example" }, "CHALLENGE_FAILED"],
  ])("fails closed for invalid Siteverify result %#", async (result, code) => {
    await expect(
      verifyTurnstile("token", {
        secret: "secret",
        expectedAction: "order_create",
        expectedHostname: "cafe.example",
        fetchImpl: vi.fn().mockResolvedValue(Response.json(result)),
        timeoutMs: 50,
      }),
    ).rejects.toMatchObject({ code });
  });

  it("marks a consumed-or-expired token as receipt-ambiguous", async () => {
    await expect(
      verifyTurnstile("token", {
        secret: "secret",
        expectedAction: "order_create",
        expectedHostname: "cafe.example",
        fetchImpl: vi.fn().mockResolvedValue(
          Response.json({
            success: false,
            "error-codes": ["timeout-or-duplicate"],
          }),
        ),
        timeoutMs: 50,
      }),
    ).rejects.toMatchObject({
      code: "CHALLENGE_FAILED",
      metadata: { ambiguousChallenge: true },
    });
  });

  it("fails closed when production verification config is missing", async () => {
    await expect(
      verifyTurnstile("token", {
        secret: "",
        expectedAction: "order_create",
        expectedHostname: "cafe.example",
        fetchImpl: vi.fn(),
        timeoutMs: 50,
      }),
    ).rejects.toMatchObject({ code: "CHALLENGE_UNAVAILABLE" });
  });
});
