import { jsonResponse } from "@/lib/orders/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEGACY_ORDER_REFRESH_MESSAGE =
  "Please refresh this page before ordering. Veuillez actualiser cette page avant de commander.";

/**
 * Compatibility boundary for checkout JavaScript loaded before the v1 deploy.
 *
 * The old browser renders a string from `data.error`. It keeps its cart when
 * this request fails, so this rejection is deliberately shaped for that client.
 * The request body is deliberately not consumed: even a stalled legacy upload
 * receives the fixed rejection without reaching validation or persistence.
 */
export function POST(request: Request) {
  void request;

  return jsonResponse(
    { error: LEGACY_ORDER_REFRESH_MESSAGE },
    { status: 409 },
  );
}
