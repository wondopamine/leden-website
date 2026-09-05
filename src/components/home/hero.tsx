import { Suspense } from "react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { OpenStatusPill } from "@/components/brand/open-status";
import { Watermelon } from "@/components/brand/watermelon";
import { buttonVariants } from "@/components/ui/button-variants";
import { Stars } from "@/components/ui/stars";
import { Link } from "@/i18n/navigation";
import { formatStatusLabel, getOpenStatus } from "@/lib/hours";
import { getGooglePlaceData } from "@/lib/google-places";
import type { CafeInfo } from "@/lib/types";

export function Hero({ locale, info }: { locale: string; info: CafeInfo }) {
  const t = useTranslations("landing.hero");
  const tc = useTranslations("common");
  const status = getOpenStatus(info.hours);
  const statusLabel = formatStatusLabel(status, tc, locale);

  return (
    <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
      <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl lg:min-h-[42rem] lg:grid-cols-12">
        <div className="relative min-h-56 overflow-hidden sm:min-h-72 lg:order-2 lg:col-span-6 lg:min-h-full">
          <Image
            src="/story-coffee.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 48vw, 100vw"
            className="object-cover object-center"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-primary/70 via-transparent to-transparent lg:bg-gradient-to-r lg:from-primary/30 lg:via-transparent"
          />
          <Watermelon
            size={56}
            className="absolute right-4 top-4 rotate-[14deg] drop-shadow-md sm:right-8 sm:top-8"
          />
        </div>

        <div className="relative flex flex-col justify-center px-5 py-8 sm:px-10 sm:py-12 lg:order-1 lg:col-span-6 lg:px-16 lg:py-20">
          <div className="hero-fade-up hero-delay-1 flex flex-wrap items-center gap-2.5">
            <OpenStatusPill
              isOpen={status.isOpen}
              label={statusLabel}
              tone="onForest"
            />
            <span className="inline-flex min-h-8 items-center gap-1.5 text-caption text-primary-foreground/80">
              <MapPin aria-hidden className="size-4 shrink-0" />
              {info.address}
            </span>
          </div>

          <h1 className="hero-fade-up hero-delay-2 mt-5">
            <span className="sr-only">{t("title")}</span>
            <Wordmark className="block w-[210px] brightness-0 invert sm:w-[300px] lg:w-[360px] [&>svg]:h-auto [&>svg]:w-full" />
          </h1>

          <p className="hero-fade-up hero-delay-2 mt-4 max-w-xl font-display text-h2 text-primary-foreground">
            {t("subtitle")}
          </p>
          <p className="hero-fade-up hero-delay-3 mt-3 max-w-lg text-body leading-relaxed text-primary-foreground/80">
            {t("description")}
          </p>

          <div className="hero-fade-up hero-delay-3 mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/menu"
              className={buttonVariants({
                variant: "default",
                size: "lg",
                className:
                  "h-12 rounded-full bg-primary px-7 text-base text-primary-foreground ring-1 ring-primary-foreground/35 hover:bg-primary/90",
              })}
            >
              {tc("orderForPickup")}
            </Link>
            <Link
              href="/menu"
              className={buttonVariants({
                variant: "ghost",
                size: "lg",
                className:
                  "h-12 rounded-full px-5 text-primary-foreground underline-offset-4 hover:text-primary-foreground hover:opacity-80 hover:underline",
              })}
            >
              {tc("viewMenu")}
            </Link>
          </div>

          <Suspense fallback={<div className="mt-6 h-7" />}>
            <HeroProof />
          </Suspense>
        </div>
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
      className="hero-fade-up hero-delay-4 mt-6 inline-flex w-fit min-h-11 flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-2 text-caption text-primary-foreground/80 transition-colors hover:bg-primary-foreground/15 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
    >
      <Image src="/google.svg" alt="Google" width={16} height={16} />
      <Stars count={Math.round(place.rating)} size="sm" />
      <span className="font-semibold tabular-nums text-primary-foreground">{place.rating}/5</span>
      <span aria-hidden className="text-primary-foreground/35">&middot;</span>
      <span>{tc("reviewsCount", { count: place.reviewCount })}</span>
      <span aria-hidden className="hidden text-primary-foreground/35 sm:inline">&middot;</span>
      <span className="hidden sm:inline">{t("since")}</span>
    </a>
  );
}
