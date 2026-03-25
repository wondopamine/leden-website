import { createClient } from "@/lib/supabase/server";
import { CategoriesManager } from "@/components/admin/categories-manager";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Categories</h1>
        <p className="text-sm text-stone-500">
          Manage menu categories
        </p>
      </div>
      <CategoriesManager initialCategories={categories ?? []} />
    </div>
  );
}
