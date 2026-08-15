"use client";

import type { Period } from "@/lib/supabase/analytics";
import { Button } from "@/components/ui/button";

const PERIODS: { value: Period; label: string }[] = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "Week" },
  { value: "monthly", label: "Month" },
  { value: "3months", label: "3 months" },
  { value: "6months", label: "6 months" },
  { value: "yearly", label: "Year" },
  { value: "all", label: "All" },
];

type Props = {
  selected: Period;
  onSelect: (period: Period) => void;
};

export function PeriodSelector({ selected, onSelect }: Props) {
  return (
    <div
      role="group"
      aria-label="Analysis period"
      className="flex flex-wrap gap-1"
    >
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
