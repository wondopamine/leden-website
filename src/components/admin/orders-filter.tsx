"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  currentDate: string;
  currentStatus: string;
  currentSearch: string;
};

const statuses = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "picked_up", label: "Picked up" },
  { value: "cancelled", label: "Cancelled" },
];

export function OrdersFilter({ currentDate, currentStatus, currentSearch }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all" && value !== "") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/admin/orders?${params.toString()}`);
  }

  return (
    <div className="grid gap-3 rounded-xl border border-border bg-card p-3 lg:grid-cols-[auto_minmax(12rem,1fr)_auto] lg:items-end">
      <div className="space-y-1.5">
        <Label htmlFor="orders-date">Date</Label>
        <Input
          id="orders-date"
          type="date"
          value={currentDate}
          onChange={(e) => updateParams("date", e.target.value)}
          className="w-full lg:w-auto"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="orders-search">Search orders</Label>
        <Input
          id="orders-search"
          type="search"
          placeholder="Order number or customer name"
          defaultValue={currentSearch}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "" || value.length >= 2) {
              updateParams("q", value);
            }
          }}
          className="w-full"
        />
      </div>
      <div className="min-w-0 space-y-1.5">
        <span className="block text-sm font-medium text-foreground">Status</span>
        <Tabs
          value={currentStatus}
          onValueChange={(value) => updateParams("status", value)}
          className="w-full lg:w-auto"
        >
          <TabsList
            aria-label="Filter orders by status"
            className="grid w-full grid-cols-2 lg:flex lg:w-fit"
          >
            {statuses.map((statusItem) => (
              <TabsTrigger
                key={statusItem.value}
                value={statusItem.value}
                className="text-xs"
              >
                {statusItem.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
