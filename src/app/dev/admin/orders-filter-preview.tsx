"use client";

import { useCallback, useMemo, useState } from "react";
import { OrdersFilter } from "@/components/admin/orders-filter";

type FilterState = {
  date: string;
  status: string;
  search: string;
};

type NavigationRecord = {
  href: string;
  method: "push" | "replace";
};

export function OrdersFilterPreview() {
  const [filters, setFilters] = useState<FilterState>({
    date: "2026-08-17",
    status: "new",
    search: "",
  });
  const [navigationRecords, setNavigationRecords] = useState<
    NavigationRecord[]
  >([]);

  const recordNavigation = useCallback(
    (method: NavigationRecord["method"], href: string) => {
      const url = new URL(href, window.location.origin);
      setFilters({
        date: url.searchParams.get("date") ?? "",
        status: url.searchParams.get("status") ?? "all",
        search: url.searchParams.get("q") ?? "",
      });
      setNavigationRecords((records) => [...records, { href, method }]);
    },
    [],
  );

  const navigationAdapter = useMemo(
    () => ({
      push: (href: string) => recordNavigation("push", href),
      replace: (href: string) => recordNavigation("replace", href),
    }),
    [recordNavigation],
  );

  const latestNavigation = navigationRecords.at(-1) ?? null;
  const markHydrated = useCallback((node: HTMLDivElement | null) => {
    node?.setAttribute("data-preview-hydrated", "true");
  }, []);

  return (
    <div ref={markHydrated} className="space-y-3">
      <OrdersFilter
        currentDate={filters.date}
        currentStatus={filters.status}
        currentSearch={filters.search}
        navigationAdapter={navigationAdapter}
      />
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-caption">
        <p>
          Navigation count: {" "}
          <output data-testid="orders-filter-navigation-count">
            {navigationRecords.length}
          </output>
        </p>
        <output
          data-testid="orders-filter-navigation"
          className="mt-1 block break-all font-mono"
        >
          {latestNavigation ? JSON.stringify(latestNavigation) : "No navigation"}
        </output>
      </div>
    </div>
  );
}
