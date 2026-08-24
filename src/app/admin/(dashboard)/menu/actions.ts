"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createMenuItemGraphWithClient,
  saveMenuItemGraphWithClient,
  type AdminMenuItemGraph,
  type AdminMenuModifierGraph,
} from "@/lib/orders/admin.server";
import { requireStaff } from "@/lib/supabase/admin.server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MONEY_PATTERN = /^\d+(?:\.\d{1,2})?$/;

function menuSaveError(): Error {
  return new Error(
    "Menu item was not saved. Review the fields and try again.",
  );
}

function requiredText(formData: FormData, name: string, maxLength: number) {
  const value = formData.get(name);
  if (typeof value !== "string") throw menuSaveError();
  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > maxLength) {
    throw menuSaveError();
  }
  return normalized;
}

function optionalText(formData: FormData, name: string, maxLength: number) {
  const value = formData.get(name);
  if (typeof value !== "string" || value.length > maxLength) {
    throw menuSaveError();
  }
  return value.trim();
}

function money(value: unknown): string {
  const serialized =
    typeof value === "number" && Number.isFinite(value) ? String(value) : value;
  if (
    typeof serialized !== "string" ||
    !MONEY_PATTERN.test(serialized) ||
    Number(serialized) < 0 ||
    Number(serialized) > 10_000
  ) {
    throw menuSaveError();
  }
  return serialized;
}

function parseModifiers(value: FormDataEntryValue | null): AdminMenuModifierGraph[] {
  if (typeof value !== "string" || value.length > 100_000) {
    throw menuSaveError();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value || "[]");
  } catch {
    throw menuSaveError();
  }
  if (!Array.isArray(parsed) || parsed.length > 20) throw menuSaveError();
  return parsed.map((group): AdminMenuModifierGraph => {
    if (
      typeof group !== "object" ||
      group === null ||
      Array.isArray(group)
    ) {
      throw menuSaveError();
    }
    const record = group as Record<string, unknown>;
    if (
      typeof record.name_en !== "string" ||
      record.name_en.trim().length < 1 ||
      record.name_en.trim().length > 100 ||
      typeof record.name_fr !== "string" ||
      record.name_fr.trim().length < 1 ||
      record.name_fr.trim().length > 100 ||
      !Array.isArray(record.options) ||
      record.options.length < 1 ||
      record.options.length > 20 ||
      (record.min_selections !== undefined &&
        record.min_selections !== 0 &&
        record.min_selections !== 1) ||
      (record.max_selections !== undefined && record.max_selections !== 1)
    ) {
      throw menuSaveError();
    }
    return {
      name_en: record.name_en.trim(),
      name_fr: record.name_fr.trim(),
      min_selections: record.min_selections === 0 ? 0 : 1,
      max_selections: 1,
      options: record.options.map((option) => {
        if (
          typeof option !== "object" ||
          option === null ||
          Array.isArray(option)
        ) {
          throw menuSaveError();
        }
        const choice = option as Record<string, unknown>;
        if (
          typeof choice.name_en !== "string" ||
          choice.name_en.trim().length < 1 ||
          choice.name_en.trim().length > 100 ||
          typeof choice.name_fr !== "string" ||
          choice.name_fr.trim().length < 1 ||
          choice.name_fr.trim().length > 100
        ) {
          throw menuSaveError();
        }
        return {
          name_en: choice.name_en.trim(),
          name_fr: choice.name_fr.trim(),
          price_adjustment: money(choice.price_adjustment),
          available: choice.available !== false,
        };
      }),
    };
  });
}

function parseMenuGraph(formData: FormData) {
  const categoryId = requiredText(formData, "category_id", 36);
  if (!UUID_PATTERN.test(categoryId)) throw menuSaveError();
  const imageUrl = optionalText(formData, "image_url", 2_048) || null;
  const status = formData.get("status");
  if (status !== "available" && status !== "sold_out" && status !== "hidden") {
    throw menuSaveError();
  }
  const item: AdminMenuItemGraph = {
    category_id: categoryId,
    name_en: requiredText(formData, "name_en", 100),
    name_fr: requiredText(formData, "name_fr", 100),
    description_en: optionalText(formData, "description_en", 2_000),
    description_fr: optionalText(formData, "description_fr", 2_000),
    price: money(formData.get("price")),
    status,
    image_url: imageUrl,
  };
  return {
    item,
    modifiers: parseModifiers(formData.get("modifiers_json")),
  };
}

function revalidateMenu() {
  revalidatePath("/admin/menu");
  revalidatePath("/");
  revalidatePath("/en/order");
  revalidatePath("/fr/order");
}

export async function createMenuItem(formData: FormData) {
  const { supabase } = await requireStaff();
  const graph = parseMenuGraph(formData);
  const id = randomUUID();
  try {
    await createMenuItemGraphWithClient(
      supabase,
      id,
      graph.item,
      graph.modifiers,
    );
  } catch {
    throw menuSaveError();
  }

  revalidateMenu();
  redirect("/admin/menu");
}

export async function updateMenuItem(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = requiredText(formData, "id", 36);
  if (!UUID_PATTERN.test(id)) throw menuSaveError();
  const graph = parseMenuGraph(formData);
  try {
    await saveMenuItemGraphWithClient(
      supabase,
      id,
      graph.item,
      graph.modifiers,
    );
  } catch {
    throw menuSaveError();
  }
  revalidateMenu();
}

export async function deleteMenuItem(id: string) {
  const { supabase } = await requireStaff();
  if (!UUID_PATTERN.test(id)) throw menuSaveError();
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) throw menuSaveError();
  revalidateMenu();
}

export async function updateMenuItemStatus(
  id: string,
  status: "available" | "sold_out" | "hidden",
) {
  const { supabase } = await requireStaff();
  if (
    !UUID_PATTERN.test(id) ||
    !["available", "sold_out", "hidden"].includes(status)
  ) {
    throw menuSaveError();
  }
  const { error } = await supabase
    .from("menu_items")
    .update({ status, available: status !== "hidden" })
    .eq("id", id);
  if (error) throw menuSaveError();
  revalidateMenu();
}
