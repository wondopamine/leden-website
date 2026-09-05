import "server-only";

import {
  loadRequestTrust,
  verifyTurnstile,
} from "@/lib/orders/abuse.server";
import {
  MAX_ORDER_BODY_BYTES,
  canonicalizeCreateMaterial,
  parseCreateOrderRequest,
  readBoundedJson,
} from "@/lib/orders/contracts";
import {
  OrderBoundaryError,
  asOrderBoundaryError,
  errorResponse,
  jsonResponse,
  logSafeOrderFailure,
} from "@/lib/orders/errors";
import { createOrderRepository } from "@/lib/orders/repository.server";
import { normalizePickupForDatabase } from "@/lib/orders/time.server";
import { sha256Hex } from "@/lib/orders/tracking.server";

export async function handleCreateOrder(request: Request) {
  try {
    const trust = loadRequestTrust(request);
    const rawBody = await readBoundedJson(request, MAX_ORDER_BODY_BYTES);
    const parsed = parseCreateOrderRequest(rawBody);
    const input = {
      ...parsed,
      pickup: normalizePickupForDatabase(parsed.pickup),
    };
    const trackingHashHex = sha256Hex(input.trackingSecret);
    const material = canonicalizeCreateMaterial(input, trackingHashHex);
    const repository = createOrderRepository();

    await repository.consumeRateLimit("create", trust.rateKeyHex, 10, 60);

    const replay = await repository.findCommittedReplay(
      input.attemptId,
      trackingHashHex,
      material,
    );
    if (replay) return jsonResponse({ receipt: replay }, { status: 200 });

    try {
      await verifyTurnstile(input.turnstileToken, trust.turnstile);
    } catch (challengeError) {
      const mappedChallenge = asOrderBoundaryError(challengeError);
      if (!mappedChallenge.metadata.ambiguousChallenge) throw mappedChallenge;
      const concurrentReplay = await repository.waitForCommittedReplay(
        input.attemptId,
        trackingHashHex,
        material,
      );
      if (concurrentReplay) {
        return jsonResponse({ receipt: concurrentReplay }, { status: 200 });
      }
      throw new OrderBoundaryError("RECEIPT_UNCERTAIN", 503);
    }

    try {
      const receipt = await repository.create(input, trackingHashHex);
      return jsonResponse({ receipt }, { status: 201 });
    } catch (creationError) {
      const boundaryError = asOrderBoundaryError(creationError);
      if (
        boundaryError.code !== "DEPENDENCY_UNAVAILABLE" &&
        boundaryError.code !== "INTERNAL_ERROR"
      ) {
        throw boundaryError;
      }
      let recovered;
      try {
        recovered = await repository.waitForCommittedReplay(
          input.attemptId,
          trackingHashHex,
          material,
        );
      } catch (probeError) {
        const mappedProbe = asOrderBoundaryError(probeError);
        if (mappedProbe.code === "IDEMPOTENCY_CONFLICT") throw mappedProbe;
        if (mappedProbe.code === "RECEIPT_UNCERTAIN") throw mappedProbe;
        throw new OrderBoundaryError("RECEIPT_UNCERTAIN", 503);
      }
      if (recovered) {
        return jsonResponse({ receipt: recovered }, { status: 200 });
      }
      // A timed-out or dropped create transport cannot prove that the database
      // did not commit. Keep the customer in the same-attempt recovery flow.
      throw new OrderBoundaryError("RECEIPT_UNCERTAIN", 503);
    }
  } catch (error) {
    const boundaryError = asOrderBoundaryError(error);
    if (boundaryError.status >= 500) {
      logSafeOrderFailure("create", boundaryError);
    }
    return errorResponse(boundaryError);
  }
}
