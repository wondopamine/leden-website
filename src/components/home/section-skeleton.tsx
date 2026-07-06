// Branded loading fallback for the streamed below-hero content — warm cream
// tones and the section rhythm, never bare gray blocks.
export function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-[var(--section-y)]" aria-hidden>
      <div className="h-9 w-64 animate-pulse rounded-lg bg-cream-4" />
      <div className="mt-3 h-5 w-80 max-w-full animate-pulse rounded bg-cream-3" />
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-cream-6 bg-card">
            <div className="aspect-[4/3] animate-pulse bg-cream-3" />
            <div className="space-y-3 p-5">
              <div className="h-3 w-20 animate-pulse rounded bg-cream-4" />
              <div className="h-5 w-40 animate-pulse rounded bg-cream-4" />
              <div className="h-4 w-full animate-pulse rounded bg-cream-3" />
              <div className="h-4 w-16 animate-pulse rounded bg-cream-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
