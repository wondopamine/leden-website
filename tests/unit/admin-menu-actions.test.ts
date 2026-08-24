import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/admin.server", () => ({
  requireStaff: vi.fn().mockResolvedValue({
    user: { id: "staff" },
    supabase: { rpc: mocks.rpc },
  }),
}));

import {
  createMenuItem,
  updateMenuItem,
} from "../../src/app/admin/(dashboard)/menu/actions";

const ITEM_ID = "d2000000-0000-4000-8000-000000000001";
const CATEGORY_ID = "d2000000-0000-4000-8000-000000000002";

function formData() {
  const data = new FormData();
  data.set("id", ITEM_ID);
  data.set("category_id", CATEGORY_ID);
  data.set("name_en", "Latte");
  data.set("name_fr", "Latte");
  data.set("description_en", "");
  data.set("description_fr", "");
  data.set("price", "5.00");
  data.set("available", "true");
  data.set("status", "available");
  data.set("image_url", "");
  data.set(
    "modifiers_json",
    JSON.stringify([
      {
        name_en: "Milk",
        name_fr: "Lait",
        min_selections: 0,
        max_selections: 1,
        options: [
          {
            name_en: "Oat",
            name_fr: "Avoine",
            price_adjustment: 0.75,
            available: false,
          },
        ],
      },
    ]),
  );
  return data;
}

describe("transactional admin menu save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockImplementation(
      (_functionName: string, args: { p_menu_item_id: string }) =>
        Promise.resolve({ data: args.p_menu_item_id, error: null }),
    );
  });

  it("preserves optional cardinality and unavailable choices in the single graph RPC", async () => {
    await updateMenuItem(formData());
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "save_menu_item_graph_v1",
      expect.objectContaining({
        p_modifiers: [
          expect.objectContaining({
            min_selections: 0,
            max_selections: 1,
            options: [
              expect.objectContaining({
                price_adjustment: "0.75",
                available: false,
              }),
            ],
          }),
        ],
      }),
    );
  });

  it("preserves sold-out status while editing unrelated menu fields", async () => {
    const data = formData();
    data.set("status", "sold_out");
    await updateMenuItem(data);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "save_menu_item_graph_v1",
      expect.objectContaining({
        p_item: expect.objectContaining({ status: "sold_out" }),
      }),
    );
  });

  it("creates the whole menu graph through one atomic RPC", async () => {
    const data = formData();
    data.delete("id");
    await createMenuItem(data);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "create_menu_item_graph_v1",
      expect.objectContaining({
        p_menu_item_id: expect.any(String),
        p_item: expect.objectContaining({ status: "available" }),
      }),
    );
  });
});
