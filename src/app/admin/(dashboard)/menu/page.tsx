import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MenuItemRow } from "@/components/admin/menu-item-row";

export default async function MenuPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("menu_items").select("*, category:categories(id, name_en, slug)").order("sort_order").order("name_en"),
  ]);

  const allCategories = categories ?? [];
  const allItems = items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Menu</h1>
          <p className="text-sm text-stone-500">
            Manage your menu items
          </p>
        </div>
        <Button variant="default" size="default" nativeButton={false} render={<Link href="/admin/menu/new" />}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      {allCategories.map((cat) => {
        const catItems = allItems.filter(
          (item) => item.category?.id === cat.id
        );
        if (catItems.length === 0) return null;

        return (
          <div key={cat.id}>
            <h2 className="text-sm font-semibold text-stone-500 mb-2">
              {cat.name_en}
            </h2>
            <div className="space-y-2">
              {catItems.map((item) => (
                <MenuItemRow key={item.id} item={item} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
