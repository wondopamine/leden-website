import { createClient } from "./server";
import type { MenuItem, Category, CafeInfo } from "../types";

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    _id: row.id,
    name: { en: row.name_en, fr: row.name_fr },
    slug: row.slug,
    order: row.sort_order,
  }));
}

export async function getMenuItems(): Promise<MenuItem[]> {
  const supabase = await createClient();

  const { data: items, error: itemsError } = await supabase
    .from("menu_items")
    .select(
      `
      *,
      category:categories(*),
      modifiers(
        *,
        options:modifier_options(*)
      )
    `
    )
    .order("sort_order");

  if (itemsError) throw itemsError;

  return (items ?? []).map((row) => {
    const modifiers: MenuItem["modifiers"] = (row.modifiers ?? [])
      .sort(
        (a: { sort_order: number }, b: { sort_order: number }) =>
          a.sort_order - b.sort_order
      )
      .map(
        (mod: {
          id: string;
          name_en: string;
          name_fr: string;
          min_selections: number;
          max_selections: number;
          options: {
            id: string;
            name_en: string;
            name_fr: string;
            price_adjustment: number;
            sort_order: number;
            available: boolean;
          }[];
        }) => ({
          _id: mod.id,
          name: { en: mod.name_en, fr: mod.name_fr },
          minSelections: mod.min_selections === 0 ? 0 : 1,
          maxSelections: 1,
          options: (mod.options ?? [])
            .filter((option) => option.available !== false)
            .sort(
              (
                a: { sort_order: number },
                b: { sort_order: number }
              ) => a.sort_order - b.sort_order
            )
            .map(
              (opt: {
                id: string;
                name_en: string;
                name_fr: string;
                price_adjustment: number;
              }) => ({
                _id: opt.id,
                name: { en: opt.name_en, fr: opt.name_fr },
                priceAdjustment: Number(opt.price_adjustment),
              })
            ),
        })
      );
    const hasEmptyModifier = modifiers.some(
      (modifier) => modifier.options.length === 0,
    );
    const status =
      hasEmptyModifier && row.status === "available"
        ? "sold_out"
        : ((row.status as "available" | "sold_out" | "hidden") ||
          "available");
    return {
      _id: row.id,
      name: { en: row.name_en, fr: row.name_fr },
      description: { en: row.description_en, fr: row.description_fr },
      price: Number(row.price),
      category: {
        _id: row.category.id,
        name: { en: row.category.name_en, fr: row.category.name_fr },
        slug: row.category.slug,
      },
      imageUrl: row.image_url ?? undefined,
      available: status !== "hidden",
      status,
      modifiers,
    };
  });
}

export async function getCafeInfo(): Promise<CafeInfo> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cafe_info")
    .select("*")
    .limit(1)
    .single();

  if (error) throw error;

  return {
    hours: data.hours as CafeInfo["hours"],
    address: data.address ?? "",
    phone: data.phone ?? "",
    announcement:
      data.announcement_en || data.announcement_fr
        ? { en: data.announcement_en ?? "", fr: data.announcement_fr ?? "" }
        : undefined,
    pickupLeadTime: data.pickup_lead_time,
    maxAdvanceOrderDays: data.max_advance_order_days,
  };
}
