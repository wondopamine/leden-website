import { describe, expect, it } from "vitest";

import {
  buildPendingStaffCleanupManifest,
  buildStaffCleanupManifest,
  buildSyntheticStaffCredentials,
  parseStaffSetupArgs,
} from "../../scripts/setup-lifecycle-staff.mjs";

const RUN_ID = "20260824T120000Z-8d71d2cb";
const USER_ID = "d6000000-0000-4000-8000-000000000001";

describe("parseStaffSetupArgs", () => {
  it("defaults to a non-mutating preview and requires an exact run ID", () => {
    expect(parseStaffSetupArgs(["--run-id", RUN_ID])).toEqual({
      execute: false,
      runId: RUN_ID,
    });
    expect(() => parseStaffSetupArgs([])).toThrow(/--run-id/);
    expect(() => parseStaffSetupArgs(["--run-id", "E2E-*"])).toThrow(
      /run ID/i
    );
  });

  it("requires the explicit execute flag and rejects unknown controls", () => {
    expect(
      parseStaffSetupArgs(["--run-id", RUN_ID, "--execute"])
    ).toEqual({ execute: true, runId: RUN_ID });
    expect(() => parseStaffSetupArgs(["--run-id", RUN_ID, "--hosted"])).toThrow(
      /unknown argument/i
    );
  });
});

describe("buildSyntheticStaffCredentials", () => {
  it("derives synthetic email identity from the run but keeps password entropy injected", () => {
    expect(buildSyntheticStaffCredentials(RUN_ID, "opaque-Aa1!-entropy")).toEqual({
      email: "lifecycle-20260824t120000z-8d71d2cb@example.invalid",
      password: "opaque-Aa1!-entropy",
    });
  });
});

describe("buildStaffCleanupManifest", () => {
  it("journals an empty exact cleanup intent before the first external mutation", () => {
    expect(buildPendingStaffCleanupManifest(RUN_ID)).toEqual({
      version: 2,
      runId: RUN_ID,
      target: { kind: "local", projectRef: null },
      records: {
        staffMembershipUserIds: [],
        orderItemIds: [],
        orderStatusEventIds: [],
        orderIds: [],
        orderAttemptIds: [],
        trackingTokenDigests: [],
        rateBucketIds: [],
        authUserIds: [],
      },
    });
  });

  it("records the exact generated Auth UUID twice for membership-first cleanup", () => {
    expect(buildStaffCleanupManifest(RUN_ID, USER_ID)).toEqual({
      version: 2,
      runId: RUN_ID,
      target: { kind: "local", projectRef: null },
      records: {
        staffMembershipUserIds: [USER_ID],
        orderItemIds: [],
        orderStatusEventIds: [],
        orderIds: [],
        orderAttemptIds: [],
        trackingTokenDigests: [],
        rateBucketIds: [],
        authUserIds: [USER_ID],
      },
    });
  });
});
