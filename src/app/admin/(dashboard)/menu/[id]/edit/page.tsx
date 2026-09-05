import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateMenuItem } from "../../actions";
import { MenuItemForm } from "@/components/admin/menu-item-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await params;
  return {
    title: "Edit menu item",
    description: "Update a Café Le Den menu item, photo, and modifiers.",
  };
}

export default async function EditMenuItemPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: item }, { data: categories }] = await Promise.all([
    supabase
      .from("menu_items")
      .select(
        `*, modifiers(*, options:modifier_options(*))`
      )
      .eq("id", id)
      .single(),
    supabase.from("categories").select("id, name_en").order("sort_order"),
  ]);

  if (!item) notFound();

  const initialData = {
    id: item.id,
    name_en: item.name_en,
    name_fr: item.name_fr,
    description_en: item.description_en,
    description_fr: item.description_fr,
    price: Number(item.price),
    category_id: item.category_id,
    available: item.available,
    status: item.status as "available" | "sold_out" | "hidden",
    image_url: item.image_url as string | null,
    modifiers: (item.modifiers ?? [])
      .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
      .map((mod: { name_en: string; name_fr: string; min_selections: number; max_selections: number; options: { name_en: string; name_fr: string; price_adjustment: number; sort_order: number; available: boolean }[] }) => ({
        name_en: mod.name_en,
        name_fr: mod.name_fr,
        min_selections: mod.min_selections === 0 ? 0 as const : 1 as const,
        max_selections: 1 as const,
        options: (mod.options ?? [])
          .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
          .map((opt: { name_en: string; name_fr: string; price_adjustment: number; available: boolean }) => ({
            name_en: opt.name_en,
            name_fr: opt.name_fr,
            price_adjustment: Number(opt.price_adjustment),
            available: opt.available,
          })),
      })),
  };

  return (
    <div className="space-y-4">
      <Link
        href="/admin/menu"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "-ml-2.5 text-muted-foreground",
        })}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to menu
      </Link>
      <AdminPageHeader title="Edit menu item" subtitle={item.name_en} />
      <MenuItemForm
        categories={categories ?? []}
        initialData={initialData}
        action={updateMenuItem}
        submitLabel="Save changes"
      />
    </div>
  );
}
