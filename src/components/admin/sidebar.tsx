"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  FolderOpen,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/admin/categories", label: "Categories", icon: FolderOpen },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const navItemFocus =
  "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/admin/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  function Navigation() {
    return (
      <nav aria-label="Admin navigation" className="flex min-h-0 flex-1 flex-col">
        <ul className="flex-1 space-y-1 overflow-y-auto p-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:min-h-9",
                    navItemFocus,
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon aria-hidden="true" className="size-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            size="default"
            onClick={handleSignOut}
            disabled={isSigningOut}
            aria-busy={isSigningOut}
            className="w-full justify-start text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut aria-hidden="true" className="size-4" />
            {isSigningOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </nav>
    );
  }

  const brand = (
    <div className="border-b border-sidebar-border p-4">
      <span className="block font-display text-lg font-semibold leading-none text-sidebar-foreground">
        Café Le Den
      </span>
      <span className="mt-1.5 block text-label text-muted-foreground">
        Admin workspace
      </span>
    </div>
  );

  return (
    <>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-sidebar-border bg-sidebar px-3 lg:hidden">
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Open admin navigation" />
            }
          >
            <Menu aria-hidden="true" className="size-5" />
          </SheetTrigger>
          <span className="font-display text-base font-semibold text-sidebar-foreground">
            Café Le Den
          </span>
          <span className="text-label text-muted-foreground">Admin</span>
        </div>
        <SheetContent
          side="left"
          className="w-[min(18rem,calc(100vw-2rem))] gap-0 bg-sidebar text-sidebar-foreground"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Admin navigation</SheetTitle>
            <SheetDescription>Move between café operations pages.</SheetDescription>
          </SheetHeader>
          {brand}
          <Navigation />
        </SheetContent>
      </Sheet>

      <aside className="hidden bg-sidebar text-sidebar-foreground lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-sidebar-border">
        {brand}
        <Navigation />
      </aside>
    </>
  );
}
