import { requireAuth } from "@/lib/supabase/auth";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return (
    <div className="flex h-screen bg-stone-50">
      <AdminSidebar />
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        <div className="p-6">{children}</div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}
