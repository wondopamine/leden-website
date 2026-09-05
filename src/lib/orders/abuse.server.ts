import "server-only";

import { createHmac, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { OrderBoundaryError } from "./errors";

export type TrustedIdentityProfile = {
  local: boolean;
  trustCloudflare: boolean;
};

export function assertSameOrigin(request: Request, allowedOrigin: string) {
  const actual = request.headers.get("origin");
  let expected: string;
  try {
    expected = new URL(allowedOrigin).origin;
  } catch {
    throw new OrderBoundaryError("ORDERING_UNAVAILABLE", 503);
  }
  if (!actual || actual !== expected) {
    throw new OrderBoundaryError("ORIGIN_FORBIDDEN", 403);
  }
}

export function resolveTrustedClientIdentity(
  headers: Headers,
  profile: TrustedIdentityProfile,
): string {
  if (profile.local) return "loopback";
  if (!profile.trustCloudflare) {
    throw new OrderBoundaryError("CLIENT_IDENTITY_UNAVAILABLE", 503);
  }
  const identity = headers.get("cf-connecting-ip")?.trim() ?? "";
  if (!isIP(identity)) {
    throw new OrderBoundaryError("CLIENT_IDENTITY_UNAVAILABLE", 503);
  }
  return identity;
}

export function deriveRateKey(
  identity: string,
  config: { version: string; key: string },
): string {
  if (!/^v[1-9][0-9]*$/.test(config.version) || config.key.length < 32) {
    throw new OrderBoundaryError("ORDERING_UNAVAILABLE", 503);
  }
  return createHmac("sha256", config.key)
    .update(`${config.version}\0${identity}`, "utf8")
    .digest("hex");
}

type TurnstileResult = {
  success?: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: unknown;
};

export type TurnstileConfig = {
  secret: string;
  expectedAction: string;
  expectedHostname: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
};

export async function verifyTurnstile(
  token: string,
  config: TurnstileConfig,
): Promise<void> {
  if (
    !config.secret ||
    !config.expectedAction ||
    !config.expectedHostname ||
    config.timeoutMs < 1
  ) {
    throw new OrderBoundaryError("CHALLENGE_UNAVAILABLE", 503);
  }
  const fetchImpl = config.fetchImpl ?? fetch;
  const retryIdentity = randomUUID();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const body = new URLSearchParams({
        secret: config.secret,
        response: token,
        idempotency_key: retryIdentity,
      });
      const response = await fetchImpl(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body,
          cache: "no-store",
          signal: controller.signal,
        },
      );
      if (!response.ok) throw new Error("siteverify unavailable");
      const result = (await response.json()) as TurnstileResult;
      if (result.success !== true) {
        const errorCodes = Array.isArray(result["error-codes"])
          ? result["error-codes"]
          : [];
        throw new OrderBoundaryError("CHALLENGE_FAILED", 403, {
          ambiguousChallenge: errorCodes.includes("timeout-or-duplicate"),
        });
      }
      if (
        result.action !== config.expectedAction ||
        result.hostname !== config.expectedHostname
      ) {
        throw new OrderBoundaryError("CHALLENGE_FAILED", 403);
      }
      return;
    } catch (error) {
      if (error instanceof OrderBoundaryError) throw error;
      if (attempt === 1) {
        throw new OrderBoundaryError("CHALLENGE_UNAVAILABLE", 503);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}

export function loadRequestTrust(request: Request) {
  const url = new URL(request.url);
  const local = isLoopbackHost(url.hostname) && process.env.NODE_ENV !== "production";
  const allowedOrigin = process.env.ORDER_APP_ORIGIN || (local ? url.origin : "");
  assertSameOrigin(request, allowedOrigin);
  const identity = resolveTrustedClientIdentity(request.headers, {
    local,
    trustCloudflare: process.env.ORDER_TRUST_CLOUDFLARE_IDENTITY === "true",
  });
  const version = process.env.ORDER_ABUSE_HMAC_VERSION || (local ? "v1" : "");
  const key =
    process.env[`ORDER_ABUSE_HMAC_KEY_${version.toUpperCase()}`] ||
    (local ? "local-order-abuse-key-not-for-production" : "");
  return {
    rateKeyHex: deriveRateKey(identity, { version, key }),
    turnstile: {
      secret: process.env.TURNSTILE_SECRET_KEY || "",
      expectedAction: process.env.TURNSTILE_EXPECTED_ACTION || "order_create",
      expectedHostname:
        process.env.TURNSTILE_EXPECTED_HOSTNAME || (local ? url.hostname : ""),
      timeoutMs: 2_000,
    } satisfies TurnstileConfig,
  };
}
