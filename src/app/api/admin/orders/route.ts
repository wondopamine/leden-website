import {
  AdminOrdersError,
  listAdminOrders,
} from "@/lib/orders/admin.server";
import { AdminAuthorizationError } from "@/lib/supabase/admin.server";

export const dynamic = "force-dynamic";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
};

export async function GET() {
  try {
    return Response.json(await listAdminOrders(), {
      status: 200,
      headers: PRIVATE_HEADERS,
    });
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return Response.json(
        { error: { code: error.code } },
        { status: error.status, headers: PRIVATE_HEADERS },
      );
    }
    const unavailable =
      error instanceof AdminOrdersError ? error : new AdminOrdersError();
    return Response.json(
      { error: { code: unavailable.code } },
      { status: unavailable.status, headers: PRIVATE_HEADERS },
    );
  }
}
