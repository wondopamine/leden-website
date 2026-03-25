import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/admin/settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: cafeInfo } = await supabase
    .from("cafe_info")
    .select("*")
    .limit(1)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Settings</h1>
        <p className="text-sm text-stone-500">
          Manage cafe information and hours
        </p>
      </div>
      <SettingsForm initialData={cafeInfo} />
    </div>
  );
}
