import { defineConfig, devices } from "@playwright/test";
import { isIP } from "node:net";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { deriveLifecycleClientIp } from "./tests/e2e/helpers/lifecycle-identity.mjs";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const realLifecycle = process.env.PLAYWRIGHT_REAL_LIFECYCLE === "1";
const localTurnstilePreload = pathToFileURL(
  resolve(process.cwd(), "tests/e2e/helpers/turnstile-local-preload.mjs"),
).href;

if (realLifecycle) {
  const required = {
    PLAYWRIGHT_LIFECYCLE_CLEAN_RESET:
      process.env.PLAYWRIGHT_LIFECYCLE_CLEAN_RESET,
    LIFECYCLE_MUTATION_TARGET: process.env.LIFECYCLE_MUTATION_TARGET,
    PLAYWRIGHT_NON_PRODUCTION_SUPABASE_URL:
      process.env.PLAYWRIGHT_NON_PRODUCTION_SUPABASE_URL,
    PLAYWRIGHT_LIFECYCLE_RUN_ID: process.env.PLAYWRIGHT_LIFECYCLE_RUN_ID,
    PLAYWRIGHT_LIFECYCLE_CLIENT_IP:
      process.env.PLAYWRIGHT_LIFECYCLE_CLIENT_IP,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY:
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_ORDER_CHALLENGE_TEST_TOKEN:
      process.env.NEXT_PUBLIC_ORDER_CHALLENGE_TEST_TOKEN,
    ORDER_ABUSE_HMAC_VERSION: process.env.ORDER_ABUSE_HMAC_VERSION,
    ORDER_ABUSE_HMAC_KEY_V1: process.env.ORDER_ABUSE_HMAC_KEY_V1,
  };
  if (
    required.PLAYWRIGHT_LIFECYCLE_CLEAN_RESET !== "1" ||
    required.LIFECYCLE_MUTATION_TARGET !== "local" ||
    required.PLAYWRIGHT_NON_PRODUCTION_SUPABASE_URL !==
      "http://127.0.0.1:54321" ||
    !required.PLAYWRIGHT_LIFECYCLE_RUN_ID ||
    required.PLAYWRIGHT_LIFECYCLE_CLIENT_IP !==
      deriveLifecycleClientIp(required.PLAYWRIGHT_LIFECYCLE_RUN_ID) ||
    isIP(required.PLAYWRIGHT_LIFECYCLE_CLIENT_IP) !== 6 ||
    required.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321" ||
    required.SUPABASE_URL !== "http://127.0.0.1:54321" ||
    required.SUPABASE_SECRET_KEY !== undefined ||
    !required.SUPABASE_SERVICE_ROLE_KEY ||
    required.TURNSTILE_SECRET_KEY !==
      "1x0000000000000000000000000000000AA" ||
    required.NEXT_PUBLIC_TURNSTILE_SITE_KEY !==
      "" ||
    required.NEXT_PUBLIC_ORDER_CHALLENGE_TEST_TOKEN !==
      "XXXX.DUMMY.TOKEN.XXXX" ||
    required.ORDER_ABUSE_HMAC_VERSION !== "v1" ||
    (required.ORDER_ABUSE_HMAC_KEY_V1?.length ?? 0) < 32
  ) {
    throw new Error(
      "Real lifecycle Playwright is restricted to a clean, sentinel-verified local target with Cloudflare's official test secret.",
    );
  }
}

if (
  !realLifecycle &&
  process.env.PLAYWRIGHT_REQUIRE_FRESH_SERVER === "1" &&
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)
) {
  throw new Error(
    "Fresh intercepted Playwright servers must not receive privileged Supabase credentials.",
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: "**/gallery-design.spec.ts",
  fullyParallel: !realLifecycle,
  workers: realLifecycle ? 1 : undefined,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  preserveOutput: realLifecycle ? "never" : "always",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: realLifecycle ? "off" : "retain-on-failure",
    screenshot: realLifecycle ? "off" : "only-on-failure",
    video: realLifecycle ? "off" : "retain-on-failure",
    extraHTTPHeaders: realLifecycle
      ? { "cf-connecting-ip": process.env.PLAYWRIGHT_LIFECYCLE_CLIENT_IP! }
      : undefined,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `${process.env.PLAYWRIGHT_SKIP_BUILD === "1" ? "" : "npx next build --webpack && "}npm run start -- --hostname 127.0.0.1 --port ${port}`,
    env: {
      ...process.env,
      NEXT_PUBLIC_ORDER_CHALLENGE_TEST_TOKEN: realLifecycle
        ? "XXXX.DUMMY.TOKEN.XXXX"
        : "intercepted-e2e-challenge",
      ...(realLifecycle
        ? {
            NODE_OPTIONS: [
              process.env.NODE_OPTIONS,
              `--import=${localTurnstilePreload}`,
            ]
              .filter(Boolean)
              .join(" "),
          }
        : {}),
      PLAYWRIGHT_STOREFRONT_PREVIEW: realLifecycle ? "0" : "1",
      ...(realLifecycle
        ? {
            ORDER_APP_ORIGIN: `http://127.0.0.1:${port}`,
            ORDER_TRUST_CLOUDFLARE_IDENTITY: "true",
            TURNSTILE_EXPECTED_ACTION: "test",
            TURNSTILE_EXPECTED_HOSTNAME: "127.0.0.1",
            NEXT_PUBLIC_TURNSTILE_ACTION: "test",
          }
        : {}),
    },
    url: `http://127.0.0.1:${port}/en`,
    stdout: realLifecycle ? "pipe" : "ignore",
    stderr: "pipe",
    reuseExistingServer:
      !realLifecycle &&
      !process.env.CI &&
      process.env.PLAYWRIGHT_REQUIRE_FRESH_SERVER !== "1",
    timeout: 180_000,
  },
});
