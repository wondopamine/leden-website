"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createMenuItem(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const categoryId = formData.get("category_id") as string;
  const { data: item, error } = await supabase
    .from("menu_items")
    .insert({
      name_en: formData.get("name_en") as string,
      name_fr: formData.get("name_fr") as string,
      description_en: (formData.get("description_en") as string) || "",
      description_fr: (formData.get("description_fr") as string) || "",
      price: parseFloat(formData.get("price") as string),
      category_id: categoryId,
      available: formData.get("available") === "true",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // Handle modifiers
  const modifiersJson = formData.get("modifiers_json") as string;
  if (modifiersJson && item) {
    await saveModifiers(supabase, item.id, JSON.parse(modifiersJson));
  }

  revalidatePath("/admin/menu");
  revalidatePath("/");
  redirect("/admin/menu");
}

export async function updateMenuItem(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const id = formData.get("id") as string;

  const { error } = await supabase
    .from("menu_items")
    .update({
      name_en: formData.get("name_en") as string,
      name_fr: formData.get("name_fr") as string,
      description_en: (formData.get("description_en") as string) || "",
      description_fr: (formData.get("description_fr") as string) || "",
      price: parseFloat(formData.get("price") as string),
      category_id: formData.get("category_id") as string,
      available: formData.get("available") === "true",
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  // Replace modifiers: delete existing, insert new
  await supabase.from("modifiers").delete().eq("menu_item_id", id);
  const modifiersJson = formData.get("modifiers_json") as string;
  if (modifiersJson) {
    await saveModifiers(supabase, id, JSON.parse(modifiersJson));
  }

  revalidatePath("/admin/menu");
  revalidatePath("/");
  redirect("/admin/menu");
}

export async function deleteMenuItem(id: string) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/menu");
  revalidatePath("/");
}

export async function toggleMenuItemAvailability(
  id: string,
  available: boolean
) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("menu_items")
    .update({ available })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/menu");
  revalidatePath("/");
}

type ModifierInput = {
  name_en: string;
  name_fr: string;
  options: {
    name_en: string;
    name_fr: string;
    price_adjustment: number;
  }[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveModifiers(supabase: any, menuItemId: string, modifiers: ModifierInput[]) {
  for (let i = 0; i < modifiers.length; i++) {
    const mod = modifiers[i];
    const { data: modifier } = await supabase
      .from("modifiers")
      .insert({
        menu_item_id: menuItemId,
        name_en: mod.name_en,
        name_fr: mod.name_fr,
        sort_order: i,
      })
      .select("id")
      .single();

    if (modifier && mod.options.length > 0) {
      await supabase.from("modifier_options").insert(
        mod.options.map((opt, j) => ({
          modifier_id: modifier.id,
          name_en: opt.name_en,
          name_fr: opt.name_fr,
          price_adjustment: opt.price_adjustment,
          sort_order: j,
        }))
      );
    }
  }
}
