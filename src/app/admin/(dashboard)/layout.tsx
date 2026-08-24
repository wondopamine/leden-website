import { requireAdminPage } from "@/lib/supabase/auth";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();

  return (
    <div className="flex min-h-screen bg-background lg:h-screen">
      <AdminSidebar />
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto pt-14 lg:pt-0">
        <div className="mx-auto w-full max-w-[var(--max-content-width,80rem)] p-4 sm:p-6">
          {children}
        </div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}
