import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({ listAdminOrders: vi.fn() }));

vi.mock("@/lib/orders/admin.server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/orders/admin.server")>(
    "@/lib/orders/admin.server",
  );
  return { ...actual, listAdminOrders: mocks.listAdminOrders };
});

import { GET } from "../../src/app/api/admin/orders/route";
import { AdminOrdersError } from "../../src/lib/orders/admin.server";
import { AdminAuthorizationError } from "../../src/lib/supabase/admin.server";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listAdminOrders.mockResolvedValue({
    orders: [],
    orderingEnabled: true,
    localDate: "2026-08-24",
    refreshedAt: "2026-08-24T18:00:00.000Z",
  });
});

describe("authorized admin order Route Handler", () => {
  it("returns the shared snapshot with private no-store headers", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      orders: [],
      orderingEnabled: true,
      localDate: "2026-08-24",
      refreshedAt: "2026-08-24T18:00:00.000Z",
    });
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it.each([
    [new AdminAuthorizationError("ADMIN_UNAUTHENTICATED", 401), 401, "ADMIN_UNAUTHENTICATED"],
    [new AdminAuthorizationError("ADMIN_FORBIDDEN", 403), 403, "ADMIN_FORBIDDEN"],
    [new AdminOrdersError(), 503, "ADMIN_ORDERS_UNAVAILABLE"],
  ])("maps safe failures without leaking dependency text", async (error, status, code) => {
    mocks.listAdminOrders.mockRejectedValue(error);
    const response = await GET();
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: { code } });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
