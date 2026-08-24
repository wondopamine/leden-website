#!/usr/bin/env node

import { readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";

import * as targetSafety from "../tests/e2e/helpers/supabase-target.ts";
import { deriveLifecycleRateKeyHex } from "../tests/e2e/helpers/lifecycle-identity.mjs";

const targetSafetyExports = targetSafety.default ?? targetSafety;
const {
  assertSafeSupabaseMutationTarget,
  isValidLifecycleRunId,
  readEnvironmentSentinel,
} = targetSafetyExports;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;
const MAX_IDS_PER_COLLECTION = 500;
const RECORD_KEYS = [
  "staffMembershipUserIds",
  "orderItemIds",
  "orderStatusEventIds",
  "orderIds",
  "orderAttemptIds",
  "trackingTokenDigests",
  "rateBucketIds",
  "authUserIds",
];

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
}

function validateUuidList(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array of exact UUIDs.`);
  }
  if (value.length > MAX_IDS_PER_COLLECTION) {
    throw new Error(`${label} exceeds the per-run cleanup limit.`);
  }
  if (value.some((id) => typeof id !== "string" || !UUID_PATTERN.test(id))) {
    throw new Error(`${label} contains a non-UUID identifier.`);
  }
  if (new Set(value).size !== value.length) {
    throw new Error(`${label} contains a duplicate identifier.`);
  }
  return value;
}

function validateSha256List(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array of SHA-256 digests.`);
  }
  if (value.length > MAX_IDS_PER_COLLECTION) {
    throw new Error(`${label} exceeds the per-run cleanup limit.`);
  }
  if (
    value.some(
      (digest) => typeof digest !== "string" || !/^[0-9a-f]{64}$/.test(digest),
    )
  ) {
    throw new Error(`${label} contains an invalid SHA-256 digest.`);
  }
  if (new Set(value).size !== value.length) {
    throw new Error(`${label} contains a duplicate digest.`);
  }
  return value;
}

export function parseCleanupArgs(argv) {
  let runId;
  let execute = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--run-id") {
      runId = argv[index + 1];
      index += 1;
    } else if (argument === "--execute") {
      execute = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!runId) {
    throw new Error("--run-id is required.");
  }
  if (!isValidLifecycleRunId(runId)) {
    throw new Error("Cleanup run ID has an invalid shape.");
  }

  return { execute, runId };
}

export function resolveCleanupManifestPath(runId, workspaceRoot = process.cwd()) {
  if (!isValidLifecycleRunId(runId)) {
    throw new Error("Cleanup run ID has an invalid shape.");
  }
  return join(workspaceRoot, ".lifecycle-tests", "runs", `${runId}.json`);
}

export function resolveStaffCredentialsPath(
  runId,
  workspaceRoot = process.cwd()
) {
  if (!isValidLifecycleRunId(runId)) {
    throw new Error("Cleanup run ID has an invalid shape.");
  }
  return join(
    workspaceRoot,
    ".lifecycle-tests",
    "runs",
    `${runId}.staff.json`
  );
}

export function validateCleanupManifest(value, requestedRunId) {
  const manifest = requireObject(value, "Cleanup manifest");
  if (manifest.version !== 1 && manifest.version !== 2) {
    throw new Error("Cleanup manifest version must be 1 or 2.");
  }
  if (manifest.runId !== requestedRunId) {
    throw new Error("Cleanup manifest run ID does not match --run-id.");
  }

  const target = requireObject(manifest.target, "Cleanup target");
  if (target.kind !== "local" && target.kind !== "staging") {
    throw new Error("Cleanup target must be local or staging.");
  }
  if (
    target.kind === "local" &&
    target.projectRef !== null
  ) {
    throw new Error("Local cleanup target cannot name a hosted project.");
  }
  if (
    target.kind === "staging" &&
    (typeof target.projectRef !== "string" ||
      !PROJECT_REF_PATTERN.test(target.projectRef))
  ) {
    throw new Error("Staging cleanup target requires an exact project ref.");
  }

  const records = requireObject(manifest.records, "Cleanup records");
  const unknownRecordKeys = Object.keys(records).filter(
    (key) => !RECORD_KEYS.includes(key)
  );
  if (unknownRecordKeys.length > 0) {
    throw new Error(
      `Cleanup manifest contains unsupported records: ${unknownRecordKeys.join(", ")}`
    );
  }

  const staffMembershipUserIds = validateUuidList(
    records.staffMembershipUserIds ?? [],
    "records.staffMembershipUserIds"
  );
  const orderItemIds = validateUuidList(
    records.orderItemIds ?? [],
    "records.orderItemIds"
  );
  const orderStatusEventIds = validateUuidList(
    records.orderStatusEventIds ?? [],
    "records.orderStatusEventIds"
  );
  const orderIds = validateUuidList(records.orderIds ?? [], "records.orderIds");
  const orderAttemptIds = validateUuidList(
    records.orderAttemptIds ?? [],
    "records.orderAttemptIds"
  );
  const trackingTokenDigests = validateSha256List(
    records.trackingTokenDigests ?? [],
    "records.trackingTokenDigests",
  );
  const rateBucketIds = validateUuidList(
    records.rateBucketIds ?? [],
    "records.rateBucketIds"
  );
  const authUserIds = validateUuidList(
    records.authUserIds ?? [],
    "records.authUserIds"
  );
  if (
    staffMembershipUserIds.some((id) => !authUserIds.includes(id))
  ) {
    throw new Error(
      "Every staff membership ID must also be an Auth user ID for cleanup."
    );
  }

  return {
    version: manifest.version,
    runId: manifest.runId,
    target: {
      kind: target.kind,
      projectRef: target.projectRef,
    },
    records: {
      staffMembershipUserIds,
      orderItemIds,
      orderStatusEventIds,
      orderIds,
      orderAttemptIds,
      trackingTokenDigests,
      rateBucketIds,
      authUserIds,
    },
  };
}

export function mergeResolvedOrderIds(manifest, resolvedOrderIds) {
  const orderIds = validateUuidList(
    [...new Set([...manifest.records.orderIds, ...resolvedOrderIds])],
    "resolved order IDs"
  );
  return {
    ...manifest,
    records: { ...manifest.records, orderIds },
  };
}

export function mergeResolvedAuthArtifacts(
  manifest,
  resolvedAuthUserIds,
  resolvedStaffMembershipUserIds,
) {
  const authUserIds = validateUuidList(
    [...new Set([...manifest.records.authUserIds, ...resolvedAuthUserIds])],
    "resolved Auth user IDs",
  );
  const staffMembershipUserIds = validateUuidList(
    [
      ...new Set([
        ...manifest.records.staffMembershipUserIds,
        ...resolvedStaffMembershipUserIds,
      ]),
    ],
    "resolved staff membership user IDs",
  );
  if (staffMembershipUserIds.some((id) => !authUserIds.includes(id))) {
    throw new Error("Resolved staff membership is missing its Auth user.");
  }
  return {
    ...manifest,
    records: {
      ...manifest.records,
      authUserIds,
      staffMembershipUserIds,
    },
  };
}

async function resolveOrderIdsFromAttempts(client, manifest) {
  if (manifest.records.orderAttemptIds.length === 0) return [];
  const { data, error } = await client
    .from("orders")
    .select("id, idempotency_key")
    .in("idempotency_key", manifest.records.orderAttemptIds);
  if (error || !Array.isArray(data)) {
    throw new Error("Exact cleanup could not resolve recorded order attempts.");
  }
  const expectedAttempts = new Set(manifest.records.orderAttemptIds);
  if (
    data.some(
      (row) =>
        !row ||
        typeof row.id !== "string" ||
        typeof row.idempotency_key !== "string" ||
        !expectedAttempts.has(row.idempotency_key)
    )
  ) {
    throw new Error("Exact cleanup resolved an unexpected order attempt.");
  }
  return data.map((row) => row.id);
}

async function resolveAuthUserIdsFromRun(client, runId) {
  const resolved = [];
  const perPage = 100;
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error || !Array.isArray(data?.users)) {
      throw new Error("Exact cleanup could not resolve run-tagged Auth users.");
    }
    for (const user of data.users) {
      const metadata = user.user_metadata;
      if (
        metadata &&
        metadata.lifecycle_run_id === runId &&
        metadata.synthetic === true
      ) {
        resolved.push(user.id);
      }
    }
    if (data.users.length < perPage) return resolved;
  }
  throw new Error("Exact cleanup exceeded the Auth pagination safety limit.");
}

async function resolveInterruptedArtifacts(client, manifest) {
  const resolvedOrderIds = await resolveOrderIdsFromAttempts(client, manifest);
  let resolved = mergeResolvedOrderIds(manifest, resolvedOrderIds);
  if (resolved.version !== 2) return resolved;

  const resolvedAuthUserIds = await resolveAuthUserIdsFromRun(
    client,
    resolved.runId,
  );
  const { data: memberships, error: membershipError } =
    resolvedAuthUserIds.length > 0
      ? await client
          .from("admin_users")
          .select("user_id")
          .in("user_id", resolvedAuthUserIds)
      : { data: [], error: null };
  if (membershipError || !Array.isArray(memberships)) {
    throw new Error("Exact cleanup could not resolve run-tagged staff membership.");
  }
  resolved = mergeResolvedAuthArtifacts(
    resolved,
    resolvedAuthUserIds,
    memberships.map((row) => row.user_id),
  );

  const orderIds = resolved.records.orderIds;
  const rateKeyHex = deriveLifecycleRateKeyHex(
    resolved.runId,
    process.env.ORDER_ABUSE_HMAC_VERSION ?? "",
    process.env.ORDER_ABUSE_HMAC_KEY_V1 ?? "",
  );
  const [itemsResult, eventsResult, bucketsResult] = await Promise.all([
    orderIds.length
      ? client.from("order_items").select("id").in("order_id", orderIds)
      : Promise.resolve({ data: [], error: null }),
    orderIds.length
      ? client
          .from("order_status_events")
          .select("id")
          .in("order_id", orderIds)
      : Promise.resolve({ data: [], error: null }),
    client
      .from("order_rate_buckets")
      .select("id")
      .eq("key_hash", `\\x${rateKeyHex}`)
      .in("purpose", ["create", "status", "recovery"]),
  ]);
  if (itemsResult.error || eventsResult.error || bucketsResult.error) {
    throw new Error("Interrupted lifecycle artifacts could not be resolved exactly.");
  }
  return {
    ...resolved,
    records: {
      ...resolved.records,
      orderItemIds: [
        ...new Set([
          ...resolved.records.orderItemIds,
          ...(itemsResult.data ?? []).map((row) => row.id),
        ]),
      ],
      orderStatusEventIds: [
        ...new Set([
          ...resolved.records.orderStatusEventIds,
          ...(eventsResult.data ?? []).map((row) => row.id),
        ]),
      ],
      rateBucketIds: [
        ...new Set([
          ...resolved.records.rateBucketIds,
          ...(bucketsResult.data ?? []).map((row) => row.id),
        ]),
      ],
    },
  };
}

export function buildDeletionPlan(manifest) {
  const plan = [];
  if (manifest.records.staffMembershipUserIds.length > 0) {
    plan.push({
      table: "admin_users",
      idColumn: "user_id",
      ids: [...manifest.records.staffMembershipUserIds],
    });
  }
  if (manifest.records.rateBucketIds.length > 0) {
    plan.push({
      table: "order_rate_buckets",
      idColumn: "id",
      ids: [...manifest.records.rateBucketIds],
    });
  }
  if (manifest.records.orderIds.length > 0) {
    plan.push({
      table: "orders",
      idColumn: "id",
      ids: [...manifest.records.orderIds],
    });
  }
  return plan;
}

export function buildCascadeVerificationPlan(manifest) {
  const plan = [];
  if (manifest.records.orderItemIds.length > 0) {
    plan.push({
      table: "order_items",
      idColumn: "id",
      ids: [...manifest.records.orderItemIds],
    });
  }
  if (manifest.records.orderStatusEventIds.length > 0) {
    plan.push({
      table: "order_status_events",
      idColumn: "id",
      ids: [...manifest.records.orderStatusEventIds],
    });
  }
  return plan;
}

export function assertCleanupTargetMatch(manifest, target) {
  if (
    manifest.target.kind !== target.kind ||
    manifest.target.projectRef !== target.projectRef
  ) {
    throw new Error("Cleanup manifest target does not match the verified database.");
  }
}

export function assertExactDeletionResult(step, deletedRows, remainingRows) {
  const requestedIds = new Set(step.ids);
  if (
    deletedRows.some(
      (row) =>
        !row ||
        typeof row[step.idColumn] !== "string" ||
        !requestedIds.has(row[step.idColumn])
    )
  ) {
    throw new Error(`Exact cleanup returned an unexpected ${step.table} identifier.`);
  }

  if (remainingRows.length > 0) {
    throw new Error(`Exact cleanup verification failed for ${step.table}.`);
  }
}

async function deleteAndVerifyExactIds(client, step) {
  const { data, error } = await client
    .from(step.table)
    .delete()
    .in(step.idColumn, step.ids)
    .select(step.idColumn);

  if (error) {
    throw new Error(`Exact cleanup failed for ${step.table}.`);
  }

  const { data: remaining, error: verifyError } = await client
    .from(step.table)
    .select(step.idColumn)
    .in(step.idColumn, step.ids);
  if (verifyError) {
    throw new Error(`Exact cleanup verification failed for ${step.table}.`);
  }

  assertExactDeletionResult(step, data ?? [], remaining ?? []);
}

async function cleanupAndVerifyLifecycleOrders(client, step) {
  const deletedRows = [];
  for (const orderId of step.ids) {
    const { data, error } = await client.rpc(
      "cleanup_lifecycle_test_order_v1",
      { p_order_id: orderId }
    );
    if (error || (data !== orderId && data !== null)) {
      throw new Error("Exact lifecycle order cleanup failed.");
    }
    if (data !== null) {
      deletedRows.push({ [step.idColumn]: data });
    }
  }

  const { data: remaining, error: verifyError } = await client
    .from(step.table)
    .select(step.idColumn)
    .in(step.idColumn, step.ids);
  if (verifyError) {
    throw new Error("Exact lifecycle order cleanup verification failed.");
  }
  assertExactDeletionResult(step, deletedRows, remaining ?? []);
}

async function verifyExactIdsAbsent(client, step) {
  const { data: remaining, error } = await client
    .from(step.table)
    .select(step.idColumn)
    .in(step.idColumn, step.ids);
  if (error || (remaining ?? []).length > 0) {
    throw new Error(`Cascade cleanup verification failed for ${step.table}.`);
  }
}

async function deleteAndVerifyAuthUsers(client, authUserIds) {
  for (const userId of authUserIds) {
    const { error: deleteError } = await client.auth.admin.deleteUser(userId);
    if (deleteError && deleteError.status !== 404) {
      throw new Error("Exact cleanup failed for a synthetic Auth user.");
    }

    const { data, error: verifyError } = await client.auth.admin.getUserById(
      userId
    );
    if (data?.user || !verifyError || verifyError.status !== 404) {
      throw new Error("Exact cleanup verification failed for a synthetic Auth user.");
    }
  }
}

async function loadManifest(runId) {
  const manifestPath = resolveCleanupManifestPath(runId);
  let serialized;
  try {
    serialized = await readFile(manifestPath, "utf8");
  } catch {
    throw new Error(`Cleanup manifest not found for run ${runId}.`);
  }

  let parsed;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error(`Cleanup manifest is not valid JSON for run ${runId}.`);
  }

  return validateCleanupManifest(parsed, runId);
}

async function executeCleanup(manifest) {
  const supabaseUrl =
    process.env.PLAYWRIGHT_NON_PRODUCTION_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Safe cleanup execution requires a Supabase URL and server-only service key."
    );
  }

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const sentinel = await readEnvironmentSentinel(client);
  const target = assertSafeSupabaseMutationTarget({
    supabaseUrl,
    mutationTarget: process.env.LIFECYCLE_MUTATION_TARGET,
    expectedStagingProjectRef: process.env.EXPECTED_STAGING_PROJECT_REF,
    productionProjectRef: process.env.PRODUCTION_PROJECT_REF,
    sentinel,
    cleanup: { available: true, runId: manifest.runId },
  });
  assertCleanupTargetMatch(manifest, target);

  const resolvedManifest = await resolveInterruptedArtifacts(client, manifest);
  const plan = buildDeletionPlan(resolvedManifest);
  const cascadeVerificationPlan = buildCascadeVerificationPlan(resolvedManifest);

  for (const step of plan) {
    if (step.table === "orders") {
      await cleanupAndVerifyLifecycleOrders(client, step);
    } else {
      await deleteAndVerifyExactIds(client, step);
    }
  }
  for (const step of cascadeVerificationPlan) {
    await verifyExactIdsAbsent(client, step);
  }
  await deleteAndVerifyAuthUsers(client, resolvedManifest.records.authUserIds);
}

async function main() {
  const { execute, runId } = parseCleanupArgs(process.argv.slice(2));
  const manifest = await loadManifest(runId);
  const plan = buildDeletionPlan(manifest);
  const cascadeVerificationPlan = buildCascadeVerificationPlan(manifest);

  if (!execute) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          runId,
          target: manifest.target,
          deletions: plan.map((step) => ({
            table: step.table,
            exactIdCount: step.ids.length,
          })),
          cascadeVerifications: cascadeVerificationPlan.map((step) => ({
            table: step.table,
            exactIdCount: step.ids.length,
          })),
          authUserExactCount: manifest.records.authUserIds.length,
        },
        null,
        2
      )
    );
    return;
  }

  await executeCleanup(manifest);
  await rm(resolveStaffCredentialsPath(runId), { force: true });
  console.log(
    JSON.stringify({ mode: "executed", runId, exactCleanupVerified: true })
  );
}

const invokedModuleUrl = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedModuleUrl === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Lifecycle cleanup failed.");
    process.exitCode = 1;
  });
}
