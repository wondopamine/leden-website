import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  assertSafeSupabaseMutationTarget,
  isValidLifecycleRunId,
  readEnvironmentSentinel,
} from "./supabase-target";
import { deriveLifecycleRateKeyHex } from "./lifecycle-identity.mjs";

export const LIFECYCLE_MENU_ITEM_ID =
  "d2000000-0000-4000-8000-000000000001";
export const LIFECYCLE_REQUIRED_OPTION_ID =
  "d4000000-0000-4000-8000-000000000001";
export const LIFECYCLE_FOREIGN_OPTION_ID =
  "d4000000-0000-4000-8000-000000000004";
export const TURNSTILE_ALWAYS_PASS_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRIVATE_DTO_KEYS = new Set([
  "id",
  "order_id",
  "customer_name",
  "customer_phone",
  "idempotency_key",
  "tracking_token_hash",
  "tracking_secret",
  "actor_user_id",
  "notes",
]);

type CleanupRecords = {
  staffMembershipUserIds: string[];
  orderItemIds: string[];
  orderStatusEventIds: string[];
  orderIds: string[];
  orderAttemptIds: string[];
  trackingTokenDigests: string[];
  rateBucketIds: string[];
  authUserIds: string[];
};

type CleanupManifest = {
  version: 2;
  runId: string;
  target: { kind: "local"; projectRef: null };
  records: CleanupRecords;
};

export type StaffCredentials = {
  version: 1;
  runId: string;
  userId: string;
  email: string;
  password: string;
};

export type LifecycleFixtureContext = {
  runId: string;
  supabaseUrl: string;
  anonKey: string;
  serviceClient: SupabaseClient;
  staff: StaffCredentials;
};

function manifestPath(runId: string) {
  return join(process.cwd(), ".lifecycle-tests", "runs", `${runId}.json`);
}

function staffPath(runId: string) {
  return join(
    process.cwd(),
    ".lifecycle-tests",
    "runs",
    `${runId}.staff.json`,
  );
}

function parseUuidList(value: unknown, label: string): string[] {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string" || !UUID_PATTERN.test(entry))
  ) {
    throw new Error(`${label} must contain exact UUIDs.`);
  }
  return [...new Set(value)];
}

function parseDigestList(value: unknown, label: string): string[] {
  if (
    !Array.isArray(value) ||
    value.some(
      (entry) => typeof entry !== "string" || !/^[0-9a-f]{64}$/.test(entry),
    )
  ) {
    throw new Error(`${label} must contain exact SHA-256 digests.`);
  }
  return [...new Set(value)];
}

function parseManifest(value: unknown, runId: string): CleanupManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Lifecycle cleanup manifest is invalid.");
  }
  const manifest = value as Record<string, unknown>;
  if (manifest.version !== 2 || manifest.runId !== runId) {
    throw new Error("Lifecycle cleanup manifest does not match this run.");
  }
  const target = manifest.target as Record<string, unknown> | undefined;
  if (target?.kind !== "local" || target.projectRef !== null) {
    throw new Error("Lifecycle fixture manifest is not local-only.");
  }
  const records = manifest.records as Record<string, unknown> | undefined;
  if (!records) throw new Error("Lifecycle cleanup records are missing.");
  return {
    version: 2,
    runId,
    target: { kind: "local", projectRef: null },
    records: {
      staffMembershipUserIds: parseUuidList(
        records.staffMembershipUserIds,
        "staffMembershipUserIds",
      ),
      orderItemIds: parseUuidList(records.orderItemIds, "orderItemIds"),
      orderStatusEventIds: parseUuidList(
        records.orderStatusEventIds,
        "orderStatusEventIds",
      ),
      orderIds: parseUuidList(records.orderIds, "orderIds"),
      orderAttemptIds: parseUuidList(
        records.orderAttemptIds,
        "orderAttemptIds",
      ),
      trackingTokenDigests: parseDigestList(
        records.trackingTokenDigests,
        "trackingTokenDigests",
      ),
      rateBucketIds: parseUuidList(records.rateBucketIds, "rateBucketIds"),
      authUserIds: parseUuidList(records.authUserIds, "authUserIds"),
    },
  };
}

async function readManifest(runId: string) {
  return parseManifest(
    JSON.parse(await readFile(manifestPath(runId), "utf8")),
    runId,
  );
}

async function updateManifest(
  runId: string,
  update: (records: CleanupRecords) => void,
) {
  const manifest = await readManifest(runId);
  update(manifest.records);
  for (const key of Object.keys(manifest.records) as Array<keyof CleanupRecords>) {
    manifest.records[key] = [...new Set(manifest.records[key])];
  }
  const destination = manifestPath(runId);
  const temporary = `${destination}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
  await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, {
    flag: "wx",
    mode: 0o600,
  });
  await rename(temporary, destination);
}

export function buildLifecycleRunId(now = new Date(), entropy = randomBytes(8)) {
  const timestamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return `${timestamp}-${entropy.toString("hex")}`;
}

export function buildLifecycleCartItem(locale: "en" | "fr") {
  return {
    id: `lifecycle-${locale}`,
    menuItemId: LIFECYCLE_MENU_ITEM_ID,
    name: locale === "fr" ? "Latté de test du cycle" : "Lifecycle test latte",
    nameEn: "Lifecycle test latte",
    nameFr: "Latté de test du cycle",
    price: 5,
    quantity: 1,
    modifiers: [
      {
        modifierId: "d3000000-0000-4000-8000-000000000001",
        optionId: LIFECYCLE_REQUIRED_OPTION_ID,
        name: locale === "fr" ? "Taille" : "Size",
        option: locale === "fr" ? "Régulier" : "Regular",
        priceAdjustment: 0,
      },
    ],
  };
}

export function freshOrderIdentity() {
  return {
    attemptId: randomUUID(),
    trackingSecret: randomBytes(32).toString("base64url"),
  };
}

export async function loadLifecycleFixtureContext(): Promise<LifecycleFixtureContext> {
  const runId = process.env.PLAYWRIGHT_LIFECYCLE_RUN_ID;
  const supabaseUrl = process.env.PLAYWRIGHT_NON_PRODUCTION_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (
    process.env.PLAYWRIGHT_REAL_LIFECYCLE !== "1" ||
    process.env.PLAYWRIGHT_LIFECYCLE_CLEAN_RESET !== "1" ||
    !runId ||
    !isValidLifecycleRunId(runId) ||
    !supabaseUrl ||
    !serviceKey ||
    !anonKey
  ) {
    throw new Error("Real lifecycle fixtures require the explicit clean local harness.");
  }
  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const sentinel = await readEnvironmentSentinel(serviceClient);
  const target = assertSafeSupabaseMutationTarget({
    supabaseUrl,
    mutationTarget: process.env.LIFECYCLE_MUTATION_TARGET,
    sentinel,
    cleanup: { available: true, runId },
  });
  if (target.kind !== "local") {
    throw new Error("This lifecycle fixture implementation is local-only.");
  }
  const staff = JSON.parse(await readFile(staffPath(runId), "utf8")) as StaffCredentials;
  if (
    staff.version !== 1 ||
    staff.runId !== runId ||
    !UUID_PATTERN.test(staff.userId) ||
    typeof staff.email !== "string" ||
    typeof staff.password !== "string"
  ) {
    throw new Error("Synthetic staff credentials do not match this lifecycle run.");
  }
  await readManifest(runId);
  return { runId, supabaseUrl, anonKey, serviceClient, staff };
}

export async function recordLifecycleAttempt(runId: string, attemptId: string) {
  if (!UUID_PATTERN.test(attemptId)) {
    throw new Error("Lifecycle attempt ID is invalid.");
  }
  await updateManifest(runId, (records) => {
    records.orderAttemptIds.push(attemptId.toLowerCase());
  });
}

export async function recordLifecycleTrackingSecret(
  runId: string,
  trackingSecret: string,
) {
  const digest = trackingHash(trackingSecret);
  await updateManifest(runId, (records) => {
    records.trackingTokenDigests.push(digest);
  });
}

export async function recordLifecycleAuthUser(runId: string, userId: string) {
  if (!UUID_PATTERN.test(userId)) throw new Error("Lifecycle Auth user ID is invalid.");
  await updateManifest(runId, (records) => {
    records.authUserIds.push(userId.toLowerCase());
  });
}

export async function recordLifecycleDatabaseArtifacts(
  context: LifecycleFixtureContext,
) {
  const manifest = await readManifest(context.runId);
  const { data: orders, error: orderError } = manifest.records.orderAttemptIds.length
    ? await context.serviceClient
        .from("orders")
        .select("id, idempotency_key, order_items(id), order_status_events(id)")
        .in("idempotency_key", manifest.records.orderAttemptIds)
    : { data: [], error: null };
  const rateKeyHex = deriveLifecycleRateKeyHex(
    context.runId,
    process.env.ORDER_ABUSE_HMAC_VERSION ?? "",
    process.env.ORDER_ABUSE_HMAC_KEY_V1 ?? "",
  );
  const { data: buckets, error: bucketError } = await context.serviceClient
    .from("order_rate_buckets")
    .select("id")
    .eq("key_hash", `\\x${rateKeyHex}`)
    .in("purpose", ["create", "status", "recovery"]);
  if (orderError || bucketError || !Array.isArray(orders) || !Array.isArray(buckets)) {
    throw new Error("Lifecycle database artifacts could not be recorded exactly.");
  }
  await updateManifest(context.runId, (records) => {
    for (const order of orders) {
      if (!order || !UUID_PATTERN.test(order.id)) {
        throw new Error("Lifecycle order artifact is invalid.");
      }
      records.orderIds.push(order.id);
      for (const item of order.order_items ?? []) records.orderItemIds.push(item.id);
      for (const event of order.order_status_events ?? []) {
        records.orderStatusEventIds.push(event.id);
      }
    }
    for (const bucket of buckets) records.rateBucketIds.push(bucket.id);
  });
}

export async function getLifecycleOrderByAttempt(
  context: LifecycleFixtureContext,
  attemptId: string,
) {
  const { data, error } = await context.serviceClient
    .from("orders")
    .select(
      "id, order_number, status, status_version, idempotency_key, customer_name, customer_phone, order_items(id, menu_item_id, quantity), order_status_events(id, from_status, to_status, status_version, actor_user_id, created_at)",
    )
    .eq("idempotency_key", attemptId)
    .maybeSingle();
  if (error) throw new Error("Lifecycle order could not be read for verification.");
  return data;
}

export async function createSignedInStaffClient(context: LifecycleFixtureContext) {
  const client = createClient(context.supabaseUrl, context.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: context.staff.email,
    password: context.staff.password,
  });
  if (error) throw new Error("Synthetic staff could not sign in.");
  return client;
}

export function trackingHash(trackingSecret: string) {
  return createHash("sha256").update(trackingSecret, "utf8").digest("hex");
}

export function assertPiiFreePublicDto(value: unknown) {
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== "object") return;
    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      if (PRIVATE_DTO_KEYS.has(key.toLowerCase())) {
        throw new Error(`Public lifecycle DTO exposed ${key}.`);
      }
      visit(child);
    }
  };
  visit(value);
}
