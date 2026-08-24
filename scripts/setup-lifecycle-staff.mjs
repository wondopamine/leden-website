#!/usr/bin/env node

import { randomBytes } from "node:crypto";
import { access, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";

import * as targetSafety from "../tests/e2e/helpers/supabase-target.ts";
import {
  resolveCleanupManifestPath,
  resolveStaffCredentialsPath,
} from "./cleanup-lifecycle-test.mjs";

const targetSafetyExports = targetSafety.default ?? targetSafety;
const {
  assertSafeSupabaseMutationTarget,
  isValidLifecycleRunId,
  readEnvironmentSentinel,
} = targetSafetyExports;

export function parseStaffSetupArgs(argv) {
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
    throw new Error("Staff fixture run ID has an invalid shape.");
  }

  return { execute, runId };
}

export function buildSyntheticStaffCredentials(runId, password) {
  if (!isValidLifecycleRunId(runId)) {
    throw new Error("Staff fixture run ID has an invalid shape.");
  }
  if (typeof password !== "string" || password.length < 16) {
    throw new Error("Synthetic staff password requires at least 16 characters.");
  }

  return {
    email: `lifecycle-${runId.toLowerCase()}@example.invalid`,
    password,
  };
}

export function buildStaffCleanupManifest(runId, userId) {
  return {
    version: 2,
    runId,
    target: { kind: "local", projectRef: null },
    records: {
      staffMembershipUserIds: [userId],
      orderItemIds: [],
      orderStatusEventIds: [],
      orderIds: [],
      orderAttemptIds: [],
      trackingTokenDigests: [],
      rateBucketIds: [],
      authUserIds: [userId],
    },
  };
}

export function buildPendingStaffCleanupManifest(runId) {
  if (!isValidLifecycleRunId(runId)) {
    throw new Error("Staff fixture run ID has an invalid shape.");
  }
  return {
    version: 2,
    runId,
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
  };
}

async function replaceJsonFile(path, value) {
  const temporary = `${path}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    flag: "wx",
    mode: 0o600,
  });
  await rename(temporary, path);
}

async function verifyLocalTarget(runId, client, supabaseUrl) {
  const sentinel = await readEnvironmentSentinel(client);
  const target = assertSafeSupabaseMutationTarget({
    supabaseUrl,
    mutationTarget: process.env.LIFECYCLE_MUTATION_TARGET,
    sentinel,
    cleanup: { available: true, runId },
  });
  if (target.kind !== "local") {
    throw new Error("U2 synthetic staff setup is restricted to the local target.");
  }
  return target;
}

async function executeStaffSetup(runId) {
  const supabaseUrl =
    process.env.PLAYWRIGHT_NON_PRODUCTION_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Local staff setup requires the local Supabase URL and server-only service key."
    );
  }

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await verifyLocalTarget(runId, client, supabaseUrl);

  const credentials = buildSyntheticStaffCredentials(
    runId,
    `${randomBytes(24).toString("base64url")}Aa1!`
  );
  const manifestPath = resolveCleanupManifestPath(runId);
  const credentialsPath = resolveStaffCredentialsPath(runId);
  await mkdir(dirname(manifestPath), { recursive: true });

  for (const path of [manifestPath, credentialsPath]) {
    try {
      await access(path);
      throw new Error(
        "This lifecycle run already has fixture files; clean it before reuse."
      );
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        continue;
      }
      throw error;
    }
  }

  let userId;
  let credentialsWritten = false;
  try {
    await writeFile(
      manifestPath,
      `${JSON.stringify(buildPendingStaffCleanupManifest(runId), null, 2)}\n`,
      { flag: "wx", mode: 0o600 },
    );
    const { data, error: createError } = await client.auth.admin.createUser({
      email: credentials.email,
      password: credentials.password,
      email_confirm: true,
      user_metadata: { lifecycle_run_id: runId, synthetic: true },
    });
    if (createError || !data.user) {
      throw new Error("Synthetic Auth user could not be created.");
    }
    userId = data.user.id;
    if (
      process.env.PLAYWRIGHT_LIFECYCLE_SETUP_FAULT ===
        "after-auth-ambiguous" &&
      process.env.PLAYWRIGHT_REAL_LIFECYCLE === "1" &&
      process.env.PLAYWRIGHT_LIFECYCLE_CLEAN_RESET === "1" &&
      process.env.LIFECYCLE_MUTATION_TARGET === "local"
    ) {
      userId = undefined;
      throw new Error("Synthetic ambiguous Auth-create response fault.");
    }

    const { error: membershipError } = await client
      .from("admin_users")
      .insert({ user_id: userId });
    if (membershipError) {
      throw new Error("Synthetic staff membership could not be created.");
    }
    if (
      process.env.PLAYWRIGHT_LIFECYCLE_SETUP_FAULT ===
        "after-membership-abrupt" &&
      process.env.PLAYWRIGHT_REAL_LIFECYCLE === "1" &&
      process.env.PLAYWRIGHT_LIFECYCLE_CLEAN_RESET === "1" &&
      process.env.LIFECYCLE_MUTATION_TARGET === "local"
    ) {
      process.kill(process.pid, "SIGKILL");
      await new Promise(() => undefined);
    }

    const manifest = buildStaffCleanupManifest(runId, userId);
    await replaceJsonFile(manifestPath, manifest);
    await writeFile(
      credentialsPath,
      `${JSON.stringify(
        { version: 1, runId, userId, ...credentials },
        null,
        2
      )}\n`,
      { flag: "wx", mode: 0o600 }
    );
    credentialsWritten = true;
  } catch (error) {
    if (userId) {
      await client.from("admin_users").delete().eq("user_id", userId);
      await client.auth.admin.deleteUser(userId);
    }
    if (credentialsWritten) {
      await rm(credentialsPath, { force: true });
    }
    throw error;
  }

  return { manifestPath, credentialsPath };
}

async function main() {
  const { execute, runId } = parseStaffSetupArgs(process.argv.slice(2));
  if (!execute) {
    console.log(
      JSON.stringify({
        mode: "dry-run",
        target: "local-only",
        runId,
        writesCredentialsToUntrackedFile: true,
      })
    );
    return;
  }

  const { manifestPath, credentialsPath } = await executeStaffSetup(runId);
  console.log(
    JSON.stringify({
      mode: "executed",
      runId,
      manifestPath,
      credentialsPath,
      credentialsPrinted: false,
    })
  );
}

const invokedModuleUrl = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedModuleUrl === import.meta.url) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Synthetic staff setup failed."
    );
    process.exitCode = 1;
  });
}
