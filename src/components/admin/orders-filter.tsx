"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  currentDate: string;
  currentStatus: string;
  currentSearch: string;
  navigationAdapter?: {
    push: (href: string) => void;
    replace: (href: string) => void;
  };
};

type FilterState = {
  date: string;
  status: string;
  search: string;
};

const statuses = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "picked_up", label: "Picked up" },
  { value: "cancelled", label: "Cancelled" },
];

export function OrdersFilter({
  currentDate,
  currentStatus,
  currentSearch,
  navigationAdapter,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(currentSearch);
  const searchValueRef = useRef(currentSearch);
  const lastRequestedSearchRef = useRef(currentSearch);
  const latestFiltersRef = useRef<FilterState>({
    date: currentDate,
    status: currentStatus,
    search: currentSearch,
  });

  const navigate = useCallback(
    (filters: FilterState, method: "push" | "replace") => {
      const params = new URLSearchParams();
      if (filters.date) params.set("date", filters.date);
      if (filters.search) params.set("q", filters.search);
      if (filters.status && filters.status !== "all") {
        params.set("status", filters.status);
      }
      const query = params.toString();
      const href = `/admin/orders${query ? `?${query}` : ""}`;
      startTransition(() => {
        if (navigationAdapter) {
          navigationAdapter[method](href);
        } else {
          router[method](href);
        }
      });
    },
    [navigationAdapter, router],
  );

  useEffect(() => {
    latestFiltersRef.current = {
      ...latestFiltersRef.current,
      date: currentDate,
      status: currentStatus,
    };
  }, [currentDate, currentStatus]);

  useEffect(() => {
    if (
      currentSearch === lastRequestedSearchRef.current &&
      searchValueRef.current !== currentSearch
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (
        currentSearch === lastRequestedSearchRef.current &&
        searchValueRef.current !== currentSearch
      ) {
        return;
      }
      searchValueRef.current = currentSearch;
      latestFiltersRef.current = {
        ...latestFiltersRef.current,
        search: currentSearch,
      };
      setSearchValue(currentSearch);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [currentSearch]);

  useEffect(() => {
    if (
      (searchValue !== "" && searchValue.length < 2) ||
      searchValue === lastRequestedSearchRef.current
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const filters = {
        ...latestFiltersRef.current,
        search: searchValue,
      };
      latestFiltersRef.current = filters;
      lastRequestedSearchRef.current = searchValue;
      navigate(filters, "replace");
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [navigate, searchValue]);

  function updateFilters(patch: Partial<FilterState>) {
    const filters = { ...latestFiltersRef.current, ...patch };
    latestFiltersRef.current = filters;
    lastRequestedSearchRef.current = filters.search;
    navigate(filters, "push");
  }

  return (
    <div
      aria-busy={isPending}
      className="grid gap-3 rounded-xl border border-border bg-card p-3 lg:grid-cols-[auto_minmax(12rem,1fr)_auto] lg:items-end"
    >
      <p className="sr-only" role="status" aria-live="polite">
        {isPending ? "Updating orders…" : ""}
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="orders-date">Date</Label>
        <Input
          id="orders-date"
          type="date"
          value={currentDate}
          onChange={(e) => updateFilters({ date: e.target.value })}
          disabled={isPending}
          className="w-full lg:w-auto"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="orders-search">Search orders</Label>
        <Input
          id="orders-search"
          type="search"
          placeholder="Order number or customer name"
          value={searchValue}
          onChange={(e) => {
            const value = e.target.value;
            searchValueRef.current = value;
            setSearchValue(value);
            if (value === "" || value.length >= 2) {
              latestFiltersRef.current = {
                ...latestFiltersRef.current,
                search: value,
              };
            }
          }}
          className="w-full"
        />
      </div>
      <div className="min-w-0 space-y-1.5">
        <span className="block text-sm font-medium text-foreground">Status</span>
        <Tabs
          value={currentStatus}
          onValueChange={(value) => updateFilters({ status: value })}
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
                disabled={isPending}
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
