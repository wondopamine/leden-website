#!/usr/bin/env node

import { randomBytes } from "node:crypto";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
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
    version: 1,
    runId,
    target: { kind: "local", projectRef: null },
    records: {
      staffMembershipUserIds: [userId],
      orderItemIds: [],
      orderIds: [],
      authUserIds: [userId],
    },
  };
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
  let manifestWritten = false;
  let credentialsWritten = false;
  try {
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

    const { error: membershipError } = await client
      .from("admin_users")
      .insert({ user_id: userId });
    if (membershipError) {
      throw new Error("Synthetic staff membership could not be created.");
    }

    const manifest = buildStaffCleanupManifest(runId, userId);
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
      flag: "wx",
      mode: 0o600,
    });
    manifestWritten = true;
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
    if (manifestWritten) {
      await rm(manifestPath, { force: true });
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
