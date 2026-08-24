import { isIP } from "node:net";

import { describe, expect, it } from "vitest";

import {
  deriveLifecycleClientIp,
  deriveLifecycleRateKeyHex,
} from "../e2e/helpers/lifecycle-identity.mjs";

describe("lifecycle run-scoped identity", () => {
  it("derives cleanup identities for the shortest canonical run suffix", () => {
    const runId = "20260824T120000Z-8d71d2cb";
    expect(isIP(deriveLifecycleClientIp(runId))).toBe(6);
    expect(
      deriveLifecycleRateKeyHex(
        runId,
        "v1",
        "synthetic-lifecycle-hmac-key-with-at-least-32-bytes",
      ),
    ).toMatch(/^[0-9a-f]{64}$/);
  });

  it("keeps distinct accepted run IDs in distinct rate buckets", () => {
    const key = "synthetic-lifecycle-hmac-key-with-at-least-32-bytes";
    expect(
      deriveLifecycleRateKeyHex("20260824T120000Z-8d71d2cb", "v1", key),
    ).not.toBe(
      deriveLifecycleRateKeyHex("20260824T120000Z-8d71d2cc", "v1", key),
    );
  });

  it("rejects a run ID that the shared target contract rejects", () => {
    expect(() => deriveLifecycleClientIp("20260824T120000Z-short")).toThrow();
  });
});
