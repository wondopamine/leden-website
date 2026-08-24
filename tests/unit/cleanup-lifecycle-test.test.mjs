import { describe, expect, it } from "vitest";

import {
  assertCleanupTargetMatch,
  assertExactDeletionResult,
  buildDeletionPlan,
  parseCleanupArgs,
  resolveCleanupManifestPath,
  resolveStaffCredentialsPath,
  validateCleanupManifest,
} from "../../scripts/cleanup-lifecycle-test.mjs";

const RUN_ID = "20260824T120000Z-8d71d2cb";

function manifest(overrides = {}) {
  return {
    version: 1,
    runId: RUN_ID,
    target: { kind: "local", projectRef: null },
    records: {
      staffMembershipUserIds: [],
      orderItemIds: ["d4000000-0000-4000-8000-000000000001"],
      orderIds: ["d5000000-0000-4000-8000-000000000001"],
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
        ...legacyManifest.records,
        authUserIds: [],
      },
    });
  });

  it.each([
    ["wrong version", { version: 2 }],
    ["wrong run", { runId: "20260824T120001Z-aaaaaaaa" }],
    ["production target", { target: { kind: "production", projectRef: null } }],
    ["unknown record collection", { records: { staffMembershipUserIds: [], orderItemIds: [], orderIds: [], authUserIds: [], customerIds: ["d4000000-0000-4000-8000-000000000001"] } }],
    ["wildcard ID", { records: { staffMembershipUserIds: [], orderItemIds: ["*"], orderIds: [], authUserIds: [] } }],
    ["duplicate ID", { records: { staffMembershipUserIds: [], orderItemIds: [], orderIds: ["d5000000-0000-4000-8000-000000000001", "d5000000-0000-4000-8000-000000000001"], authUserIds: [] } }],
    ["mismatched staff fixture IDs", { records: { staffMembershipUserIds: ["d5000000-0000-4000-8000-000000000001"], orderItemIds: [], orderIds: [], authUserIds: [] } }],
  ])("rejects %s", (_name, override) => {
    expect(() => validateCleanupManifest(manifest(override), RUN_ID)).toThrow();
  });
});

describe("buildDeletionPlan", () => {
  it("deletes child rows before parent rows and never broadens IDs", () => {
    expect(buildDeletionPlan(validateCleanupManifest(manifest(), RUN_ID))).toEqual([
      {
        table: "order_items",
        idColumn: "id",
        ids: ["d4000000-0000-4000-8000-000000000001"],
      },
      {
        table: "orders",
        idColumn: "id",
        ids: ["d5000000-0000-4000-8000-000000000001"],
      },
    ]);
  });

  it("keeps explicit empty collections as no-op cleanup", () => {
    const emptyManifest = manifest({
      records: {
        staffMembershipUserIds: [],
        orderItemIds: [],
        orderIds: [],
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
        authUserIds: [userId],
      },
    });

    expect(
      buildDeletionPlan(validateCleanupManifest(staffManifest, RUN_ID))
    ).toEqual([
      { table: "admin_users", idColumn: "user_id", ids: [userId] },
    ]);
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
