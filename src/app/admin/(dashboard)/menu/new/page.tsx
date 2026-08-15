import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { createMenuItem } from "../actions";
import { MenuItemForm } from "@/components/admin/menu-item-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "New menu item",
  description: "Add a new item to the Café Le Den menu.",
};

export default async function NewMenuItemPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name_en")
    .order("sort_order");

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link href="/admin/menu" />}
        className="-ml-2.5 text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to menu
      </Button>
      <AdminPageHeader title="New menu item" />
      <MenuItemForm
        categories={categories ?? []}
        action={createMenuItem}
        submitLabel="Create item"
      />
    </div>
  );
}
