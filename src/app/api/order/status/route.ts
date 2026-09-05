import { loadRequestTrust } from "@/lib/orders/abuse.server";
import {
  MAX_TRACKING_BODY_BYTES,
  parseStatusRequest,
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
import { sha256Hex } from "@/lib/orders/tracking.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const trust = loadRequestTrust(request);
    const input = parseStatusRequest(
      await readBoundedJson(request, MAX_TRACKING_BODY_BYTES),
    );
    const repository = createOrderRepository();
    await repository.consumeRateLimit("status", trust.rateKeyHex, 120, 60);
    const status = await repository.status(sha256Hex(input.trackingSecret));
    if (!status) throw new OrderBoundaryError("TRACKING_UNAVAILABLE", 404);
    return jsonResponse({ order: status }, { status: 200 });
  } catch (error) {
    const boundaryError = asOrderBoundaryError(error);
    if (boundaryError.status >= 500) {
      logSafeOrderFailure("status", boundaryError);
    }
    return errorResponse(boundaryError);
  }
}
