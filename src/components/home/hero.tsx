import { Suspense } from "react";
import Image from "next/image";
import { Wordmark } from "@/components/brand/wordmark";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Stars } from "@/components/ui/stars";
import { OpenStatusPill } from "@/components/brand/open-status";
import { Watermelon } from "@/components/brand/watermelon";
import { getOpenStatus, formatStatusLabel, type DayHours } from "@/lib/hours";
import { getGooglePlaceData } from "@/lib/google-places";

export function Hero({ locale, hours }: { locale: string; hours: DayHours[] }) {
  const t = useTranslations("landing.hero");
  const tc = useTranslations("common");
  const status = getOpenStatus(hours);
  const statusLabel = formatStatusLabel(status, tc, locale);

  return (
    <section className="relative overflow-hidden">
      {/* soft warm wash — a single radial, not a flat gradient band */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120% 90% at 50% -10%, var(--cream-1) 0%, var(--cream-2) 55%, var(--cream-3) 100%)",
        }}
      />
      {/* watermelon peeking from the top-right corner */}
      <Watermelon
        size={64}
        className="absolute -right-3 top-6 rotate-[18deg] opacity-90 sm:right-6 sm:top-10"
      />

      <div className="mx-auto flex max-w-3xl flex-col items-center px-5 pb-16 pt-14 text-center sm:pb-24 sm:pt-20">
        <div className="hero-fade-up hero-delay-1">
          <OpenStatusPill isOpen={status.isOpen} label={statusLabel} />
        </div>

        <h1 className="hero-fade-up hero-delay-2 mt-8">
          <span className="sr-only">{t("title")}</span>
          {/* Inline vector wordmark: paints with the HTML (no image request), so the
              hero LCP element is no longer network-bound. The sr-only title names it. */}
          <Wordmark className="block w-[248px] sm:w-[340px] lg:w-[400px] [&>svg]:h-auto [&>svg]:w-full" />
        </h1>

        <p className="hero-fade-up hero-delay-2 mt-6 font-display text-h2 text-forest-11">
          {t("subtitle")}
        </p>

        <p className="hero-fade-up hero-delay-3 mt-4 max-w-md text-pretty text-body leading-relaxed text-forest-11/80">
          {t("description")}
        </p>

        <div className="hero-fade-up hero-delay-3 mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
          <Link href="/menu" className="w-full sm:w-auto">
            <Button variant="default" size="lg" className="h-12 w-full rounded-full px-8 text-base sm:w-auto">
              {tc("orderForPickup")}
            </Button>
          </Link>
          <Link href="/menu" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="h-12 w-full rounded-full px-8 text-base sm:w-auto">
              {tc("viewMenu")}
            </Button>
          </Link>
        </div>

        <Suspense fallback={<div className="mt-10 h-6" />}>
          <HeroProof />
        </Suspense>
      </div>
    </section>
  );
}

async function HeroProof() {
  const t = await getTranslations("landing.hero");
  const tc = await getTranslations("common");
  const place = await getGooglePlaceData();

  return (
    <a
      href={place.url}
      target="_blank"
      rel="noopener noreferrer"
      className="hero-fade-up hero-delay-4 mt-10 inline-flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 rounded-full px-2 py-1 text-caption text-forest-11/80 transition-colors hover:text-forest-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Image src="/google.svg" alt="Google" width={16} height={16} className="inline-block" />
      <Stars count={Math.round(place.rating)} size="sm" />
      <span className="font-semibold text-forest-12">{place.rating}/5</span>
      <span aria-hidden className="text-forest-9/40">&middot;</span>
      <span>{tc("reviewsCount", { count: place.reviewCount })}</span>
      <span aria-hidden className="text-forest-9/40">&middot;</span>
      <span>{t("since")}</span>
    </a>
  );
}
