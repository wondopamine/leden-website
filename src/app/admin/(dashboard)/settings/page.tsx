import { requireStaff } from "@/lib/supabase/admin.server";
import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { AdminPageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage Café Le Den hours, contact details, and order timing.",
};

export default async function SettingsPage() {
  const { supabase } = await requireStaff();
  const { data: cafeInfo } = await supabase
    .from("cafe_info")
    .select("*")
    .limit(1)
    .single();

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Settings"
        subtitle="Manage café information and hours"
      />
      <SettingsForm initialData={cafeInfo} />
    </div>
  );
}
