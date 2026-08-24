export const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";

export const ENVIRONMENT_SENTINEL_BOOTSTRAP_SHA256 =
  "85fd583a19be476b1130ab505bd2829f0324c1f621d46b38b14fd1ec6a3fcdb3";

const PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;
const RUN_ID_PATTERN = /^[0-9]{8}T[0-9]{6}Z-[a-z0-9]{8,32}$/;
const HOSTED_SUPABASE_PATTERN = /^([a-z0-9]{20})\.supabase\.co$/;

export type LifecycleEnvironment = "local" | "staging";

export type EnvironmentSentinel = {
  environment: LifecycleEnvironment;
  bootstrapChecksum: string;
};

export type CleanupCapability = {
  available: true;
  runId: string;
};

export type MutationTargetInput = {
  supabaseUrl: string;
  mutationTarget?: string;
  expectedStagingProjectRef?: string;
  productionProjectRef?: string;
  sentinel?: EnvironmentSentinel;
  cleanup?: CleanupCapability;
};

export type SafeMutationTarget = {
  kind: LifecycleEnvironment;
  projectRef: string | null;
  runId: string;
  supabaseUrl: string;
};

export type SupabaseTargetErrorCode =
  | "MISSING_TARGET_MARKER"
  | "CLEANUP_UNAVAILABLE"
  | "INVALID_RUN_ID"
  | "MISSING_SENTINEL"
  | "INVALID_SENTINEL"
  | "SENTINEL_MISMATCH"
  | "SENTINEL_CHECKSUM_MISMATCH"
  | "SENTINEL_READ_FAILED"
  | "MALFORMED_URL"
  | "UNSAFE_LOCAL_URL"
  | "UNSAFE_HOSTED_URL"
  | "MISSING_STAGING_REF"
  | "INVALID_STAGING_REF"
  | "MISSING_PRODUCTION_REF"
  | "INVALID_PRODUCTION_REF"
  | "PRODUCTION_TARGET"
  | "STAGING_REF_MISMATCH"
  | "TARGET_MARKER_MISMATCH";

export class SupabaseTargetError extends Error {
  readonly code: SupabaseTargetErrorCode;

  constructor(code: SupabaseTargetErrorCode, message: string) {
    super(message);
    this.name = "SupabaseTargetError";
    this.code = code;
  }
}

type SentinelRpcResult = {
  data: unknown;
  error: { message?: string } | null;
};

export type SentinelRpcClient = {
  rpc: (
    functionName: "get_lifecycle_environment_sentinel"
  ) => PromiseLike<SentinelRpcResult>;
};

function fail(code: SupabaseTargetErrorCode, message: string): never {
  throw new SupabaseTargetError(code, message);
}

function parseUrl(rawUrl: string): URL {
  try {
    return new URL(rawUrl);
  } catch {
    return fail("MALFORMED_URL", "Supabase mutation URL is malformed.");
  }
}

function assertNoUrlDecorations(url: URL, code: SupabaseTargetErrorCode) {
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== "" && url.pathname !== "/")
  ) {
    fail(code, "Supabase mutation URL must be an undecorated project origin.");
  }
}

function assertCleanupCapability(
  cleanup: CleanupCapability | undefined
): CleanupCapability {
  if (!cleanup?.available) {
    return fail(
      "CLEANUP_UNAVAILABLE",
      "Exact per-run cleanup capability is required before mutation."
    );
  }

  if (!isValidLifecycleRunId(cleanup.runId)) {
    return fail(
      "INVALID_RUN_ID",
      "Cleanup run ID must be a timestamp plus an opaque lowercase suffix."
    );
  }

  return cleanup;
}

export function isValidLifecycleRunId(runId: string) {
  return RUN_ID_PATTERN.test(runId);
}

function assertSentinel(
  sentinel: EnvironmentSentinel | undefined,
  expectedEnvironment: LifecycleEnvironment
) {
  if (!sentinel) {
    fail("MISSING_SENTINEL", "Protected database sentinel is required.");
  }

  if (sentinel.bootstrapChecksum !== ENVIRONMENT_SENTINEL_BOOTSTRAP_SHA256) {
    fail(
      "SENTINEL_CHECKSUM_MISMATCH",
      "Database sentinel was not created from the pinned bootstrap artifact."
    );
  }

  if (sentinel.environment !== expectedEnvironment) {
    fail(
      "SENTINEL_MISMATCH",
      `Database sentinel does not report ${expectedEnvironment}.`
    );
  }
}

function normalizeProjectRef(
  value: string | undefined,
  missingCode: "MISSING_STAGING_REF" | "MISSING_PRODUCTION_REF",
  invalidCode: "INVALID_STAGING_REF" | "INVALID_PRODUCTION_REF"
) {
  if (!value) {
    return fail(missingCode, "Required Supabase project reference is missing.");
  }

  if (!PROJECT_REF_PATTERN.test(value)) {
    return fail(invalidCode, "Supabase project reference has an invalid shape.");
  }

  return value;
}

export function assertSafeSupabaseMutationTarget(
  input: MutationTargetInput
): SafeMutationTarget {
  if (!input.mutationTarget) {
    return fail(
      "MISSING_TARGET_MARKER",
      "LIFECYCLE_MUTATION_TARGET must be explicit."
    );
  }

  const cleanup = assertCleanupCapability(input.cleanup);
  const url = parseUrl(input.supabaseUrl);

  if (input.mutationTarget === "local") {
    assertNoUrlDecorations(url, "UNSAFE_LOCAL_URL");
    if (url.origin !== LOCAL_SUPABASE_URL) {
      return fail(
        "UNSAFE_LOCAL_URL",
        `Local mutation is restricted to ${LOCAL_SUPABASE_URL}.`
      );
    }

    assertSentinel(input.sentinel, "local");
    return {
      kind: "local",
      projectRef: null,
      runId: cleanup.runId,
      supabaseUrl: LOCAL_SUPABASE_URL,
    };
  }

  assertNoUrlDecorations(url, "UNSAFE_HOSTED_URL");
  if (url.protocol !== "https:" || url.port) {
    return fail(
      "UNSAFE_HOSTED_URL",
      "Hosted mutation requires the canonical HTTPS Supabase project origin."
    );
  }

  const urlProjectRef = url.hostname.match(HOSTED_SUPABASE_PATTERN)?.[1];
  if (!urlProjectRef) {
    return fail(
      "UNSAFE_HOSTED_URL",
      "Hosted mutation URL is not a canonical Supabase project origin."
    );
  }

  const stagingProjectRef = normalizeProjectRef(
    input.expectedStagingProjectRef,
    "MISSING_STAGING_REF",
    "INVALID_STAGING_REF"
  );
  const productionProjectRef = normalizeProjectRef(
    input.productionProjectRef,
    "MISSING_PRODUCTION_REF",
    "INVALID_PRODUCTION_REF"
  );

  if (stagingProjectRef === productionProjectRef) {
    return fail(
      "PRODUCTION_TARGET",
      "Staging and production project references must differ."
    );
  }

  if (urlProjectRef !== stagingProjectRef) {
    return fail(
      "STAGING_REF_MISMATCH",
      "Supabase URL project reference does not match expected staging."
    );
  }

  if (input.mutationTarget !== `staging:${stagingProjectRef}`) {
    return fail(
      "TARGET_MARKER_MISMATCH",
      "Mutation target marker does not name the expected staging project."
    );
  }

  assertSentinel(input.sentinel, "staging");
  return {
    kind: "staging",
    projectRef: stagingProjectRef,
    runId: cleanup.runId,
    supabaseUrl: `https://${stagingProjectRef}.supabase.co`,
  };
}

export async function readEnvironmentSentinel(
  client: SentinelRpcClient
): Promise<EnvironmentSentinel> {
  const { data, error } = await client.rpc(
    "get_lifecycle_environment_sentinel"
  );

  if (error) {
    return fail(
      "SENTINEL_READ_FAILED",
      "Protected database sentinel could not be read."
    );
  }

  if (!Array.isArray(data) || data.length !== 1) {
    return fail(
      "INVALID_SENTINEL",
      "Protected database sentinel returned an invalid row count."
    );
  }

  const row = data[0] as Record<string, unknown> | null;
  if (
    !row ||
    (row.environment !== "local" && row.environment !== "staging") ||
    typeof row.bootstrap_checksum !== "string" ||
    !/^[0-9a-f]{64}$/.test(row.bootstrap_checksum)
  ) {
    return fail(
      "INVALID_SENTINEL",
      "Protected database sentinel returned an invalid contract."
    );
  }

  return {
    environment: row.environment,
    bootstrapChecksum: row.bootstrap_checksum,
  };
}
