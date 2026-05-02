import { Suspense } from "react";
import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Stars } from "@/components/ui/stars";
import { fetchCafeInfo, fetchMenuItems } from "@/lib/data";
import { getLocalizedString, formatPrice } from "@/lib/utils/format";
import { use } from "react";
import { getItemImageUrl } from "@/lib/menu-images";
import { getGooglePlaceData, type PlaceData } from "@/lib/google-places";
import { FadeIn } from "@/components/fade-in";
import type { MenuItem } from "@/lib/sanity/types";
import type { CafeInfo } from "@/lib/sanity/types";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default function HomePage({ params }: Props) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("landing");
  const tc = useTranslations("common");

  return (
    <>
      <HeroShell t={t} tc={tc}>
        <Suspense>
          <HeroGoogleBadge t={t} />
        </Suspense>
      </HeroShell>

      <Suspense fallback={<SectionsSkeleton />}>
        <HomePageSections locale={locale} t={t} tc={tc} />
      </Suspense>
    </>
  );
}

/* ─── Parallel data fetch ─────────────────────────────────── */
async function HomePageSections({
  locale,
  t,
  tc,
}: {
  locale: string;
  t: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
}) {
  const [items, info, place] = await Promise.all([
    fetchMenuItems(),
    fetchCafeInfo(),
    getGooglePlaceData(),
  ]);

  return (
    <>
      <FeaturedSection locale={locale} t={t} tc={tc} items={items} />
      <ReviewsSection t={t} place={place} />
      <AboutSection t={t} place={place} />
      <HoursSection locale={locale} t={t} info={info} place={place} />
    </>
  );
}

/* ─── Skeleton ────────────────────────────────────────────── */
function SectionsSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-24">
      <div className="h-10 w-56 animate-pulse rounded bg-muted/40" />
      <div className="mt-4 h-5 w-72 animate-pulse rounded bg-muted/30" />
      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-80 animate-pulse rounded-2xl bg-muted/20" />
        ))}
      </div>
    </div>
  );
}

/* ─── HERO ────────────────────────────────────────────────── */
function HeroShell({
  t,
  tc,
  children,
}: {
  t: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-muted via-muted/60 to-background" />

      <div className="relative mx-auto flex min-h-[85vh] max-w-5xl flex-col items-center justify-center px-4 text-center">
        {/* Animated logo: staged clip-path reveal */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Cafe Le Den"
          className="logo-animate h-auto w-[280px] sm:w-[360px] lg:w-[420px]"
        />

        <p
          className="hero-fade-in hero-fade-in-1 mt-6 text-xl text-primary/70 sm:text-2xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("hero.subtitle")}
        </p>

        <p className="hero-fade-in hero-fade-in-2 mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t("hero.description")}
        </p>

        <div className="hero-fade-in hero-fade-in-3 mt-12">
          <Link href="/menu">
            <Button
              size="lg"
              className="h-14 rounded-full px-10 text-lg font-semibold shadow-lg shadow-primary/20 transition-shadow hover:shadow-xl hover:shadow-primary/30"
            >
              {tc("orderForPickup")}
            </Button>
          </Link>
        </div>

        {/* Google badge */}
        <div className="hero-fade-in hero-fade-in-4">
          {children}
        </div>
      </div>
    </section>
  );
}

/* ─── Hero Google badge ───────────────────────────────────── */
async function HeroGoogleBadge({
  t,
}: {
  t: ReturnType<typeof useTranslations>;
}) {
  const place = await getGooglePlaceData();

  return (
    <a
      href={place.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-14 flex items-center gap-2.5 rounded-full border border-border/60 bg-background/60 px-5 py-2.5 text-sm text-muted-foreground backdrop-blur-sm transition-colors hover:border-primary/30 hover:text-foreground"
    >
      <Image src="/google.svg" alt="Google" width={18} height={18} className="inline-block" />
      <Stars count={Math.round(place.rating)} size="sm" />
      <span className="font-medium">{place.rating}/5</span>
      <span className="text-muted-foreground/60">&middot;</span>
      <span>{place.reviewCount}+ reviews</span>
      <span className="text-muted-foreground/60">&middot;</span>
      <span>{t("hero.since")}</span>
    </a>
  );
}

/* ─── FEATURED ────────────────────────────────────────────── */
function FeaturedSection({
  locale,
  t,
  tc,
  items,
}: {
  locale: string;
  t: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
  items: MenuItem[];
}) {
  const featured = items.filter((item) => item.status === "available").slice(0, 3);

  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:py-32">
      <FadeIn>
        <div className="flex items-end justify-between">
          <div>
            <h2
              className="text-4xl tracking-tight sm:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("featured.title")}
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              {t("featured.subtitle")}
            </p>
          </div>
          <Link href="/menu" className="hidden sm:block">
            <Button variant="outline" className="rounded-full px-6">
              {tc("viewFullMenu")} &rarr;
            </Button>
          </Link>
        </div>
      </FadeIn>

      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((item, i) => {
          const imgSrc = getItemImageUrl(item);
          return (
            <FadeIn key={item._id} delay={i * 150}>
              <Link href="/menu">
                <div className="group cursor-pointer overflow-hidden rounded-2xl bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
                  <div className="relative h-52 overflow-hidden bg-muted/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgSrc}
                      alt={getLocalizedString(item.name, locale)}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {getLocalizedString(item.category.name, locale)}
                    </p>
                    <h3 className="mt-1.5 text-lg font-semibold leading-tight">
                      {getLocalizedString(item.name, locale)}
                    </h3>
                    <p className="mt-2 text-sm leading-snug text-muted-foreground line-clamp-2">
                      {getLocalizedString(item.description, locale)}
                    </p>
                    <p className="mt-4 text-base font-semibold tabular-nums text-primary">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                </div>
              </Link>
            </FadeIn>
          );
        })}
      </div>

      <div className="mt-10 text-center sm:hidden">
        <Link href="/menu">
          <Button variant="outline" className="rounded-full">
            {tc("viewFullMenu")} &rarr;
          </Button>
        </Link>
      </div>
    </section>
  );
}

/* ─── REVIEWS ─────────────────────────────────────────────── */
function ReviewsSection({
  t,
  place,
}: {
  t: ReturnType<typeof useTranslations>;
  place: PlaceData;
}) {
  const doubledReviews = [...place.reviews, ...place.reviews];

  return (
    <section className="relative overflow-hidden bg-primary py-24 sm:py-32">
      <FadeIn>
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between">
            <div>
              <h2
                className="text-4xl tracking-tight text-white sm:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("reviews.title")}
              </h2>
              <p className="mt-3 text-lg text-white/60">
                {t("reviews.subtitle")}
              </p>
            </div>
            <a
              href={place.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20 sm:flex"
            >
              <Image src="/google.svg" alt="Google" width={16} height={16} className="inline-block" />
              <span className="font-semibold">{place.rating}</span>
              <Stars count={Math.round(place.rating)} size="sm" />
              <span className="text-white/70">
                ({place.reviewCount}) {t("reviews.onGoogle")}
              </span>
            </a>
          </div>
        </div>
      </FadeIn>

      <div className="relative mt-12">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-primary to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-primary to-transparent" />

        <div className="review-carousel flex w-max gap-6 px-4">
          {doubledReviews.map((review, i) => (
            <div
              key={i}
              className="w-[360px] shrink-0 rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {review.profilePhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={review.profilePhoto}
                      alt={review.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white">
                      {review.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">{review.name}</p>
                    <p className="text-xs text-white/50">{review.time}</p>
                  </div>
                </div>
                <Image src="/google.svg" alt="Google" width={16} height={16} className="inline-block opacity-30" />
              </div>
              <div className="mt-3">
                <Stars count={review.rating} size="sm" />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/80 line-clamp-4">
                &ldquo;{review.text}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-center sm:hidden">
        <a
          href={place.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white"
        >
          <Image src="/google.svg" alt="Google" width={16} height={16} className="inline-block" />
          <span className="font-semibold">{place.rating}</span>
          <Stars count={Math.round(place.rating)} size="sm" />
          <span className="text-white/70">
            ({place.reviewCount}) {t("reviews.onGoogle")}
          </span>
        </a>
      </div>
    </section>
  );
}

/* ─── ABOUT ───────────────────────────────────────────────── */
function AboutSection({
  t,
  place,
}: {
  t: ReturnType<typeof useTranslations>;
  place: PlaceData;
}) {
  return (
    <section
      id="about"
      className="relative scroll-mt-20 bg-muted px-4 py-28 sm:py-36"
    >
      <FadeIn>
        <div className="mx-auto max-w-3xl">
          <h2
            className="text-4xl tracking-tight sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("about.title")}
          </h2>
          <p className="mt-8 text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {t("about.description")}
          </p>
          <div className="mt-12 flex gap-10 sm:gap-14">
            <div>
              <p
                className="text-4xl text-primary sm:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                30+
              </p>
              <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
                {t("about.years")}
              </p>
            </div>
            <div className="w-px bg-border" />
            <div>
              <p
                className="text-4xl text-primary sm:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {place.reviewCount}+
              </p>
              <p className="mt-2 flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
                <Image src="/google.svg" alt="Google" width={12} height={12} className="inline-block" />
                Reviews
              </p>
            </div>
            <div className="w-px bg-border" />
            <div>
              <p
                className="text-4xl text-primary sm:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {place.rating}
              </p>
              <p className="mt-2 flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
                <Image src="/google.svg" alt="Google" width={12} height={12} className="inline-block" />
                Google
              </p>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

/* ─── HOURS ───────────────────────────────────────────────── */
function HoursSection({
  locale,
  t,
  info,
  place,
}: {
  locale: string;
  t: ReturnType<typeof useTranslations>;
  info: CafeInfo;
  place: PlaceData;
}) {
  const dayNames: Record<string, { en: string; fr: string }> = {
    Monday: { en: "Mon", fr: "Lun" },
    Tuesday: { en: "Tue", fr: "Mar" },
    Wednesday: { en: "Wed", fr: "Mer" },
    Thursday: { en: "Thu", fr: "Jeu" },
    Friday: { en: "Fri", fr: "Ven" },
    Saturday: { en: "Sat", fr: "Sam" },
    Sunday: { en: "Sun", fr: "Dim" },
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:py-32">
      <FadeIn>
        <h2
          className="text-center text-4xl tracking-tight sm:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("hours.title")}
        </h2>
      </FadeIn>
      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <FadeIn delay={0}>
          <Card className="overflow-hidden rounded-2xl border-0 shadow-md">
            <div className="border-l-4 border-l-primary">
              <CardContent className="p-8">
                <h3 className="mb-6 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("hours.openDaily")}
                </h3>
                <div className="space-y-3">
                  {info.hours.map((h) => {
                    const today = new Date().toLocaleDateString("en-US", {
                      weekday: "long",
                    });
                    const isToday = h.day === today;
                    return (
                      <div
                        key={h.day}
                        className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm ${
                          isToday
                            ? "bg-primary/10 font-semibold text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {isToday && (
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          )}
                          {locale === "fr"
                            ? dayNames[h.day]?.fr
                            : dayNames[h.day]?.en}
                        </span>
                        <span>
                          {h.closed
                            ? t("hours.closed")
                            : `${h.open} — ${h.close}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </div>
          </Card>
        </FadeIn>

        <FadeIn delay={150}>
          <Card className="overflow-hidden rounded-2xl border-0 shadow-md">
            <div className="border-l-4 border-l-primary">
              <CardContent className="flex h-full flex-col justify-between p-8">
                <div>
                  <h3 className="mb-6 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("hours.findUs")}
                  </h3>
                  <p className="text-xl font-medium">{info.address}</p>
                  {info.phone && (
                    <p className="mt-3 text-muted-foreground">{info.phone}</p>
                  )}
                </div>
                <div className="mt-10 flex flex-wrap gap-3">
                  <a
                    href="https://www.instagram.com/cafe.le.den/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    Instagram
                  </a>
                  <a
                    href="https://www.facebook.com/cafeleden/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    Facebook
                  </a>
                  <a
                    href={place.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <Image src="/google.svg" alt="Google" width={14} height={14} className="inline-block" />
                    Google Maps
                  </a>
                </div>
              </CardContent>
            </div>
          </Card>
        </FadeIn>
      </div>
    </section>
  );
}
