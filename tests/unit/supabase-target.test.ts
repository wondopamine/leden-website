import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  ENVIRONMENT_SENTINEL_BOOTSTRAP_SHA256,
  LOCAL_SUPABASE_URL,
  SupabaseTargetError,
  assertSafeSupabaseMutationTarget,
  readEnvironmentSentinel,
  type MutationTargetInput,
} from "../e2e/helpers/supabase-target";

const RUN_ID = "20260824T120000Z-8d71d2cb";
const STAGING_REF = "abcdefghijklmnopqrst";
const PRODUCTION_REF = "zyxwvutsrqponmlkjihg";

function cleanupCapability() {
  return {
    available: true as const,
    runId: RUN_ID,
  };
}

function sentinel(environment: "local" | "staging") {
  return {
    environment,
    bootstrapChecksum: ENVIRONMENT_SENTINEL_BOOTSTRAP_SHA256,
  };
}

function localInput(
  overrides: Partial<MutationTargetInput> = {}
): MutationTargetInput {
  return {
    supabaseUrl: LOCAL_SUPABASE_URL,
    mutationTarget: "local",
    sentinel: sentinel("local"),
    cleanup: cleanupCapability(),
    ...overrides,
  };
}

function stagingInput(
  overrides: Partial<MutationTargetInput> = {}
): MutationTargetInput {
  return {
    supabaseUrl: `https://${STAGING_REF}.supabase.co`,
    mutationTarget: `staging:${STAGING_REF}`,
    expectedStagingProjectRef: STAGING_REF,
    productionProjectRef: PRODUCTION_REF,
    sentinel: sentinel("staging"),
    cleanup: cleanupCapability(),
    ...overrides,
  };
}

function expectTargetError(
  input: MutationTargetInput,
  code: SupabaseTargetError["code"]
) {
  try {
    assertSafeSupabaseMutationTarget(input);
    throw new Error("Expected target validation to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(SupabaseTargetError);
    expect((error as SupabaseTargetError).code).toBe(code);
  }
}

describe("assertSafeSupabaseMutationTarget", () => {
  it("accepts only the committed loopback target in local mode", () => {
    expect(assertSafeSupabaseMutationTarget(localInput())).toEqual({
      kind: "local",
      projectRef: null,
      runId: RUN_ID,
      supabaseUrl: LOCAL_SUPABASE_URL,
    });
  });

  it("accepts hosted staging only after every independent check agrees", () => {
    expect(assertSafeSupabaseMutationTarget(stagingInput())).toEqual({
      kind: "staging",
      projectRef: STAGING_REF,
      runId: RUN_ID,
      supabaseUrl: `https://${STAGING_REF}.supabase.co`,
    });
  });

  it.each([
    ["missing target marker", { mutationTarget: undefined }, "MISSING_TARGET_MARKER"],
    ["localhost alias", { supabaseUrl: "http://localhost:54321" }, "UNSAFE_LOCAL_URL"],
    ["wrong local port", { supabaseUrl: "http://127.0.0.1:54322" }, "UNSAFE_LOCAL_URL"],
    ["hosted URL in local mode", { supabaseUrl: `https://${STAGING_REF}.supabase.co` }, "UNSAFE_LOCAL_URL"],
    ["missing cleanup", { cleanup: undefined }, "CLEANUP_UNAVAILABLE"],
    ["invalid cleanup run ID", { cleanup: { available: true, runId: "E2E-*" } }, "INVALID_RUN_ID"],
    ["missing sentinel", { sentinel: undefined }, "MISSING_SENTINEL"],
    ["forged local marker", { sentinel: sentinel("staging") }, "SENTINEL_MISMATCH"],
    [
      "wrong sentinel checksum",
      { sentinel: { environment: "local", bootstrapChecksum: "0".repeat(64) } },
      "SENTINEL_CHECKSUM_MISMATCH",
    ],
  ] as const)("rejects %s", (_name, overrides, code) => {
    expectTargetError(localInput(overrides), code);
  });

  it.each([
    ["missing staging ref", { expectedStagingProjectRef: undefined }, "MISSING_STAGING_REF"],
    ["invalid staging ref", { expectedStagingProjectRef: "STAGING" }, "INVALID_STAGING_REF"],
    ["missing production denylist", { productionProjectRef: undefined }, "MISSING_PRODUCTION_REF"],
    ["invalid production ref", { productionProjectRef: "production" }, "INVALID_PRODUCTION_REF"],
    ["matching staging and production refs", { productionProjectRef: STAGING_REF }, "PRODUCTION_TARGET"],
    ["URL/ref mismatch", { expectedStagingProjectRef: "aaaaaaaaaaaaaaaaaaaa" }, "STAGING_REF_MISMATCH"],
    ["marker/ref mismatch", { mutationTarget: "staging:aaaaaaaaaaaaaaaaaaaa" }, "TARGET_MARKER_MISMATCH"],
    ["forged staging marker", { sentinel: sentinel("local") }, "SENTINEL_MISMATCH"],
    ["non-Supabase hostname", { supabaseUrl: "https://example.com" }, "UNSAFE_HOSTED_URL"],
    ["URL with credentials", { supabaseUrl: `https://user@${STAGING_REF}.supabase.co` }, "UNSAFE_HOSTED_URL"],
    ["URL with a path", { supabaseUrl: `https://${STAGING_REF}.supabase.co/rest/v1` }, "UNSAFE_HOSTED_URL"],
    ["malformed URL", { supabaseUrl: "not a URL" }, "MALFORMED_URL"],
  ] as const)("rejects %s", (_name, overrides, code) => {
    expectTargetError(stagingInput(overrides), code);
  });

  it("does not treat an arbitrary staging alias as proof", () => {
    expectTargetError(
      stagingInput({ mutationTarget: "staging" }),
      "TARGET_MARKER_MISMATCH"
    );
  });
});

describe("environment sentinel bootstrap pin", () => {
  it("matches the committed checksum manifest and helper constant", () => {
    const bootstrapPath = join(
      process.cwd(),
      "supabase/bootstrap/environment-sentinel.sql"
    );
    const manifestPath = join(
      process.cwd(),
      "supabase/bootstrap/environment-sentinel.sha256"
    );
    const digest = createHash("sha256")
      .update(readFileSync(bootstrapPath))
      .digest("hex");
    const manifestDigest = readFileSync(manifestPath, "utf8").split(/\s+/)[0];

    expect(digest).toBe(ENVIRONMENT_SENTINEL_BOOTSTRAP_SHA256);
    expect(manifestDigest).toBe(ENVIRONMENT_SENTINEL_BOOTSTRAP_SHA256);
  });
});

describe("readEnvironmentSentinel", () => {
  it("returns one validated protected-RPC row", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          environment: "staging",
          bootstrap_checksum: ENVIRONMENT_SENTINEL_BOOTSTRAP_SHA256,
        },
      ],
      error: null,
    });

    await expect(readEnvironmentSentinel({ rpc })).resolves.toEqual(
      sentinel("staging")
    );
    expect(rpc).toHaveBeenCalledWith("get_lifecycle_environment_sentinel");
  });

  it("fails closed when the protected RPC errors", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "not exposed" },
    });

    await expect(readEnvironmentSentinel({ rpc })).rejects.toMatchObject({
      code: "SENTINEL_READ_FAILED",
    });
  });

  it.each([null, [], [{ environment: "local" }], [{ environment: "production", bootstrap_checksum: "a".repeat(64) }]])(
    "rejects malformed sentinel data: %j",
    async (data) => {
      const rpc = vi.fn().mockResolvedValue({ data, error: null });
      await expect(readEnvironmentSentinel({ rpc })).rejects.toMatchObject({
        code: "INVALID_SENTINEL",
      });
    }
  );
});
