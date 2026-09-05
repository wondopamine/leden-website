import { sampleCafeInfo } from "@/lib/sample-data";
import { getCafeInfo } from "@/lib/supabase/queries";
import type { CafeInfo } from "@/lib/types";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
};

function publicAvailability(cafeInfo: CafeInfo) {
  return {
    hours: cafeInfo.hours,
    orderingEnabled: cafeInfo.orderingEnabled,
    pickupLeadTime: cafeInfo.pickupLeadTime,
  };
}

export async function GET() {
  try {
    const cafeInfo =
      process.env.PLAYWRIGHT_STOREFRONT_PREVIEW === "1"
        ? sampleCafeInfo
        : await getCafeInfo();
    return Response.json(
      { availability: publicAvailability(cafeInfo) },
      { headers: RESPONSE_HEADERS },
    );
  } catch {
    return Response.json(
      { error: { code: "ORDERING_UNAVAILABLE" } },
      { status: 503, headers: RESPONSE_HEADERS },
    );
  }
}
