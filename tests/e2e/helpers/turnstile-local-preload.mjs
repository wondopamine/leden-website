import { deriveLifecycleClientIp } from "./lifecycle-identity.mjs";

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TEST_SECRET = "1x0000000000000000000000000000000AA";
const TEST_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

const exactLocalHarness =
  process.env.PLAYWRIGHT_REAL_LIFECYCLE === "1" &&
  process.env.PLAYWRIGHT_LIFECYCLE_CLEAN_RESET === "1" &&
  process.env.LIFECYCLE_MUTATION_TARGET === "local" &&
  process.env.PLAYWRIGHT_NON_PRODUCTION_SUPABASE_URL ===
    "http://127.0.0.1:54321" &&
  typeof process.env.PLAYWRIGHT_LIFECYCLE_RUN_ID === "string" &&
  process.env.PLAYWRIGHT_LIFECYCLE_CLIENT_IP ===
    deriveLifecycleClientIp(process.env.PLAYWRIGHT_LIFECYCLE_RUN_ID) &&
  process.env.TURNSTILE_SECRET_KEY === TEST_SECRET &&
  process.env.TURNSTILE_EXPECTED_ACTION === "test" &&
  process.env.TURNSTILE_EXPECTED_HOSTNAME === "127.0.0.1";

if (!exactLocalHarness) {
  throw new Error(
    "The deterministic Turnstile preload is restricted to the exact clean local lifecycle harness.",
  );
}

const platformFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  if (url !== SITEVERIFY_URL) return platformFetch(input, init);

  const body = init?.body;
  const fields = body instanceof URLSearchParams ? body : new URLSearchParams();
  const success =
    init?.method === "POST" &&
    fields.get("secret") === TEST_SECRET &&
    fields.get("response") === TEST_TOKEN &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      fields.get("idempotency_key") ?? "",
    );

  return Response.json(
    success
      ? {
          success: true,
          challenge_ts: "2026-08-24T00:00:00.000Z",
          hostname: "127.0.0.1",
          action: "test",
          "error-codes": [],
          metadata: { result_with_testing_key: true },
        }
      : { success: false, "error-codes": ["invalid-input-response"] },
    { status: 200 },
  );
};
