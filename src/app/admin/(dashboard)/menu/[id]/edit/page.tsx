import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { updateMenuItem } from "../../actions";
import { MenuItemForm } from "@/components/admin/menu-item-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ id: string }>;
};

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
    modifiers: (item.modifiers ?? [])
      .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
      .map((mod: { name_en: string; name_fr: string; options: { name_en: string; name_fr: string; price_adjustment: number; sort_order: number }[] }) => ({
        name_en: mod.name_en,
        name_fr: mod.name_fr,
        options: (mod.options ?? [])
          .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
          .map((opt: { name_en: string; name_fr: string; price_adjustment: number }) => ({
            name_en: opt.name_en,
            name_fr: opt.name_fr,
            price_adjustment: Number(opt.price_adjustment),
          })),
      })),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href="/admin/menu" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-stone-900">
          Edit: {item.name_en}
        </h1>
      </div>
      <MenuItemForm
        categories={categories ?? []}
        initialData={initialData}
        action={updateMenuItem}
        submitLabel="Save Changes"
      />
    </div>
  );
}
