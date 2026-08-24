import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { getMenuItems } from "@/lib/supabase/queries";

describe("storefront menu identity mapping", () => {
  beforeEach(() => {
    mocks.createClient.mockReset();
  });

  it("preserves modifier and option UUIDs with zero-or-one/one-only cardinality", async () => {
    const rows = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name_en: "Toast",
        name_fr: "Rôtie",
        description_en: "Fresh",
        description_fr: "Fraîche",
        price: 10,
        image_url: null,
        status: "available",
        category: {
          id: "22222222-2222-4222-8222-222222222222",
          name_en: "Breakfast",
          name_fr: "Déjeuner",
          slug: "breakfast",
        },
        modifiers: [
          {
            id: "33333333-3333-4333-8333-333333333333",
            name_en: "Required",
            name_fr: "Obligatoire",
            min_selections: 1,
            max_selections: 1,
            sort_order: 1,
            options: [
              {
                id: "44444444-4444-4444-8444-444444444444",
                name_en: "One",
                name_fr: "Un",
                price_adjustment: 0,
                sort_order: 1,
                available: true,
              },
              {
                id: "77777777-7777-4777-8777-777777777777",
                name_en: "Unavailable",
                name_fr: "Indisponible",
                price_adjustment: 1,
                sort_order: 2,
                available: false,
              },
            ],
          },
          {
            id: "55555555-5555-4555-8555-555555555555",
            name_en: "Optional",
            name_fr: "Facultatif",
            min_selections: 0,
            max_selections: 1,
            sort_order: 2,
            options: [
              {
                id: "66666666-6666-4666-8666-666666666666",
                name_en: "Extra",
                name_fr: "Extra",
                price_adjustment: 2,
                sort_order: 1,
                available: true,
              },
            ],
          },
        ],
      },
    ];
    rows.push({
      ...rows[0],
      id: "88888888-8888-4888-8888-888888888888",
      modifiers: [
        {
          ...rows[0].modifiers[0],
          id: "99999999-9999-4999-8999-999999999999",
          options: [
            {
              ...rows[0].modifiers[0].options[1],
              id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            },
          ],
        },
      ],
    });
    mocks.createClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          order: async () => ({ data: rows, error: null }),
        }),
      }),
    });

    const [item, blockedItem] = await getMenuItems();

    expect(item._id).toBe(rows[0].id);
    expect(item.modifiers).toEqual([
      expect.objectContaining({
        _id: rows[0].modifiers[0].id,
        minSelections: 1,
        maxSelections: 1,
        options: [
          expect.objectContaining({ _id: rows[0].modifiers[0].options[0].id }),
        ],
      }),
      expect.objectContaining({
        _id: rows[0].modifiers[1].id,
        minSelections: 0,
        maxSelections: 1,
        options: [
          expect.objectContaining({ _id: rows[0].modifiers[1].options[0].id }),
        ],
      }),
    ]);
    expect(item.modifiers[0].options).toHaveLength(1);
    expect(blockedItem.status).toBe("sold_out");
  });
});
