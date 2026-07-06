"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Pause, Play } from "lucide-react";
import { Stars } from "@/components/ui/stars";
import type { GoogleReview } from "@/lib/google-places";

/**
 * Auto-scrolling review marquee with an accessible pause control (WCAG 2.2.2)
 * and a reduced-motion static-scroll fallback. Cards are solid (no glass).
 */
export function ReviewMarquee({ reviews }: { reviews: GoogleReview[] }) {
  const tc = useTranslations("common");
  const [paused, setPaused] = useState(false);
  const track = [...reviews, ...reviews];

  return (
    <div className="relative mt-8">
      <div className="mx-auto mb-4 flex max-w-6xl justify-end px-5">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="inline-flex items-center gap-1.5 rounded-full border border-cream-1/25 px-3 py-1.5 text-caption font-medium text-cream-1 transition-colors hover:bg-cream-1/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream-1 focus-visible:ring-offset-2 focus-visible:ring-offset-forest-9"
        >
          {paused ? <Play aria-hidden className="size-3.5" /> : <Pause aria-hidden className="size-3.5" />}
          {paused ? tc("play") : tc("pause")}
        </button>
      </div>

      {/* edge fades */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-forest-9 to-transparent sm:w-24" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-forest-9 to-transparent sm:w-24" />

      <ul
        className={`review-carousel flex w-max gap-4 px-5 motion-reduce:w-full motion-reduce:flex-nowrap motion-reduce:overflow-x-auto ${
          paused ? "[animation-play-state:paused]" : ""
        }`}
      >
        {track.map((review, i) => (
          <li
            key={i}
            className="flex w-[min(82vw,340px)] shrink-0 flex-col rounded-2xl border border-forest-8 bg-forest-10 p-5"
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
