import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  MAX_ORDER_BODY_BYTES,
  canonicalizeCreateMaterial,
  parseCreateOrderRequest,
  parseRecoveryRequest,
  parseStatusRequest,
  readBoundedJson,
} from "../../src/lib/orders/contracts";
import { fingerprintCreateMaterial } from "../../src/lib/orders/tracking.server";

const ITEM_A = "d2000000-0000-4000-8000-000000000001";
const ITEM_B = "d2000000-0000-4000-8000-000000000002";
const OPTION_A = "d4000000-0000-4000-8000-000000000001";
const OPTION_B = "d4000000-0000-4000-8000-000000000002";
const ATTEMPT = "f1000000-0000-4000-8000-000000000001";
const SECRET = "A".repeat(43);

function validBody() {
  return {
    attemptId: ATTEMPT,
    trackingSecret: SECRET,
    customer: { name: "  Ada Lovelace  ", phone: " (514) 555-0101 " },
    locale: "en",
    notes: "  oat milk  ",
    pickup: { mode: "asap" },
    items: [
      { menuItemId: ITEM_B, quantity: 2, optionIds: [OPTION_B, OPTION_A] },
      { menuItemId: ITEM_A, quantity: 1, optionIds: [] },
    ],
    turnstileToken: "turnstile-token",
  };
}

describe("parseCreateOrderRequest", () => {
  it("accepts and normalizes an IDs-only order", () => {
    expect(parseCreateOrderRequest(validBody())).toMatchObject({
      attemptId: ATTEMPT,
      trackingSecret: SECRET,
      customer: { name: "Ada Lovelace", phone: "(514) 555-0101" },
      notes: "oat milk",
      pickup: { mode: "asap", scheduledLocal: null },
    });
  });

  it.each([
    ["top-level legacy total", { total: 12.34 }],
    ["legacy customerInfo", { customerInfo: { name: "Ada" } }],
    ["legacy pickupTime", { pickupTime: "12:30" }],
  ])("requires a client refresh for %s", (_label, legacy) => {
    expect(() => parseCreateOrderRequest({ ...validBody(), ...legacy })).toThrow(
      expect.objectContaining({ code: "CLIENT_REFRESH_REQUIRED" }),
    );
  });

  it("requires a client refresh for browser-owned line presentation", () => {
    const body = validBody();
    body.items[0] = { ...body.items[0], name: "Forged", price: 0 } as never;
    expect(() => parseCreateOrderRequest(body)).toThrow(
      expect.objectContaining({ code: "CLIENT_REFRESH_REQUIRED" }),
    );
  });

  it.each([
    ["unknown top-level field", () => ({ ...validBody(), surprise: true })],
    ["unknown nested field", () => ({ ...validBody(), customer: { ...validBody().customer, email: "x@example.test" } })],
    ["invalid locale", () => ({ ...validBody(), locale: "es" })],
    ["non-integer quantity", () => ({ ...validBody(), items: [{ menuItemId: ITEM_A, quantity: 1.5, optionIds: [] }] })],
    ["too many lines", () => ({ ...validBody(), items: Array.from({ length: 51 }, () => ({ menuItemId: ITEM_A, quantity: 1, optionIds: [] })) })],
    ["too many modifiers", () => ({ ...validBody(), items: [{ menuItemId: ITEM_A, quantity: 1, optionIds: Array.from({ length: 21 }, () => OPTION_A) }] })],
    ["invalid secret", () => ({ ...validBody(), trackingSecret: "short" })],
    ["invalid challenge", () => ({ ...validBody(), turnstileToken: "" })],
  ])("rejects %s before repository access", (_label, build) => {
    expect(() => parseCreateOrderRequest(build())).toThrow(
      expect.objectContaining({ code: "INVALID_REQUEST" }),
    );
  });
});

describe("canonicalizeCreateMaterial", () => {
  it("excludes challenge and presentation ordering while retaining semantics", () => {
    const first = parseCreateOrderRequest(validBody());
    const reordered = parseCreateOrderRequest({
      ...validBody(),
      turnstileToken: "a-fresh-token",
      items: [
        { menuItemId: ITEM_A, quantity: 1, optionIds: [] },
        { menuItemId: ITEM_B, quantity: 2, optionIds: [OPTION_A, OPTION_B] },
      ],
    });
    expect(canonicalizeCreateMaterial(first, "ab".repeat(32))).toEqual(
      canonicalizeCreateMaterial(reordered, "ab".repeat(32)),
    );
  });

  it("retains every material semantic and the tracking digest", () => {
    const parsed = parseCreateOrderRequest(validBody());
    const baseline = canonicalizeCreateMaterial(parsed, "ab".repeat(32));
    const changed = canonicalizeCreateMaterial(
      { ...parsed, customer: { ...parsed.customer, name: "Grace Hopper" } },
      "ab".repeat(32),
    );
    expect(changed).not.toEqual(baseline);
    expect(canonicalizeCreateMaterial(parsed, "cd".repeat(32))).not.toEqual(
      baseline,
    );
  });

  it("matches PostgreSQL jsonb fingerprint bytes", () => {
    const parsed = parseCreateOrderRequest(validBody());
    expect(
      fingerprintCreateMaterial(
        canonicalizeCreateMaterial(parsed, "ab".repeat(32)),
      ),
    ).toBe("27f38faa76a381c1c7bc97dd2c66d04ecffd2aabf139e098ad8d85c688a1bb98");
  });
});

describe("bounded endpoint bodies", () => {
  it("counts streamed bytes even when content-length is absent or forged", async () => {
    const request = new Request("http://127.0.0.1/api/order", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "1" },
      body: JSON.stringify({ value: "x".repeat(MAX_ORDER_BODY_BYTES) }),
    });
    await expect(readBoundedJson(request, MAX_ORDER_BODY_BYTES)).rejects.toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
    });
  });

  it("rejects wrong content type and malformed JSON", async () => {
    await expect(
      readBoundedJson(
        new Request("http://127.0.0.1/api/order", {
          method: "POST",
          headers: { "content-type": "text/plain" },
          body: "{}",
        }),
        MAX_ORDER_BODY_BYTES,
      ),
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });

    await expect(
      readBoundedJson(
        new Request("http://127.0.0.1/api/order", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{",
        }),
        MAX_ORDER_BODY_BYTES,
      ),
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });

  it("strictly validates status and recovery bodies", () => {
    expect(parseStatusRequest({ trackingSecret: SECRET })).toEqual({
      trackingSecret: SECRET,
    });
    expect(
      parseRecoveryRequest({ attemptId: ATTEMPT, trackingSecret: SECRET }),
    ).toEqual({ attemptId: ATTEMPT, trackingSecret: SECRET });
    expect(() => parseStatusRequest({ trackingSecret: SECRET, orderNumber: "LD-1" })).toThrow();
    expect(() => parseRecoveryRequest({ trackingSecret: SECRET })).toThrow();
  });
});
