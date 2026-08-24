import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { CategoriesManager } from "@/components/admin/categories-manager";
import { AdminPageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = {
  title: "Categories",
  description: "Organise the categories used in the Café Le Den menu.",
};

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Categories" subtitle="Manage menu categories" />
      <CategoriesManager initialCategories={categories ?? []} />
    </div>
  );
}
