"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type CategoryInput = {
  id?: string;
  name_en: string;
  name_fr: string;
  slug: string;
  sort_order: number;
};

function friendlyError(msg: string): string {
  if (msg.includes("unique") || msg.includes("duplicate")) return "A category with this slug already exists.";
  if (msg.includes("foreign key") || msg.includes("referenced")) return "Cannot delete this category because it has menu items. Move or delete them first.";
  return "Something went wrong. Please try again.";
}

export async function saveCategory(input: CategoryInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (input.id) {
    const { error } = await supabase
      .from("categories")
      .update({
        name_en: input.name_en,
        name_fr: input.name_fr,
        slug: input.slug,
        sort_order: input.sort_order,
      })
      .eq("id", input.id);

    if (error) throw new Error(friendlyError(error.message));
  } else {
    const { error } = await supabase.from("categories").insert({
      name_en: input.name_en,
      name_fr: input.name_fr,
      slug: input.slug,
      sort_order: input.sort_order,
    });

    if (error) throw new Error(friendlyError(error.message));
  }

  revalidatePath("/admin/categories");
  revalidatePath("/admin/menu");
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(friendlyError(error.message));

  revalidatePath("/admin/categories");
  revalidatePath("/admin/menu");
}
