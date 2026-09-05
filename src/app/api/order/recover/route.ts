import { loadRequestTrust } from "@/lib/orders/abuse.server";
import {
  MAX_TRACKING_BODY_BYTES,
  parseRecoveryRequest,
  readBoundedJson,
} from "@/lib/orders/contracts";
import {
  asOrderBoundaryError,
  errorResponse,
  jsonResponse,
  logSafeOrderFailure,
} from "@/lib/orders/errors";
import { createOrderRepository } from "@/lib/orders/repository.server";
import { sha256Hex } from "@/lib/orders/tracking.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const trust = loadRequestTrust(request);
    const input = parseRecoveryRequest(
      await readBoundedJson(request, MAX_TRACKING_BODY_BYTES),
    );
    const repository = createOrderRepository();
    await repository.consumeRateLimit("recovery", trust.rateKeyHex, 10, 60);
    const receipt = await repository.recover(
      input.attemptId,
      sha256Hex(input.trackingSecret),
    );
    return jsonResponse({ receipt }, { status: 200 });
  } catch (error) {
    const boundaryError = asOrderBoundaryError(error);
    if (boundaryError.status >= 500) {
      logSafeOrderFailure("recovery", boundaryError);
    }
    return errorResponse(boundaryError);
  }
}
