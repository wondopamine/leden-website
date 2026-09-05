import { handleCreateOrder } from "@/lib/orders/create-route.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handleCreateOrder;
