import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  createBrowserClient: vi.fn(),
  createServerClient: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createBrowserClient,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

import {
  SUPABASE_REQUEST_TIMEOUT_MS,
  createBoundedSupabaseFetch,
} from "../../src/lib/supabase/bounded-fetch.server";
import {
  CHECKOUT_CREATE_TIMEOUT_MS,
  CHECKOUT_RECOVERY_TIMEOUT_MS,
} from "../../src/lib/orders/checkout-attempt";
import { ADMIN_REFRESH_TIMEOUT_MS } from "../../src/lib/orders/admin-realtime";
import { createPrivilegedClient } from "../../src/lib/supabase/privileged.server";
import { createClient as createStaffClient } from "../../src/lib/supabase/server";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("SUPABASE_URL", "https://staging.example.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "staging-secret-key");
  vi.stubEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    "https://staging.example.supabase.co",
  );
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "staging-public-key");
  mocks.createBrowserClient.mockImplementation((_url, _key, options) => ({
    options,
  }));
  mocks.createServerClient.mockImplementation((_url, _key, options) => ({
    options,
  }));
  mocks.cookies.mockResolvedValue({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function expectHangingFetchToTimeOut(fetcher: typeof fetch) {
  const pending = fetcher("https://staging.example.supabase.co/rest/v1/orders");
  const assertion = expect(pending).rejects.toMatchObject({
    name: "TimeoutError",
  });
  await vi.advanceTimersByTimeAsync(SUPABASE_REQUEST_TIMEOUT_MS);
  await assertion;
}

describe("bounded server Supabase transport", () => {
  it("settles every full route path before its client deadline", () => {
    const turnstileWorstCaseMs = 2 * 2_000;
    const committedReplayWindowMs = 900;

    expect(CHECKOUT_CREATE_TIMEOUT_MS).toBeGreaterThan(
      3 * SUPABASE_REQUEST_TIMEOUT_MS +
        turnstileWorstCaseMs +
        committedReplayWindowMs,
    );
    expect(CHECKOUT_RECOVERY_TIMEOUT_MS).toBeGreaterThan(
      2 * SUPABASE_REQUEST_TIMEOUT_MS,
    );
    expect(ADMIN_REFRESH_TIMEOUT_MS).toBeGreaterThan(
      3 * SUPABASE_REQUEST_TIMEOUT_MS,
    );
  });

  it("aborts and rejects even when the underlying transport ignores AbortSignal", async () => {
    const hangingTransport = vi.fn(
      (input: RequestInfo | URL, init?: RequestInit) => {
        void input;
        void init;
        return new Promise<Response>(() => undefined);
      },
    );
    const boundedFetch = createBoundedSupabaseFetch(
      50,
      hangingTransport as unknown as typeof fetch,
    );
    const pending = boundedFetch("https://staging.example.supabase.co/rest/v1/orders");
    const assertion = expect(pending).rejects.toMatchObject({
      name: "TimeoutError",
    });

    await vi.advanceTimersByTimeAsync(50);

    await assertion;
    expect(hangingTransport.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it("installs the hard deadline on privileged create/read clients", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => undefined)),
    );
    const client = createPrivilegedClient() as unknown as {
      options: { global: { fetch: typeof fetch } };
    };

    await expectHangingFetchToTimeOut(client.options.global.fetch);
  });

  it("installs the same deadline on cookie-aware staff and public server clients", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => undefined)),
    );
    const client = (await createStaffClient()) as unknown as {
      options: { global: { fetch: typeof fetch } };
    };

    await expectHangingFetchToTimeOut(client.options.global.fetch);
  });
});
