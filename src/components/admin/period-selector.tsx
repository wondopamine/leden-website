"use client";

import type { Period } from "@/lib/supabase/analytics";
import { Button } from "@/components/ui/button";

const PERIODS: { value: Period; label: string }[] = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "Week" },
  { value: "monthly", label: "Month" },
  { value: "3months", label: "3M" },
  { value: "6months", label: "6M" },
  { value: "yearly", label: "Year" },
  { value: "all", label: "All" },
];

type Props = {
  selected: Period;
  onSelect: (period: Period) => void;
};

export function PeriodSelector({ selected, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-1">
      {PERIODS.map(({ value, label }) => {
        const isActive = selected === value;
        return (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={isActive ? "default" : "ghost"}
            aria-pressed={isActive}
            onClick={() => onSelect(value)}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
