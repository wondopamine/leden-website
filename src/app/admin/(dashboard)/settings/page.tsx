import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/admin/settings-form";
import { AdminPageHeader } from "@/components/admin/page-header";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: cafeInfo } = await supabase
    .from("cafe_info")
    .select("*")
    .limit(1)
    .single();

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Settings"
        subtitle="Manage cafe information and hours"
      />
      <SettingsForm initialData={cafeInfo} />
    </div>
  );
}
