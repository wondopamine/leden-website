// src/app/dev/admin/page.tsx
//
// Dev-only, auth-free, Supabase-free preview of the redesigned admin (product
// register). Mirrors the guard pattern in src/app/dev/components/page.tsx: this is
// a SERVER component and the NODE_ENV check sits at the top of the default export,
// so notFound() short-circuits before any HTML ships outside `next dev`.
//
// Every piece is composed from the REAL admin components with inline sample data in
// the admin/Supabase row shapes (derived from each component's prop types). Client
// components that touch Supabase degrade gracefully on interaction: OrdersDashboard
// guards its realtime subscribe/createClient in try/catch; OrderCard and MenuItemRow
// only reach their server actions on interaction. Form saves use local delayed actions.
//
// Analytics includes both a static chart preview and the real dashboard wired to a
// deterministic fail-once loader for recovery testing. Neither contacts Supabase.

import { notFound } from "next/navigation";
import Link from "next/link";
import type * as React from "react";

import { AdminSidebar } from "@/components/admin/sidebar";
import { StatStrip } from "@/components/admin/stat-strip";
import { OrdersDashboard } from "@/components/admin/orders-dashboard";
import { OrderCard, type Order } from "@/components/admin/order-card";
import { MenuItemRow } from "@/components/admin/menu-item-row";
import { CategoriesManager } from "@/components/admin/categories-manager";
import {
  ORDER_STATUS,
  ORDER_STATUS_SEQUENCE,
  MENU_STATUS,
  type MenuStatus,
} from "@/components/admin/status";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { AnalyticsPreview } from "./analytics-preview";
import { AnalyticsErrorPreview } from "./analytics-error-preview";
import { OrdersFilterPreview } from "./orders-filter-preview";
import {
  MenuItemSaveRacePreview,
  SettingsSaveRacePreview,
} from "./form-race-previews";

// created_at stamps are computed once at render so the KDS "Xm ago" labels read
// naturally in a screenshot.
const now = Date.now();
const minsAgo = (n: number) => new Date(now - n * 60_000).toISOString();
const atTime = (h: number, m: number) => {
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

// --- Sample orders (admin `orders` row shape from order-card.tsx) ------------
const sampleOrders: Order[] = [
  {
    id: "o-101",
    order_number: "A-101",
    customer_name: "Priya Anand",
    customer_phone: "514 555 0132",
    pickup_time: null,
    status: "new",
    subtotal: 12.5,
    tax_gst: 0.63,
    tax_qst: 1.25,
    total: 14.38,
    created_at: minsAgo(2),
    order_items: [
      {
        id: "i-1",
        menu_item_name: "Flat White",
        price: 5.0,
        quantity: 1,
        modifiers: [{ name: "Milk", option: "Oat", priceAdjustment: 0.75 }],
      },
      {
        id: "i-2",
        menu_item_name: "Almond Croissant",
        price: 5.0,
        quantity: 1,
        modifiers: [],
      },
    ],
  },
  {
    id: "o-102",
    order_number: "A-102",
    customer_name: "Marc Tremblay",
    customer_phone: "438 555 0198",
    pickup_time: atTime(9, 45),
    status: "new",
    subtotal: 9.0,
    tax_gst: 0.45,
    tax_qst: 0.9,
    total: 10.35,
    created_at: minsAgo(6),
    order_items: [
      {
        id: "i-3",
        menu_item_name: "Cold Brew",
        price: 5.5,
        quantity: 1,
        modifiers: [],
      },
      {
        id: "i-4",
        menu_item_name: "Banana Bread",
        price: 3.5,
        quantity: 1,
        modifiers: [],
      },
    ],
  },
  {
    id: "o-103",
    order_number: "A-103",
    customer_name: "Sofia Rossi",
    customer_phone: "514 555 0155",
    pickup_time: atTime(9, 30),
    status: "preparing",
    subtotal: 18.0,
    tax_gst: 0.9,
    tax_qst: 1.8,
    total: 20.7,
    created_at: minsAgo(12),
    order_items: [
      {
        id: "i-5",
        menu_item_name: "Avocado Toast",
        price: 12.0,
        quantity: 1,
        modifiers: [
          { name: "Add", option: "Poached egg", priceAdjustment: 2.0 },
        ],
      },
      {
        id: "i-6",
        menu_item_name: "Matcha Latte",
        price: 6.0,
        quantity: 1,
        modifiers: [],
      },
    ],
  },
  {
    id: "o-104",
    order_number: "A-104",
    customer_name: "David Chen",
    customer_phone: "579 555 0110",
    pickup_time: atTime(9, 20),
    status: "ready",
    subtotal: 11.0,
    tax_gst: 0.55,
    tax_qst: 1.1,
    total: 12.65,
    created_at: minsAgo(18),
    order_items: [
      {
        id: "i-7",
        menu_item_name: "Cappuccino",
        price: 5.0,
        quantity: 2,
        modifiers: [],
      },
    ],
  },
  {
    id: "o-105",
    order_number: "A-105",
    customer_name: "Amelia Wright",
    customer_phone: "514 555 0177",
    pickup_time: atTime(8, 50),
    status: "picked_up",
    subtotal: 7.5,
    tax_gst: 0.38,
    tax_qst: 0.75,
    total: 8.63,
    created_at: minsAgo(64),
    order_items: [
      {
        id: "i-8",
        menu_item_name: "Espresso",
        price: 3.5,
        quantity: 1,
        modifiers: [],
      },
      {
        id: "i-9",
        menu_item_name: "Pain au Chocolat",
        price: 4.0,
        quantity: 1,
        modifiers: [],
      },
    ],
  },
  {
    id: "o-106",
    order_number: "A-106",
    customer_name: "Liam Murphy",
    customer_phone: "438 555 0143",
    pickup_time: null,
    status: "cancelled",
    subtotal: 6.0,
    tax_gst: 0.3,
    tax_qst: 0.6,
    total: 6.9,
    created_at: minsAgo(80),
    order_items: [
      {
        id: "i-10",
        menu_item_name: "Iced Latte",
        price: 6.0,
        quantity: 1,
        modifiers: [],
      },
    ],
  },
];

const firstByStatus = (status: Order["status"]) =>
  sampleOrders.find((o) => o.status === status)!;

// --- Sample menu items (row shape MenuItemRow expects) -----------------------
type MenuRowItem = React.ComponentProps<typeof MenuItemRow>["item"];

const sampleMenuItems: (MenuRowItem & { status: MenuStatus })[] = [
  {
    id: "m-1",
    name_en: "Flat White",
    name_fr: "Flat white",
    price: 5.0,
    available: true,
    status: "available",
    image_url: null,
    category: { id: "c-1", name_en: "Coffee" },
  },
  {
    id: "m-2",
    name_en: "Almond Croissant",
    name_fr: "Croissant aux amandes",
    price: 5.0,
    available: false,
    status: "sold_out",
    image_url: null,
    category: { id: "c-2", name_en: "Pastries" },
  },
  {
    id: "m-3",
    name_en: "Seasonal Pumpkin Loaf",
    name_fr: "Pain a la citrouille",
    price: 4.5,
    available: false,
    status: "hidden",
    image_url: null,
    category: { id: "c-2", name_en: "Pastries" },
  },
];

const sampleCategories = [
  {
    id: "c-1",
    name_en: "Coffee",
    name_fr: "Café",
    slug: "coffee",
    sort_order: 1,
  },
  {
    id: "c-2",
    name_en: "Pastries",
    name_fr: "Pâtisseries",
    slug: "pastries",
    sort_order: 2,
  },
];

// --- Sample cafe_info (SettingsForm initialData shape) -----------------------
const sampleCafeInfo = {
  id: "cafe-1",
  hours: [
    { day: "Monday", open: "07:00", close: "17:00", closed: false },
    { day: "Tuesday", open: "07:00", close: "17:00", closed: false },
    { day: "Wednesday", open: "07:00", close: "17:00", closed: false },
    { day: "Thursday", open: "07:00", close: "18:00", closed: false },
    { day: "Friday", open: "07:00", close: "18:00", closed: false },
    { day: "Saturday", open: "08:00", close: "16:00", closed: false },
    { day: "Sunday", open: "", close: "", closed: true },
  ],
  address: "123 Rue Sainte-Catherine, Montreal, QC",
  phone: "514 555 0100",
  announcement_en: "Fresh seasonal pastries in every morning.",
  announcement_fr: "Patisseries de saison fraiches chaque matin.",
  pickup_lead_time: 15,
  max_advance_order_days: 3,
};

// Dashboard stat strip tiles, matching (dashboard)/page.tsx.
const statTiles = [
  { label: "Orders", value: String(sampleOrders.length) },
  {
    label: "Revenue",
    value: `$${sampleOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + o.total, 0)
      .toFixed(2)}`,
  },
  {
    label: "Active",
    value: String(
      sampleOrders.filter((o) =>
        ["new", "preparing", "ready"].includes(o.status)
      ).length
    ),
  },
  {
    label: "Ready",
    value: String(sampleOrders.filter((o) => o.status === "ready").length),
  },
  {
    label: "Done",
    value: String(sampleOrders.filter((o) => o.status === "picked_up").length),
  },
];

const headClass = "text-xs font-semibold text-muted-foreground";

export default function DevAdminPreviewPage() {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.PLAYWRIGHT_ADMIN_PREVIEW !== "1"
  ) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background lg:flex">
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden pt-14 lg:pt-0">
        <div className="space-y-10 p-6">
          <header className="border-b border-border pb-6">
            <h1 className="font-sans text-xl font-semibold tracking-tight text-foreground">
              Admin redesign preview
            </h1>
            <p className="mt-2 text-caption text-muted-foreground">
              Dev-only, auth-free and Supabase-free. Every block below is a real
              admin component rendered with inline sample data so the redesign can
              be screenshot-verified without env or credentials. The sidebar is
              docked at the left (desktop) or behind the top toggle (mobile).
            </p>
          </header>

          <Section
            title="Dashboard stat strip"
            note="StatStrip — compact bordered row of slim tiles, tabular-nums values."
          >
            <StatStrip tiles={statTiles} />
          </Section>

          <Section
            title="KDS board (OrdersDashboard)"
            note="Live board: New / Preparing / Ready columns plus a quiet terminal strip. Realtime subscribe is guarded, so it renders fine without Supabase env."
          >
            <OrdersDashboard initialOrders={sampleOrders} />
          </Section>

          <Section
            title="Order cards - one per status"
            note="OrderCard across all five statuses. Badges and dots come from ORDER_STATUS; the advance-status button and cancel dropdown are live but only reach their server action when used."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ORDER_STATUS_SEQUENCE.map((status) => (
                <div key={status} className="space-y-2">
                  <p className="text-label font-semibold text-muted-foreground">
                    {ORDER_STATUS[status].label}
                  </p>
                  <OrderCard order={firstByStatus(status)} />
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="Menu item rows - one per status"
            note="MenuItemRow for available / sold out / hidden. The status control is @/components/ui/select tinted with MENU_STATUS[...].badge."
          >
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {sampleMenuItems.map((item) => (
                <MenuItemRow key={item.id} item={item} />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(MENU_STATUS) as MenuStatus[]).map((s) => (
                <Badge key={s} variant="outline" className={MENU_STATUS[s].badge}>
                  {MENU_STATUS[s].label}
                </Badge>
              ))}
            </div>
          </Section>

          <Section
            title="Orders table"
            note="Dense scanning table (Order / Customer / Items / Total / Status / Time) mirroring /admin/orders. Rows link to detail; status uses ORDER_STATUS badges."
          >
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <Table containerClassName="max-h-96">
                <TableHeader sticky>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={headClass}>Order</TableHead>
                    <TableHead className={headClass}>Customer</TableHead>
                    <TableHead className={`${headClass} text-right`}>
                      Items
                    </TableHead>
                    <TableHead className={`${headClass} text-right`}>
                      Total
                    </TableHead>
                    <TableHead className={headClass}>Status</TableHead>
                    <TableHead className={`${headClass} text-right`}>
                      Time
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleOrders.map((order) => {
                    const itemCount = order.order_items.reduce(
                      (sum, i) => sum + i.quantity,
                      0
                    );
                    const created = new Date(order.created_at);
                    const meta = ORDER_STATUS[order.status];
                    return (
                      <TableRow key={order.id} className="relative">
                        <TableCell className="py-2.5">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="rounded-sm font-medium text-foreground after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {order.order_number}
                          </Link>
                        </TableCell>
                        <TableCell className="py-2.5 text-foreground">
                          {order.customer_name}
                        </TableCell>
                        <TableCell className="py-2.5 text-right tabular-nums text-muted-foreground">
                          {itemCount}
                        </TableCell>
                        <TableCell className="py-2.5 text-right font-medium tabular-nums">
                          ${Number(order.total).toFixed(2)}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <Badge variant="outline" className={meta.badge}>
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2.5 text-right tabular-nums text-muted-foreground">
                          {created.toLocaleTimeString("en-CA", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Section>

          <Section
            title="Orders filter behavior"
            note="OrdersFilter with a local navigation adapter for deterministic debounce and overlapping-filter verification. No route or network mutation."
          >
            <OrdersFilterPreview />
          </Section>

          <Section
            title="Category editor"
            note="CategoriesManager with safe local drafts. This preview verifies explicit discard and navigation protection without calling a server action."
          >
            <CategoriesManager initialCategories={sampleCategories} />
          </Section>

          <Section
            title="Analytics chart area"
            note="Static preview: the same recharts JSX + token props (var(--chart-1/2), var(--border), var(--muted-foreground), popover tooltip) rendered against sample data."
          >
            <AnalyticsPreview />
          </Section>

          <Section
            title="Analytics recovery state"
            note="The production analysis error surface remains distinct from a valid empty period and keeps an explicit retry action."
          >
            <AnalyticsErrorPreview />
          </Section>

          <Section
            title="Settings form"
            note="SettingsForm with an inline cafe_info sample and a local delayed save action for pending-edit verification. No server action is called."
          >
            <SettingsSaveRacePreview initialData={sampleCafeInfo} />
          </Section>

          <Section
            title="Menu item form save race"
            note="MenuItemForm with a local delayed edit action for proving newer pending edits remain guarded. No server action is called."
          >
            <MenuItemSaveRacePreview />
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-sans text-sm font-semibold text-foreground">
          {title}
        </h2>
        {note ? (
          <p className="text-caption text-muted-foreground">{note}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
