import Image from "next/image";
import { Stars } from "@/components/ui/stars";
import type { GoogleReview } from "@/lib/google-places";

/**
 * Horizontally scrollable review rail. It never moves without user input, so
 * review content stays readable without a separate motion preference path.
 */
export function ReviewMarquee({ reviews }: { reviews: GoogleReview[] }) {
  return (
    <div className="relative mt-8">
      {/* edge fades */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-forest-9 to-transparent sm:w-24" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-forest-9 to-transparent sm:w-24" />

      <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 [scrollbar-width:thin]">
        {reviews.map((review, i) => (
          <li
            key={i}
            className="flex w-[min(82vw,340px)] shrink-0 snap-start flex-col rounded-2xl border border-forest-8 bg-forest-10 p-5"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest-8 text-body font-semibold text-cream-1">
                {review.name.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-caption font-medium text-cream-1">{review.name}</p>
                <p className="text-label text-cream-1/70">{review.time}</p>
              </div>
              <Image src="/google.svg" alt="" aria-hidden width={16} height={16} className="ml-auto opacity-40" />
            </div>
            <div className="mt-3">
              <Stars count={review.rating} size="sm" label={`${review.rating} / 5`} />
            </div>
            <p className="mt-3 line-clamp-4 text-caption leading-relaxed text-cream-1/85">{review.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
