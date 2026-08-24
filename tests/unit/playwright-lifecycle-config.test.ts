import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { deriveLifecycleClientIp } from "../e2e/helpers/lifecycle-identity.mjs";

const workspace = resolve(import.meta.dirname, "../..");
const importConfig = [
  "--import",
  "tsx",
  "--input-type=module",
  "--eval",
  "const loaded = await import('./playwright.config.ts'); const config = loaded.default.default ?? loaded.default; process.stdout.write(JSON.stringify({ reuseExistingServer: config.webServer.reuseExistingServer, stdout: config.webServer.stdout, stderr: config.webServer.stderr, command: config.webServer.command, baseURL: config.use.baseURL, url: config.webServer.url, origin: config.webServer.env.ORDER_APP_ORIGIN, turnstileHostname: config.webServer.env.TURNSTILE_EXPECTED_HOSTNAME }))",
];
const safeRealEnvironment: NodeJS.ProcessEnv = {
  ...process.env,
  PLAYWRIGHT_REAL_LIFECYCLE: "1",
  PLAYWRIGHT_LIFECYCLE_CLEAN_RESET: "1",
  LIFECYCLE_MUTATION_TARGET: "local",
  PLAYWRIGHT_NON_PRODUCTION_SUPABASE_URL: "http://127.0.0.1:54321",
  PLAYWRIGHT_LIFECYCLE_RUN_ID: "20260824T120000Z-8d71d2cb8d71d2cb",
  PLAYWRIGHT_LIFECYCLE_CLIENT_IP:
    deriveLifecycleClientIp("20260824T120000Z-8d71d2cb8d71d2cb"),
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-local-service-key",
  TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
  NEXT_PUBLIC_ORDER_CHALLENGE_TEST_TOKEN: "XXXX.DUMMY.TOKEN.XXXX",
  ORDER_ABUSE_HMAC_VERSION: "v1",
  ORDER_ABUSE_HMAC_KEY_V1:
    "synthetic-local-lifecycle-hmac-key-with-more-than-32-bytes",
};
delete safeRealEnvironment.SUPABASE_SECRET_KEY;

function loadRealConfig(overrides: Partial<NodeJS.ProcessEnv>) {
  return execFileSync(process.execPath, importConfig, {
    cwd: workspace,
    env: { ...safeRealEnvironment, ...overrides },
    stdio: "pipe",
    encoding: "utf8",
  });
}

function importRealConfig(overrides: Partial<NodeJS.ProcessEnv>) {
  return () => loadRealConfig(overrides);
}

function interceptedEnvironment(
  overrides: Partial<NodeJS.ProcessEnv> = {},
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    PLAYWRIGHT_REAL_LIFECYCLE: "0",
    PLAYWRIGHT_REQUIRE_FRESH_SERVER: "1",
    ...overrides,
  };
  if (!("SUPABASE_SERVICE_ROLE_KEY" in overrides)) {
    delete environment.SUPABASE_SERVICE_ROLE_KEY;
  }
  if (!("SUPABASE_SECRET_KEY" in overrides)) {
    delete environment.SUPABASE_SECRET_KEY;
  }
  return environment;
}

function loadInterceptedConfig(overrides: Partial<NodeJS.ProcessEnv> = {}) {
  return execFileSync(process.execPath, importConfig, {
    cwd: workspace,
    env: interceptedEnvironment(overrides),
    stdio: "pipe",
    encoding: "utf8",
  });
}

describe("real lifecycle Playwright target guard", () => {
  it("accepts only the exact clean loopback server contract", () => {
    expect(JSON.parse(loadRealConfig({}))).toEqual({
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
      command:
        "npx next build --webpack && npm run start -- --hostname 127.0.0.1 --port 3100",
      baseURL: "http://127.0.0.1:3100",
      url: "http://127.0.0.1:3100/en",
      origin: "http://127.0.0.1:3100",
      turnstileHostname: "127.0.0.1",
    });
  });

  it("rejects an inherited hosted privileged URL", () => {
    expect(
      importRealConfig({ SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co" }),
    ).toThrow();
  });

  it("rejects an inherited new-style privileged key", () => {
    expect(importRealConfig({ SUPABASE_SECRET_KEY: "sb_secret_hosted" })).toThrow();
  });

  it("never reuses a listener when the aggregate requires a fresh server", () => {
    const output = loadInterceptedConfig();
    expect(JSON.parse(output).reuseExistingServer).toBe(false);
  });

  it.each(["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"])(
    "rejects intercepted fresh-server inheritance of %s",
    (key) => {
      expect(() => loadInterceptedConfig({ [key]: "hosted-privileged-key" })).toThrow(
        /must not receive privileged Supabase credentials/,
      );
    },
  );
});
