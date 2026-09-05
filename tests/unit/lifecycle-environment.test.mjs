import { describe, expect, it } from "vitest";

import {
  buildInterceptedDesignEnvironment,
  withPlaywrightPort,
} from "../../scripts/lifecycle-environment.mjs";

describe("buildInterceptedDesignEnvironment", () => {
  it("removes privileged and live public configuration before the intercepted build", () => {
    const environment = buildInterceptedDesignEnvironment({
      SUPABASE_SERVICE_ROLE_KEY: "legacy-privileged",
      SUPABASE_SECRET_KEY: "new-privileged",
      NEXT_PUBLIC_SUPABASE_URL: "https://hosted.invalid",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "hosted-public",
      NEXT_PUBLIC_ORDER_CHALLENGE_TEST_TOKEN: "inherited-token",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "inherited-site",
      NEXT_PUBLIC_TURNSTILE_ACTION: "inherited-action",
    });

    expect(environment).not.toHaveProperty("SUPABASE_SERVICE_ROLE_KEY");
    expect(environment).not.toHaveProperty("SUPABASE_SECRET_KEY");
    expect(environment).not.toHaveProperty("NEXT_PUBLIC_SUPABASE_URL");
    expect(environment).not.toHaveProperty("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(environment).toMatchObject({
      PLAYWRIGHT_ALLOW_MUTATIONS: "0",
      PLAYWRIGHT_REQUIRE_FRESH_SERVER: "1",
      NEXT_PUBLIC_ORDER_CHALLENGE_TEST_TOKEN: "intercepted-e2e-challenge",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
      NEXT_PUBLIC_TURNSTILE_ACTION: "test",
    });
    expect(environment).not.toHaveProperty("PLAYWRIGHT_PORT");
    expect(withPlaywrightPort(environment, 3210)).toMatchObject({
      PLAYWRIGHT_PORT: "3210",
    });
  });
});
