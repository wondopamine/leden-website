import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchCafeInfo, fetchMenuItems } from "@/lib/data";
import { getLocalizedString, formatPrice } from "@/lib/utils/format";
import { use } from "react";
import { DoodleUnderline } from "@/components/doodles";
import { getItemImageUrl } from "@/lib/menu-images";
import { getGooglePlaceData, type PlaceData } from "@/lib/google-places";

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
      <HeroSection t={t} tc={tc} locale={locale} />
      <FeaturedSection locale={locale} t={t} tc={tc} />
      <ReviewsSection t={t} />
      <AboutSection t={t} />
      <HoursSection locale={locale} t={t} />
    </>
  );
}

/* ─── Star renderer ────────────────────────────────────────── */
function Stars({ count, size = "sm" }: { count: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span className="inline-flex gap-0.5 text-amber-500">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`${cls} ${i < count ? "fill-current" : "fill-muted stroke-current opacity-30"}`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.368-2.447a1 1 0 00-1.175 0l-3.368 2.447c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
        </svg>
      ))}
    </span>
  );
}

/* ─── Google logo inline SVG ───────────────────────────────── */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

/* ─── Hero ─────────────────────────────────────────────────── */
async function HeroSection({
  t,
  tc,
  locale,
}: {
  t: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
  locale: string;
}) {
  const place = await getGooglePlaceData();

  return (
    <section className="relative overflow-hidden">
      {/* Clean background matching logo cream tone */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#f2ead5] via-[#f2ead5]/60 to-background" />

      <div className="relative mx-auto flex min-h-[75vh] max-w-4xl flex-col items-center justify-center px-4 text-center">
        {/* Small tag */}
        <span className="mb-6 inline-block rounded-full border border-[#2D5A3D]/20 bg-[#2D5A3D]/8 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[#2D5A3D]">
          {t("hero.tag")}
        </span>

        {/* Logo image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Cafe Le Den — Café · Sandwicherie"
          className="h-auto w-[280px] sm:w-[360px] lg:w-[420px]"
        />

        <p className="mt-4 text-lg text-[#2D5A3D]/70 sm:text-xl" style={{ fontFamily: "var(--font-display)" }}>
          {t("hero.subtitle")}
        </p>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t("hero.description")}
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <Link href="/menu">
            <Button
              size="lg"
              className="h-12 rounded-full px-8 text-base font-semibold shadow-lg shadow-primary/20 transition-shadow hover:shadow-xl hover:shadow-primary/30"
            >
              {tc("orderForPickup")}
            </Button>
          </Link>
          <a href="#about">
            <Button
              size="lg"
              variant="ghost"
              className="h-12 rounded-full px-8 text-base text-muted-foreground hover:text-foreground"
            >
              {tc("ourStory")} &darr;
            </Button>
          </a>
        </div>

        {/* Social proof — Google Maps (live data) */}
        <a
          href={place.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-12 flex items-center gap-2.5 rounded-full border border-border/60 bg-background/60 px-4 py-2 text-sm text-muted-foreground backdrop-blur-sm transition-colors hover:border-primary/30 hover:text-foreground"
        >
          <GoogleIcon className="h-4.5 w-4.5" />
          <Stars count={Math.round(place.rating)} />
          <span className="font-medium">{place.rating}/5</span>
          <span className="text-muted-foreground/60">&middot;</span>
          <span>{place.reviewCount}+ reviews</span>
          <span className="text-muted-foreground/60">&middot;</span>
          <span>{t("hero.since")}</span>
        </a>
      </div>
    </section>
  );
}

/* ─── Featured ─────────────────────────────────────────────── */
async function FeaturedSection({
  locale,
  t,
  tc,
}: {
  locale: string;
  t: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
}) {
  const items = await fetchMenuItems();
  const featured = items.filter((item) => item.available).slice(0, 4);

  return (
    <section className="relative mx-auto max-w-5xl px-4 py-20">
      <div className="flex items-end justify-between">
        <div>
          <h2
            className="text-3xl tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("featured.title")}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {t("featured.subtitle")}
          </p>
        </div>
        <Link href="/menu" className="hidden sm:block">
          <Button variant="outline" className="rounded-full">
            {tc("viewFullMenu")} &rarr;
          </Button>
        </Link>
      </div>

      <div className="relative mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((item) => {
          const imgSrc = getItemImageUrl(item);
          return (
            <Link key={item._id} href="/menu">
              <Card className="group relative cursor-pointer overflow-hidden border-border/50 transition-all hover:border-primary/30 hover:shadow-md">
                <div className="relative h-36 overflow-hidden bg-muted/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgSrc}
                    alt={getLocalizedString(item.name, locale)}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-primary/70">
                    {getLocalizedString(item.category.name, locale)}
                  </p>
                  <h3 className="mt-1 font-semibold leading-tight">
                    {getLocalizedString(item.name, locale)}
                  </h3>
                  <p className="mt-1.5 text-sm leading-snug text-muted-foreground line-clamp-2">
                    {getLocalizedString(item.description, locale)}
                  </p>
                  <p className="mt-3 text-sm font-semibold tabular-nums text-primary">
                    {formatPrice(item.price)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 text-center sm:hidden">
        <Link href="/menu">
          <Button variant="outline" className="rounded-full">
            {tc("viewFullMenu")} &rarr;
          </Button>
        </Link>
      </div>
    </section>
  );
}

/* ─── Reviews carousel (real Google reviews) ───────────────── */
async function ReviewsSection({
  t,
}: {
  t: ReturnType<typeof useTranslations>;
}) {
  const place = await getGooglePlaceData();
  // Duplicate for seamless infinite scroll
  const doubledReviews = [...place.reviews, ...place.reviews];

  return (
    <section className="relative overflow-hidden bg-secondary/30 py-16">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center justify-between">
          <div>
            <h2
              className="text-3xl tracking-tight sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("reviews.title")}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t("reviews.subtitle")}
            </p>
          </div>
          <a
            href={place.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm transition-colors hover:border-primary/30 sm:flex"
          >
            <GoogleIcon className="h-4 w-4" />
            <span className="font-semibold">{place.rating}</span>
            <Stars count={Math.round(place.rating)} />
            <span className="text-muted-foreground">
              ({place.reviewCount}) {t("reviews.onGoogle")}
            </span>
          </a>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative mt-10">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-secondary/30 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-secondary/30 to-transparent" />

        <div className="review-carousel flex w-max gap-5 px-4">
          {doubledReviews.map((review, i) => (
            <div
              key={i}
              className="w-[320px] shrink-0 rounded-xl border border-border/50 bg-card p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {review.profilePhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={review.profilePhoto}
                      alt={review.name}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {review.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{review.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {review.time}
                    </p>
                  </div>
                </div>
                <GoogleIcon className="h-4 w-4 opacity-40" />
              </div>
              <div className="mt-3">
                <Stars count={review.rating} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-4">
                &ldquo;{review.text}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Google badge */}
      <div className="mt-6 flex justify-center sm:hidden">
        <a
          href={place.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm"
        >
          <GoogleIcon className="h-4 w-4" />
          <span className="font-semibold">{place.rating}</span>
          <Stars count={Math.round(place.rating)} />
          <span className="text-muted-foreground">
            ({place.reviewCount}) {t("reviews.onGoogle")}
          </span>
        </a>
      </div>
    </section>
  );
}

/* ─── About ────────────────────────────────────────────────── */
async function AboutSection({
  t,
}: {
  t: ReturnType<typeof useTranslations>;
}) {
  const place = await getGooglePlaceData();

  return (
    <section
      id="about"
      className="relative scroll-mt-20 bg-secondary/40 px-4 py-20"
    >
      <div className="mx-auto max-w-3xl text-center">
        <span className="text-3xl">&#9749;</span>
        <h2
          className="mt-4 text-3xl tracking-tight sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("about.title")}
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          {t("about.description")}
        </p>
        <div className="mx-auto mt-8 flex max-w-sm justify-center gap-8 text-center">
          <div>
            <p
              className="text-3xl text-primary"
              style={{ fontFamily: "var(--font-display)" }}
            >
              30+
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
              {t("about.years")}
            </p>
          </div>
          <div className="h-12 w-px bg-border" />
          <div>
            <p
              className="text-3xl text-primary"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {place.reviewCount}+
            </p>
            <p className="mt-1 flex items-center justify-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
              <GoogleIcon className="h-3 w-3" />
              Reviews
            </p>
          </div>
          <div className="h-12 w-px bg-border" />
          <div className="relative">
            <p
              className="text-3xl text-primary"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {place.rating}
            </p>
            <p className="mt-1 flex items-center justify-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
              <GoogleIcon className="h-3 w-3" />
              Google
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Hours ────────────────────────────────────────────────── */
async function HoursSection({
  locale,
  t,
}: {
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const [info, place] = await Promise.all([
    fetchCafeInfo(),
    getGooglePlaceData(),
  ]);
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
    <section className="mx-auto max-w-5xl px-4 py-20">
      <h2
        className="text-center text-3xl tracking-tight sm:text-4xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {t("hours.title")}
      </h2>
      <div className="mt-10 grid gap-8 md:grid-cols-2">
        {/* Hours */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
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
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                      isToday
                        ? "bg-primary/8 font-medium text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {isToday && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
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
        </Card>

        {/* Location + contact */}
        <Card className="border-border/50">
          <CardContent className="flex flex-col justify-between p-6">
            <div>
              <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("hours.findUs")}
              </h3>
              <p className="text-lg font-medium">{info.address}</p>
              {info.phone && (
                <p className="mt-2 text-muted-foreground">{info.phone}</p>
              )}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="https://www.instagram.com/cafe.le.den/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm transition-colors hover:border-primary/40 hover:text-primary"
              >
                Instagram
              </a>
              <a
                href="https://www.facebook.com/cafeleden/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm transition-colors hover:border-primary/40 hover:text-primary"
              >
                Facebook
              </a>
              <a
                href={place.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm transition-colors hover:border-primary/40 hover:text-primary"
              >
                <GoogleIcon className="h-3.5 w-3.5" />
                Google Maps
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
