#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";

import { deriveLifecycleClientIp } from "../tests/e2e/helpers/lifecycle-identity.mjs";
import {
  buildInterceptedDesignEnvironment,
  withPlaywrightPort,
} from "./lifecycle-environment.mjs";
import { allocateLifecyclePort } from "./lifecycle-port.mjs";
import { redactLifecycleDiagnostics } from "./lifecycle-output-safety.mjs";

const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
const LOCAL_DATABASE_CONTAINER = "supabase_db_leden-website-local";
const EXPECTED_BOOTSTRAP_CHECKSUM =
  "85fd583a19be476b1130ab505bd2829f0324c1f621d46b38b14fd1ec6a3fcdb3";
const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";
const LOCAL_ABUSE_HMAC_KEY =
  "local-lifecycle-v1-hmac-key-00000000000000000000000000000000";

const LIFECYCLE_HOURS = JSON.stringify(
  [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ].map((day) => ({ day, open: "00:00", close: "24:00", closed: false })),
);
const BASELINE_HOURS = JSON.stringify([
  { day: "Monday", open: "07:30", close: "15:00", closed: false },
  { day: "Tuesday", open: "07:30", close: "15:00", closed: false },
  { day: "Wednesday", open: "07:30", close: "15:00", closed: false },
  { day: "Thursday", open: "07:30", close: "15:00", closed: false },
  { day: "Friday", open: "07:30", close: "15:00", closed: false },
  { day: "Saturday", open: "08:00", close: "15:00", closed: false },
  { day: "Sunday", open: "08:00", close: "15:00", closed: false },
]);

let activeChild = null;
let interrupted = false;

function buildRunId() {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  return `${timestamp}-${randomBytes(8).toString("hex")}`;
}

function announce(label) {
  process.stdout.write(`\n[lifecycle-local] ${label}\n`);
}

function run(command, args, options = {}) {
  announce(options.label ?? `${command} ${args.join(" ")}`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: options.env ?? process.env,
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    activeChild = child;
    let stdout = "";
    let stderr = "";
    if (options.capture) {
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
    }
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (activeChild === child) activeChild = null;
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          `${options.label ?? command} failed${signal ? ` (${signal})` : ` (exit ${code})`}.${
            options.safeDiagnostics
              ? `\n${redactLifecycleDiagnostics(`${stdout}\n${stderr}`).trim()}`
              : ""
          }`,
        ),
      );
    });
  });
}

function parseSupabaseEnvironment(serialized) {
  const values = {};
  for (const line of serialized.split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(?:"([\s\S]*)"|'([\s\S]*)'|([^\s]+))$/.exec(
      line.trim(),
    );
    if (match) values[match[1]] = match[2] ?? match[3] ?? match[4];
  }
  const supabaseUrl = values.API_URL;
  const anonKey = values.ANON_KEY ?? values.PUBLISHABLE_KEY;
  const serviceKey = values.SERVICE_ROLE_KEY ?? values.SECRET_KEY;
  if (supabaseUrl !== LOCAL_SUPABASE_URL || !anonKey || !serviceKey) {
    throw new Error("Supabase CLI did not report the exact pinned local target.");
  }
  return { supabaseUrl, anonKey, serviceKey };
}

function lifecycleEnvironment(runId, local) {
  const environment = { ...process.env };
  delete environment.SUPABASE_SECRET_KEY;
  delete environment.PLAYWRIGHT_LIFECYCLE_SETUP_FAULT;
  return {
    ...environment,
    LIFECYCLE_MUTATION_TARGET: "local",
    PLAYWRIGHT_REAL_LIFECYCLE: "1",
    PLAYWRIGHT_LIFECYCLE_CLEAN_RESET: "1",
    PLAYWRIGHT_ALLOW_MUTATIONS: "1",
    PLAYWRIGHT_LIFECYCLE_RUN_ID: runId,
    PLAYWRIGHT_LIFECYCLE_CLIENT_IP: deriveLifecycleClientIp(runId),
    PLAYWRIGHT_NON_PRODUCTION_SUPABASE_URL: local.supabaseUrl,
    NEXT_PUBLIC_SUPABASE_URL: local.supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: local.anonKey,
    SUPABASE_URL: local.supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: local.serviceKey,
    TURNSTILE_SECRET_KEY: TURNSTILE_TEST_SECRET,
    TURNSTILE_EXPECTED_ACTION: "test",
    TURNSTILE_EXPECTED_HOSTNAME: "127.0.0.1",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
    NEXT_PUBLIC_ORDER_CHALLENGE_TEST_TOKEN: "XXXX.DUMMY.TOKEN.XXXX",
    NEXT_PUBLIC_TURNSTILE_ACTION: "test",
    ORDER_APP_ORIGIN: "http://127.0.0.1:3211",
    ORDER_TRUST_CLOUDFLARE_IDENTITY: "true",
    ORDER_ABUSE_HMAC_VERSION: "v1",
    ORDER_ABUSE_HMAC_KEY_V1: LOCAL_ABUSE_HMAC_KEY,
  };
}

function cafeRuntimeSql(hours, pickupLeadTime) {
  return `
do $$
declare
  cafe_rows integer;
begin
  if not exists (
    select 1
    from private.lifecycle_environment_sentinel
    where singleton = true
      and environment = 'local'
      and bootstrap_checksum = '${EXPECTED_BOOTSTRAP_CHECKSUM}'
  ) then
    raise exception 'Refusing lifecycle runtime change without the exact local sentinel';
  end if;

  update public.cafe_info
  set hours = '${hours}'::jsonb,
      pickup_lead_time = ${pickupLeadTime},
      ordering_enabled = true;
  get diagnostics cafe_rows = row_count;
  if cafe_rows <> 1 then
    raise exception 'Expected exactly one local café row, changed %', cafe_rows;
  end if;
end;
$$;
`;
}

async function setLocalCafeRuntime(mode) {
  const preparing = mode === "prepare";
  await run(
    "docker",
    [
      "exec",
      LOCAL_DATABASE_CONTAINER,
      "psql",
      "--username",
      "postgres",
      "--dbname",
      "postgres",
      "--no-psqlrc",
      "--set",
      "ON_ERROR_STOP=1",
      "--command",
      cafeRuntimeSql(
        preparing ? LIFECYCLE_HOURS : BASELINE_HOURS,
        preparing ? 0 : 15,
      ),
    ],
    {
      capture: true,
      label: preparing
        ? "prepare sentinel-checked all-clock local café runtime"
        : "restore deterministic local café runtime",
    },
  );
}

async function cleanupManifestExists(runId) {
  try {
    await access(join(process.cwd(), ".lifecycle-tests", "runs", `${runId}.json`));
    return true;
  } catch {
    return false;
  }
}

async function proveStaffSetupRecovery(local, fault, setupLabel, cleanupLabel) {
  const faultRunId = buildRunId();
  const faultEnvironment = {
    ...lifecycleEnvironment(faultRunId, local),
    PLAYWRIGHT_LIFECYCLE_SETUP_FAULT: fault,
  };
  let interruptedAsExpected = false;
  try {
    await run(
      "npx",
      ["tsx", "scripts/setup-lifecycle-staff.mjs", "--run-id", faultRunId, "--execute"],
      {
        capture: true,
        label: setupLabel,
        env: faultEnvironment,
      },
    );
  } catch {
    interruptedAsExpected = true;
  }
  if (!interruptedAsExpected || !(await cleanupManifestExists(faultRunId))) {
    throw new Error("Staff setup fault injection did not leave a recoverable journal.");
  }
  await run(
    "npx",
    ["tsx", "scripts/cleanup-lifecycle-test.mjs", "--run-id", faultRunId, "--execute"],
    {
      label: cleanupLabel,
      env: faultEnvironment,
    },
  );
  process.stdout.write("[lifecycle-local] staff setup recovery isolation proved\n");
}

async function createForeignRateBucketControl(environment) {
  const client = createClient(
    environment.PLAYWRIGHT_NON_PRODUCTION_SUPABASE_URL,
    environment.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const id = randomUUID();
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / 59_000) * 59_000).toISOString();
  const { error } = await client.from("order_rate_buckets").insert({
    id,
    purpose: "status",
    key_hash: `\\x${randomBytes(32).toString("hex")}`,
    window_start: windowStart,
    window_seconds: 59,
    request_count: 1,
    expires_at: new Date(now + 10 * 60_000).toISOString(),
  });
  if (error) throw new Error("Foreign rate-bucket cleanup control could not be created.");
  return { client, id };
}

async function assertCapturedLifecycleOutputSafe(
  environment,
  runId,
  capturedOutput,
) {
  const manifest = JSON.parse(
    await readFile(
      join(process.cwd(), ".lifecycle-tests", "runs", `${runId}.json`),
      "utf8",
    ),
  );
  const attemptIds = manifest?.records?.orderAttemptIds;
  const journaledTrackingDigests = manifest?.records?.trackingTokenDigests;
  if (
    !Array.isArray(attemptIds) ||
    attemptIds.length === 0 ||
    !Array.isArray(journaledTrackingDigests) ||
    journaledTrackingDigests.length === 0 ||
    journaledTrackingDigests.some(
      (digest) => typeof digest !== "string" || !/^[0-9a-f]{64}$/.test(digest),
    )
  ) {
    throw new Error("Lifecycle output scan could not resolve exact attempts.");
  }
  const client = createClient(
    environment.PLAYWRIGHT_NON_PRODUCTION_SUPABASE_URL,
    environment.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: orders, error } = await client
    .from("orders")
    .select(
      "idempotency_key, tracking_token_hash, customer_name, customer_phone",
    )
    .in("idempotency_key", attemptIds);
  if (error || !Array.isArray(orders) || orders.length === 0) {
    throw new Error("Lifecycle output scan could not read exact order fingerprints.");
  }
  const trackingDigests = new Set(journaledTrackingDigests);
  if (
    orders.some(
      (order) =>
        !trackingDigests.has(
          String(order.tracking_token_hash).replace(/^\\x/, "").toLowerCase(),
        ),
    )
  ) {
    throw new Error("Lifecycle output scan journal is incomplete.");
  }
  const bearerCandidates = capturedOutput.match(/[A-Za-z0-9_-]{43}/g) ?? [];
  for (const candidate of bearerCandidates) {
    const digest = createHash("sha256")
      .update(candidate, "utf8")
      .digest("hex");
    if (trackingDigests.has(digest)) {
      throw new Error("Lifecycle reporter or server output exposed tracking material.");
    }
  }
  const prohibitedPlaintext = [
    ...attemptIds,
    ...orders.flatMap((order) => [order.customer_name, order.customer_phone]),
  ];
  if (
    prohibitedPlaintext.some(
      (value) => typeof value === "string" && capturedOutput.includes(value),
    )
  ) {
    throw new Error("Lifecycle reporter or server output exposed private order material.");
  }
}

async function verifyForeignRateBucketSurvivedAndRemove(control) {
  let assertionError = null;
  try {
    const { data, error } = await control.client
      .from("order_rate_buckets")
      .select("id")
      .eq("id", control.id)
      .maybeSingle();
    if (error || data?.id !== control.id) {
      assertionError = new Error("Exact cleanup deleted a foreign rate bucket.");
    }
  } finally {
    const { error: deleteError } = await control.client
      .from("order_rate_buckets")
      .delete()
      .eq("id", control.id);
    if (deleteError && !assertionError) {
      assertionError = new Error("Foreign rate-bucket control cleanup failed.");
    }
  }
  if (assertionError) throw assertionError;
}

export async function runExactLifecycleCleanup({
  createForeignControl,
  runManifestCleanup,
  verifyAndRemoveForeignControl,
}) {
  const errors = [];
  let foreignControl = null;

  try {
    foreignControl = await createForeignControl();
  } catch (error) {
    errors.push(error);
  }

  try {
    await runManifestCleanup();
  } catch (error) {
    errors.push(error);
  }

  if (foreignControl) {
    try {
      await verifyAndRemoveForeignControl(foreignControl);
    } catch (error) {
      errors.push(error);
    }
  }

  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) {
    throw new AggregateError(
      errors,
      "Lifecycle cleanup and foreign rate control verification failed.",
    );
  }
}

function installInterruptionHandlers() {
  process.on("SIGINT", () => {
    interrupted = true;
    activeChild?.kill("SIGINT");
  });
  process.on("SIGTERM", () => {
    interrupted = true;
    activeChild?.kill("SIGTERM");
  });
}

async function main() {
  const runId = buildRunId();
  let environment;
  let staffSetupStarted = false;
  let runtimePreparationStarted = false;
  let failure = null;

  try {
    await run("node", ["scripts/check-order-lifecycle-prerequisites.mjs"], {
      label: "prerequisite and production-denial checks",
    });
    await run("npx", ["supabase", "start"], {
      label: "start pinned local Supabase without printing local credentials",
      capture: true,
    });
    await run("npx", ["supabase", "db", "reset", "--local"], {
      label: "clean local reset and deterministic seed",
    });
    const status = await run("npx", ["supabase", "status", "-o", "env"], {
      label: "read local credentials without printing them",
      capture: true,
    });
    const local = parseSupabaseEnvironment(status.stdout);
    environment = lifecycleEnvironment(runId, local);

    await run("npm", ["run", "supabase:test:db"], {
      label: "all pgTAP database contracts",
      env: environment,
    });
    await run("npm", ["run", "check:database-types"], {
      label: "generated database type drift",
      env: environment,
    });
    await run("npm", ["run", "test:unit"], {
      label: "full unit suite",
      env: environment,
    });
    await run("npm", ["run", "test:order-lifecycle:races"], {
      label: "deterministic observed-lock races",
      env: environment,
    });
    await proveStaffSetupRecovery(
      local,
      "after-auth-ambiguous",
      "fault-inject ambiguous Auth create before ID persistence",
      "recover exact run-tagged Auth user after ambiguous create",
    );
    await proveStaffSetupRecovery(
      local,
      "after-membership-abrupt",
      "fault-inject abrupt staff setup after allowlisting",
      "recover exact run-tagged staff after abrupt setup interruption",
    );
    runtimePreparationStarted = true;
    await setLocalCafeRuntime("prepare");
    staffSetupStarted = true;
    await run(
      "npx",
      ["tsx", "scripts/setup-lifecycle-staff.mjs", "--run-id", runId, "--execute"],
      { label: "provision exact least-privilege synthetic staff", env: environment },
    );

    await run("npm", ["run", "test:order-lifecycle:integration"], {
      label: "real local Auth, RLS, idempotency, and CAS integration",
      env: environment,
    });

    const interceptedBuildEnvironment = buildInterceptedDesignEnvironment();
    await run("npx", ["next", "build", "--webpack"], {
      label: "intercepted preview webpack build",
      env: interceptedBuildEnvironment,
    });
    const interceptedPort = await allocateLifecyclePort(3210);
    const interceptedEnvironment = withPlaywrightPort(
      interceptedBuildEnvironment,
      interceptedPort,
    );
    await run(
      "npx",
      [
        "playwright",
        "test",
        "tests/e2e/storefront-design.spec.ts",
        "tests/e2e/admin-design.spec.ts",
      ],
      {
        label: "intercepted storefront and admin design regressions",
        env: interceptedEnvironment,
      },
    );
    await run("npx", ["next", "build", "--webpack"], {
      label: "real lifecycle production webpack build",
      env: environment,
    });
    const realLifecyclePort = await allocateLifecyclePort(3211);
    const lifecycleResult = await run("npm", ["run", "test:e2e:order-lifecycle"], {
      label: "real local customer-admin-tracking lifecycle",
      capture: true,
      safeDiagnostics: true,
      env: {
        ...environment,
        PLAYWRIGHT_SKIP_BUILD: "1",
        PLAYWRIGHT_PORT: String(realLifecyclePort),
        PLAYWRIGHT_REQUIRE_FRESH_SERVER: "1",
        ORDER_APP_ORIGIN: `http://127.0.0.1:${realLifecyclePort}`,
      },
    });
    await assertCapturedLifecycleOutputSafe(
      environment,
      runId,
      `${lifecycleResult.stdout}\n${lifecycleResult.stderr}`,
    );
    announce("real lifecycle reporter and server output passed private-material scan");
    await run("npm", ["run", "lint"], {
      label: "ESLint",
      env: environment,
    });
    await run("npx", ["tsc", "--noEmit"], {
      label: "TypeScript",
      env: environment,
    });
  } catch (error) {
    failure = error;
  } finally {
    if (
      staffSetupStarted &&
      environment &&
      (await cleanupManifestExists(runId))
    ) {
      try {
        await runExactLifecycleCleanup({
          createForeignControl: () => createForeignRateBucketControl(environment),
          runManifestCleanup: () =>
            run(
              "npx",
              [
                "tsx",
                "scripts/cleanup-lifecycle-test.mjs",
                "--run-id",
                runId,
                "--execute",
              ],
              {
                label: "exact per-run cleanup and absence verification",
                env: environment,
              },
            ),
          verifyAndRemoveForeignControl:
            verifyForeignRateBucketSurvivedAndRemove,
        });
      } catch (cleanupError) {
        failure = failure
          ? new AggregateError([failure, cleanupError], "Lifecycle proof and cleanup failed.")
          : cleanupError;
      }
    }
    if (runtimePreparationStarted) {
      try {
        await setLocalCafeRuntime("restore");
      } catch (restoreError) {
        failure = failure
          ? new AggregateError(
              [failure, restoreError],
              "Lifecycle proof and local café runtime restoration failed.",
            )
          : restoreError;
      }
    }
  }

  if (failure) throw failure;
  if (interrupted) throw new Error("Lifecycle proof was interrupted after exact cleanup.");
  announce("PASS — clean local lifecycle proof and exact cleanup completed");
}

const invokedModuleUrl = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedModuleUrl === import.meta.url) {
  installInterruptionHandlers();
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Local lifecycle verification failed.",
    );
    process.exitCode = 1;
  });
}
