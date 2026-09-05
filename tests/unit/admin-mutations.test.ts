import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  saveMenuItemGraphWithClient,
  transitionAdminOrderWithClient,
  updateOnlineOrderingWithClient,
} from "../../src/lib/orders/admin.server";

const ORDER_ID = "d2000000-0000-4000-8000-000000000001";

function currentOrderQuery(data: unknown) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
  return builder;
}

describe("compare-and-set admin transitions", () => {
  it.each([null, "not-an-order", {}, { orderId: ORDER_ID }])(
    "rejects a malformed transition payload before the RPC",
    async (input) => {
      const rpc = vi.fn();
      await expect(
        transitionAdminOrderWithClient(
          { from: vi.fn(), rpc } as never,
          input,
        ),
      ).resolves.toEqual({ ok: false, code: "INVALID_TRANSITION" });
      expect(rpc).not.toHaveBeenCalled();
    },
  );

  it("passes expected status/version and returns only the canonical result", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        order_id: ORDER_ID,
        status: "preparing",
        status_version: 3,
        updated_at: "2026-08-24T18:00:00.000Z",
      },
      error: null,
    });
    const from = vi.fn();

    await expect(
      transitionAdminOrderWithClient({ from, rpc } as never, {
        orderId: ORDER_ID,
        expectedStatus: "new",
        expectedVersion: 2,
        newStatus: "preparing",
      }),
    ).resolves.toEqual({
      ok: true,
      order: {
        id: ORDER_ID,
        status: "preparing",
        statusVersion: 3,
        updatedAt: "2026-08-24T18:00:00.000Z",
      },
    });
    expect(rpc).toHaveBeenCalledWith("transition_order_status_v1", {
      p_order_id: ORDER_ID,
      p_expected_status: "new",
      p_expected_version: 2,
      p_new_status: "preparing",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("recovers the canonical safe state when another staff action wins", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "OLH_TRANSITION_CONFLICT raw details" },
    });
    const query = currentOrderQuery({
      status: "cancelled",
      status_version: 3,
      updated_at: "2026-08-24T18:00:00.000Z",
    });
    const from = vi.fn(() => query);

    await expect(
      transitionAdminOrderWithClient({ from, rpc } as never, {
        orderId: ORDER_ID,
        expectedStatus: "new",
        expectedVersion: 2,
        newStatus: "preparing",
      }),
    ).resolves.toEqual({
      ok: false,
      code: "ORDER_CONFLICT",
      current: {
        status: "cancelled",
        statusVersion: 3,
        updatedAt: "2026-08-24T18:00:00.000Z",
      },
    });
  });

  it.each([
    ["new", "ready"],
    ["preparing", "picked_up"],
    ["ready", "preparing"],
    ["picked_up", "cancelled"],
    ["cancelled", "new"],
  ] as const)("rejects illegal %s → %s before the RPC", async (expectedStatus, newStatus) => {
    const rpc = vi.fn();
    await expect(
      transitionAdminOrderWithClient({ from: vi.fn(), rpc } as never, {
        orderId: ORDER_ID,
        expectedStatus,
        expectedVersion: 2,
        newStatus,
      }),
    ).resolves.toEqual({ ok: false, code: "INVALID_TRANSITION" });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("admin operational mutations", () => {
  it("updates only the singleton online-ordering gate", async () => {
    const builder = {
      update: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      select: vi.fn(() => builder),
      single: vi.fn().mockResolvedValue({
        data: { ordering_enabled: false },
        error: null,
      }),
    };
    const from = vi.fn(() => builder);
    await expect(
      updateOnlineOrderingWithClient({ from } as never, false),
    ).resolves.toEqual({ ok: true, enabled: false });
    expect(from).toHaveBeenCalledWith("cafe_info");
    expect(builder.update).toHaveBeenCalledWith({ ordering_enabled: false });
    expect(builder.eq).toHaveBeenCalledWith("singleton", true);
  });

  it("saves a menu item and all modifier choices through one RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: ORDER_ID, error: null });
    const item = {
      category_id: ORDER_ID,
      name_en: "Latte",
      name_fr: "Latte",
      description_en: "",
      description_fr: "",
      price: "5.00",
      status: "available",
      image_url: null,
    } as const;
    const modifiers = [
      {
        name_en: "Milk",
        name_fr: "Lait",
        min_selections: 1 as const,
        max_selections: 1 as const,
        options: [
          {
            name_en: "Oat",
            name_fr: "Avoine",
            price_adjustment: "0.75",
            available: true,
          },
        ],
      },
    ];
    await expect(
      saveMenuItemGraphWithClient(
        { rpc } as never,
        ORDER_ID,
        item,
        modifiers,
      ),
    ).resolves.toBe(ORDER_ID);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("save_menu_item_graph_v1", {
      p_menu_item_id: ORDER_ID,
      p_item: item,
      p_modifiers: modifiers,
    });
  });
});
