"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
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
  { value: "picked_up", label: "Picked Up" },
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
    <div className="flex flex-col sm:flex-row gap-4">
      <Input
        type="date"
        value={currentDate}
        onChange={(e) => updateParams("date", e.target.value)}
        className="w-auto"
      />
      <Input
        type="search"
        placeholder="Search order # or name..."
        defaultValue={currentSearch}
        onChange={(e) => {
          // Debounce-ish: update on Enter or after typing stops
          const value = e.target.value;
          if (value === "" || value.length >= 2) {
            updateParams("q", value);
          }
        }}
        className="max-w-xs"
      />
      <Tabs
        value={currentStatus}
        onValueChange={(v) => updateParams("status", v)}
      >
        <TabsList className="flex-wrap">
          {statuses.map((s) => (
            <TabsTrigger key={s.value} value={s.value} className="text-xs">
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
