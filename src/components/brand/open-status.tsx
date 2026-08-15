import { cn } from "@/lib/utils";

/**
 * Live open/closed pill. Presentational: pass the computed `isOpen` and a
 * pre-localized `label`. A small dot signals state (color + label, never color
 * alone). The pulse is paused under prefers-reduced-motion via the global guard.
 */
export function OpenStatusPill({
  isOpen,
  label,
  className,
  tone = "onCream",
}: {
  isOpen: boolean;
  label: string;
  className?: string;
  tone?: "onCream" | "onForest";
}) {
  const onForest = tone === "onForest";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-caption font-medium",
        onForest
          ? "border-forest-8 bg-forest-10 text-cream-1"
          : "border-cream-6 bg-cream-1 text-forest-11 shadow-sm",
        className
      )}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {isOpen && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-7 opacity-75" />
        )}
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            isOpen ? "bg-forest-9" : "bg-cream-8"
          )}
        />
      </span>
      {label}
    </span>
  );
}
