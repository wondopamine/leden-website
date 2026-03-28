"use client";

import type { Period } from "@/lib/supabase/analytics";

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
      {PERIODS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onSelect(value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            selected === value
              ? "bg-stone-900 text-white"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
