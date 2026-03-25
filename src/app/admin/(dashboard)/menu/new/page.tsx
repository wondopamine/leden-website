import { createClient } from "@/lib/supabase/server";
import { createMenuItem } from "../actions";
import { MenuItemForm } from "@/components/admin/menu-item-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function NewMenuItemPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name_en")
    .order("sort_order");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href="/admin/menu" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-stone-900">New Menu Item</h1>
      </div>
      <MenuItemForm
        categories={categories ?? []}
        action={createMenuItem}
        submitLabel="Create Item"
      />
    </div>
  );
}
