import { describe, expect, it } from "vitest";

import {
  assertCleanupTargetMatch,
  assertExactDeletionResult,
  buildCascadeVerificationPlan,
  buildDeletionPlan,
  mergeResolvedAuthArtifacts,
  mergeResolvedOrderIds,
  parseCleanupArgs,
  resolveCleanupManifestPath,
  resolveStaffCredentialsPath,
  validateCleanupManifest,
} from "../../scripts/cleanup-lifecycle-test.mjs";

const RUN_ID = "20260824T120000Z-8d71d2cb";

function manifest(overrides = {}) {
  return {
    version: 2,
    runId: RUN_ID,
    target: { kind: "local", projectRef: null },
    records: {
      staffMembershipUserIds: [],
      orderItemIds: ["d4000000-0000-4000-8000-000000000001"],
      orderStatusEventIds: ["d4000000-0000-4000-8000-000000000002"],
      orderIds: ["d5000000-0000-4000-8000-000000000001"],
      orderAttemptIds: ["d7000000-0000-4000-8000-000000000001"],
      trackingTokenDigests: ["a".repeat(64)],
      rateBucketIds: ["d4000000-0000-4000-8000-000000000003"],
      authUserIds: [],
    },
    ...overrides,
  };
}

describe("parseCleanupArgs", () => {
  it("defaults to a non-mutating dry run", () => {
    expect(parseCleanupArgs(["--run-id", RUN_ID])).toEqual({
      execute: false,
      runId: RUN_ID,
    });
  });

  it("requires an explicit run ID and execute flag", () => {
    expect(parseCleanupArgs(["--run-id", RUN_ID, "--execute"])).toEqual({
      execute: true,
      runId: RUN_ID,
    });
    expect(() => parseCleanupArgs([])).toThrow(/--run-id/);
    expect(() => parseCleanupArgs(["--run-id", "E2E-*"])).toThrow(/run ID/i);
    expect(() => parseCleanupArgs(["--all"])).toThrow(/unknown argument/i);
  });
});

describe("validateCleanupManifest", () => {
  it("accepts exact UUID records for the requested run", () => {
    expect(validateCleanupManifest(manifest(), RUN_ID)).toEqual(manifest());
  });

  it("keeps version-one order-only manifests from U1 cleanup-compatible", () => {
    const legacyManifest = {
      version: 1,
      runId: RUN_ID,
      target: { kind: "local", projectRef: null },
      records: {
        orderItemIds: ["d4000000-0000-4000-8000-000000000001"],
        orderIds: ["d5000000-0000-4000-8000-000000000001"],
      },
    };

    expect(validateCleanupManifest(legacyManifest, RUN_ID)).toEqual({
      ...legacyManifest,
      records: {
        staffMembershipUserIds: [],
        orderStatusEventIds: [],
        orderAttemptIds: [],
        trackingTokenDigests: [],
        rateBucketIds: [],
        ...legacyManifest.records,
        authUserIds: [],
      },
    });
  });

  it.each([
    ["wrong version", { version: 3 }],
    ["wrong run", { runId: "20260824T120001Z-aaaaaaaa" }],
    ["production target", { target: { kind: "production", projectRef: null } }],
    ["unknown record collection", { records: { staffMembershipUserIds: [], orderItemIds: [], orderStatusEventIds: [], orderIds: [], orderAttemptIds: [], rateBucketIds: [], authUserIds: [], customerIds: ["d4000000-0000-4000-8000-000000000001"] } }],
    ["wildcard ID", { records: { staffMembershipUserIds: [], orderItemIds: ["*"], orderStatusEventIds: [], orderIds: [], orderAttemptIds: [], rateBucketIds: [], authUserIds: [] } }],
    ["duplicate ID", { records: { staffMembershipUserIds: [], orderItemIds: [], orderStatusEventIds: [], orderIds: ["d5000000-0000-4000-8000-000000000001", "d5000000-0000-4000-8000-000000000001"], orderAttemptIds: [], rateBucketIds: [], authUserIds: [] } }],
    ["invalid tracking digest", { records: { staffMembershipUserIds: [], orderItemIds: [], orderStatusEventIds: [], orderIds: [], orderAttemptIds: [], trackingTokenDigests: ["not-a-digest"], rateBucketIds: [], authUserIds: [] } }],
    ["staff fixture absent from auth cleanup", { records: { staffMembershipUserIds: ["d5000000-0000-4000-8000-000000000001"], orderItemIds: [], orderStatusEventIds: [], orderIds: [], orderAttemptIds: [], rateBucketIds: [], authUserIds: [] } }],
  ])("rejects %s", (_name, override) => {
    expect(() => validateCleanupManifest(manifest(override), RUN_ID)).toThrow();
  });
});

describe("buildDeletionPlan", () => {
  it("deletes independent buckets and exact parents, then relies on immutable cascades", () => {
    expect(buildDeletionPlan(validateCleanupManifest(manifest(), RUN_ID))).toEqual([
      {
        table: "order_rate_buckets",
        idColumn: "id",
        ids: ["d4000000-0000-4000-8000-000000000003"],
      },
      {
        table: "orders",
        idColumn: "id",
        ids: ["d5000000-0000-4000-8000-000000000001"],
      },
    ]);
    expect(
      buildCascadeVerificationPlan(validateCleanupManifest(manifest(), RUN_ID))
    ).toEqual([
      {
        table: "order_items",
        idColumn: "id",
        ids: ["d4000000-0000-4000-8000-000000000001"],
      },
      {
        table: "order_status_events",
        idColumn: "id",
        ids: ["d4000000-0000-4000-8000-000000000002"],
      },
    ]);
  });

  it("keeps explicit empty collections as no-op cleanup", () => {
    const emptyManifest = manifest({
      records: {
        staffMembershipUserIds: [],
        orderItemIds: [],
        orderStatusEventIds: [],
        orderIds: [],
        orderAttemptIds: [],
        rateBucketIds: [],
        authUserIds: [],
      },
    });
    expect(buildDeletionPlan(validateCleanupManifest(emptyManifest, RUN_ID))).toEqual([]);
  });

  it("revokes staff membership before deleting the exact Auth user", () => {
    const userId = "d6000000-0000-4000-8000-000000000001";
    const staffManifest = manifest({
      records: {
        staffMembershipUserIds: [userId],
        orderItemIds: [],
        orderIds: [],
        orderAttemptIds: [],
        authUserIds: [userId],
      },
    });

    expect(
      buildDeletionPlan(validateCleanupManifest(staffManifest, RUN_ID))
    ).toEqual([
      { table: "admin_users", idColumn: "user_id", ids: [userId] },
    ]);
  });

  it("permits an exact unlisted Auth fixture without inventing staff membership", () => {
    const userId = "d6000000-0000-4000-8000-000000000002";
    const unlistedManifest = manifest({
      records: {
        staffMembershipUserIds: [],
        orderItemIds: [],
        orderStatusEventIds: [],
        orderIds: [],
        orderAttemptIds: [],
        rateBucketIds: [],
        authUserIds: [userId],
      },
    });
    expect(validateCleanupManifest(unlistedManifest, RUN_ID)).toEqual(
      {
        ...unlistedManifest,
        records: {
          ...unlistedManifest.records,
          trackingTokenDigests: [],
        },
      },
    );
  });

  it("merges orders resolved from pre-recorded attempts for interrupted cleanup", () => {
    const resolvedId = "d5000000-0000-4000-8000-000000000002";
    expect(
      mergeResolvedOrderIds(validateCleanupManifest(manifest(), RUN_ID), [
        resolvedId,
      ]).records.orderIds,
    ).toEqual([
      "d5000000-0000-4000-8000-000000000001",
      resolvedId,
    ]);
  });

  it("merges an exact run-tagged unlisted Auth fixture after interruption", () => {
    const userId = "d6000000-0000-4000-8000-000000000002";
    const resolved = mergeResolvedAuthArtifacts(
      validateCleanupManifest(manifest(), RUN_ID),
      [userId],
      [],
    );
    expect(resolved.records.authUserIds).toContain(userId);
    expect(resolved.records.staffMembershipUserIds).not.toContain(userId);
  });
});

describe("assertCleanupTargetMatch", () => {
  it("accepts only the independently verified target recorded by the run", () => {
    expect(() =>
      assertCleanupTargetMatch(manifest(), {
        kind: "local",
        projectRef: null,
      })
    ).not.toThrow();
    expect(() =>
      assertCleanupTargetMatch(manifest(), {
        kind: "staging",
        projectRef: "abcdefghijklmnopqrst",
      })
    ).toThrow(/does not match/);
  });
});

describe("assertExactDeletionResult", () => {
  const step = {
    table: "orders",
    idColumn: "id",
    ids: ["d5000000-0000-4000-8000-000000000001"],
  };

  it("accepts both a fresh deletion and an already-clean interrupted rerun", () => {
    expect(() =>
      assertExactDeletionResult(step, [{ id: step.ids[0] }], [])
    ).not.toThrow();
    expect(() => assertExactDeletionResult(step, [], [])).not.toThrow();
  });

  it("rejects unexpected deletion results or any requested ID that remains", () => {
    expect(() =>
      assertExactDeletionResult(
        step,
        [{ id: "d5000000-0000-4000-8000-000000000002" }],
        []
      )
    ).toThrow(/unexpected/i);
    expect(() =>
      assertExactDeletionResult(step, [], [{ id: step.ids[0] }])
    ).toThrow(/verification failed/i);
  });
});

describe("resolveCleanupManifestPath", () => {
  it("uses the per-run untracked directory without globbing", () => {
    expect(resolveCleanupManifestPath(RUN_ID, "/repo")).toBe(
      `/repo/.lifecycle-tests/runs/${RUN_ID}.json`
    );
  });

  it("keeps synthetic staff credentials beside the untracked recovery manifest", () => {
    expect(resolveStaffCredentialsPath(RUN_ID, "/repo")).toBe(
      `/repo/.lifecycle-tests/runs/${RUN_ID}.staff.json`
    );
  });
});
