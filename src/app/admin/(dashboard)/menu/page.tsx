import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { MenuItemRow } from "@/components/admin/menu-item-row";

export const metadata: Metadata = {
  title: "Menu",
  description: "Manage Café Le Den menu items and availability.",
};

export default async function MenuPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("menu_items").select("*, category:categories(id, name_en, slug)").order("sort_order").order("name_en"),
  ]);

  const allCategories = categories ?? [];
  const allItems = items ?? [];

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Menu" subtitle="Manage your menu items">
        <Button variant="default" size="default" nativeButton={false} render={<Link href="/admin/menu/new" />}>
          <Plus className="h-4 w-4" />
          Add item
        </Button>
      </AdminPageHeader>

      <div className="space-y-4">
        {allCategories.map((cat) => {
          const catItems = allItems.filter(
            (item) => item.category?.id === cat.id
          );
          if (catItems.length === 0) return null;

          return (
            <section key={cat.id} className="space-y-2">
              <h2 className="font-sans text-sm font-semibold text-foreground">
                {cat.name_en}
              </h2>
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                {catItems.map((item) => (
                  <MenuItemRow key={item.id} item={item} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
