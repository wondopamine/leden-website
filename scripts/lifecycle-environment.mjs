const INTERCEPTED_REMOVED_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "PLAYWRIGHT_NON_PRODUCTION_SUPABASE_URL",
  "LIFECYCLE_MUTATION_TARGET",
  "PLAYWRIGHT_LIFECYCLE_RUN_ID",
  "TURNSTILE_SECRET_KEY",
  "NEXT_PUBLIC_ORDER_CHALLENGE_TEST_TOKEN",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "NEXT_PUBLIC_TURNSTILE_ACTION",
];

export function buildInterceptedDesignEnvironment(baseEnvironment = process.env) {
  const environment = { ...baseEnvironment };
  for (const key of INTERCEPTED_REMOVED_KEYS) delete environment[key];
  return {
    ...environment,
    PLAYWRIGHT_REAL_LIFECYCLE: "0",
    PLAYWRIGHT_ALLOW_MUTATIONS: "0",
    PLAYWRIGHT_STOREFRONT_PREVIEW: "1",
    PLAYWRIGHT_SKIP_BUILD: "1",
    PLAYWRIGHT_REQUIRE_FRESH_SERVER: "1",
    NEXT_PUBLIC_ORDER_CHALLENGE_TEST_TOKEN: "intercepted-e2e-challenge",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
    NEXT_PUBLIC_TURNSTILE_ACTION: "test",
  };
}

export function withPlaywrightPort(environment, port) {
  if (
    !Number.isSafeInteger(port) ||
    port < 1024 ||
    port > 65_535
  ) {
    throw new Error("Playwright port must be an unprivileged TCP port.");
  }
  return { ...environment, PLAYWRIGHT_PORT: String(port) };
}
