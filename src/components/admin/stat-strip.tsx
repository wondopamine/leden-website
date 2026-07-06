import { cn } from "@/lib/utils";

export type StatTile = {
  label: string;
  value: string;
};

// Compact stat strip for the admin (product register): one bordered card split by
// hairline dividers into slim tiles. Dense and scannable, not a marketing hero-metric
// band. Tiles flex to fill the row and wrap onto a second row on narrow screens; the
// -mr-px/-mb-px on the inner row lets overflow-hidden clip the trailing dividers so
// only the interior borders show.
export function StatStrip({
  tiles,
  className,
}: {
  tiles: StatTile[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card",
        className
      )}
    >
      <div className="-mr-px -mb-px flex flex-wrap">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="min-w-[7.5rem] flex-1 border-r border-b border-border px-4 py-3"
          >
            <p className="text-label uppercase tracking-wide text-muted-foreground">
              {tile.label}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {tile.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
