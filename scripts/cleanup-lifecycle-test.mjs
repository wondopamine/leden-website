#!/usr/bin/env node

import { readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";

import * as targetSafety from "../tests/e2e/helpers/supabase-target.ts";

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
  "orderIds",
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
  if (manifest.version !== 1) {
    throw new Error("Cleanup manifest version must be 1.");
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
    records.orderItemIds,
    "records.orderItemIds"
  );
  const orderIds = validateUuidList(records.orderIds, "records.orderIds");
  const authUserIds = validateUuidList(
    records.authUserIds ?? [],
    "records.authUserIds"
  );
  if (
    staffMembershipUserIds.length !== authUserIds.length ||
    staffMembershipUserIds.some((id) => !authUserIds.includes(id))
  ) {
    throw new Error(
      "Staff membership IDs must exactly match the Auth user IDs for cleanup."
    );
  }

  return {
    version: 1,
    runId: manifest.runId,
    target: {
      kind: target.kind,
      projectRef: target.projectRef,
    },
    records: {
      staffMembershipUserIds,
      orderItemIds,
      orderIds,
      authUserIds,
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
  if (manifest.records.orderItemIds.length > 0) {
    plan.push({
      table: "order_items",
      idColumn: "id",
      ids: [...manifest.records.orderItemIds],
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

async function executeCleanup(manifest, plan) {
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

  for (const step of plan) {
    await deleteAndVerifyExactIds(client, step);
  }
  await deleteAndVerifyAuthUsers(client, manifest.records.authUserIds);
}

async function main() {
  const { execute, runId } = parseCleanupArgs(process.argv.slice(2));
  const manifest = await loadManifest(runId);
  const plan = buildDeletionPlan(manifest);

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
          authUserExactCount: manifest.records.authUserIds.length,
        },
        null,
        2
      )
    );
    return;
  }

  await executeCleanup(manifest, plan);
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
