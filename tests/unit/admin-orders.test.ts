import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  AdminOrdersError,
  getTorontoDayBounds,
  listAdminOrdersWithClient,
} from "../../src/lib/orders/admin.server";

type QueryResult = { data: unknown; error: { message: string } | null };

function query(result: QueryResult) {
  const calls: { method: string; args: unknown[] }[] = [];
  const builder = {
    select: (...args: unknown[]) => {
      calls.push({ method: "select", args });
      return builder;
    },
    or: (...args: unknown[]) => {
      calls.push({ method: "or", args });
      return builder;
    },
    order: (...args: unknown[]) => {
      calls.push({ method: "order", args });
      return builder;
    },
    eq: (...args: unknown[]) => {
      calls.push({ method: "eq", args });
      return builder;
    },
    maybeSingle: (...args: unknown[]) => {
      calls.push({ method: "maybeSingle", args });
      return builder;
    },
    then: <TResult1 = QueryResult, TResult2 = never>(
      onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) => Promise.resolve(result).then(onfulfilled, onrejected),
  };
  return { builder, calls };
}

function row(id: string, status: "new" | "picked_up", version = 0) {
  return {
    id,
    order_number: `LD-${id}`,
    customer_name: "Ada",
    customer_phone: "5145550101",
    pickup_time: null,
    promised_pickup_at: "2026-08-24T16:00:00.000Z",
    status,
    status_version: version,
    subtotal: "5.00",
    tax_gst: "0.25",
    tax_qst: "0.50",
    total: "5.75",
    created_at: "2026-08-24T15:00:00.000Z",
    updated_at: "2026-08-24T15:00:00.000Z",
    order_items: [],
  };
}

describe("Toronto admin day boundaries", () => {
  it("uses Toronto rather than the server timezone", () => {
    expect(
      getTorontoDayBounds(new Date("2026-08-24T23:30:00.000Z")),
    ).toEqual({
      localDate: "2026-08-24",
      start: "2026-08-24T04:00:00.000Z",
      end: "2026-08-25T04:00:00.000Z",
    });
  });

  it("preserves the 25-hour fall-back day", () => {
    expect(
      getTorontoDayBounds(new Date("2026-11-01T16:00:00.000Z")),
    ).toEqual({
      localDate: "2026-11-01",
      start: "2026-11-01T04:00:00.000Z",
      end: "2026-11-02T05:00:00.000Z",
    });
  });
});

describe("authorized canonical admin list", () => {
  it("returns a genuine empty queue as a successful canonical snapshot", async () => {
    const orders = query({ data: [], error: null });
    const cafe = query({ data: { ordering_enabled: true }, error: null });
    const from = vi.fn((table: string) =>
      table === "orders" ? orders.builder : cafe.builder,
    );

    await expect(
      listAdminOrdersWithClient(
        { from } as never,
        new Date("2026-08-24T18:00:00.000Z"),
      ),
    ).resolves.toEqual({
      orders: [],
      orderingEnabled: true,
      localDate: "2026-08-24",
      refreshedAt: "2026-08-24T18:00:00.000Z",
    });
  });

  it("queries active orders regardless of age plus only current-day terminal orders", async () => {
    const orders = query({
      data: [row("active-before-midnight", "new", 2), row("today-terminal", "picked_up", 4)],
      error: null,
    });
    const cafe = query({ data: { ordering_enabled: true }, error: null });
    const from = vi.fn((table: string) =>
      table === "orders" ? orders.builder : cafe.builder,
    );

    const snapshot = await listAdminOrdersWithClient(
      { from } as never,
      new Date("2026-08-24T18:00:00.000Z"),
    );

    const orCall = orders.calls.find((call) => call.method === "or");
    expect(String(orCall?.args[0])).toContain(
      "status.in.(new,preparing,ready)",
    );
    expect(String(orCall?.args[0])).toContain(
      "created_at.gte.2026-08-24T04:00:00.000Z",
    );
    expect(String(orCall?.args[0])).toContain(
      "created_at.lt.2026-08-25T04:00:00.000Z",
    );
    expect(snapshot).toMatchObject({
      orderingEnabled: true,
      localDate: "2026-08-24",
      orders: [
        { id: "active-before-midnight", status_version: 2 },
        { id: "today-terminal", status_version: 4 },
      ],
    });
  });

  it("maps dependency failure without exposing raw text", async () => {
    const orders = query({
      data: null,
      error: { message: "raw database hostname and policy details" },
    });
    const cafe = query({ data: { ordering_enabled: true }, error: null });
    const from = vi.fn((table: string) =>
      table === "orders" ? orders.builder : cafe.builder,
    );

    await expect(
      listAdminOrdersWithClient(
        { from } as never,
        new Date("2026-08-24T18:00:00.000Z"),
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "ADMIN_ORDERS_UNAVAILABLE",
        message: "Admin orders are temporarily unavailable.",
      }),
    );
    await expect(
      listAdminOrdersWithClient(
        { from } as never,
        new Date("2026-08-24T18:00:00.000Z"),
      ),
    ).rejects.toBeInstanceOf(AdminOrdersError);
  });
});
