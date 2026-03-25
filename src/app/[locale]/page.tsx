import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchCafeInfo, fetchMenuItems } from "@/lib/data";
import { getLocalizedString, formatPrice } from "@/lib/utils/format";
import { use } from "react";
import {
  DoodleCoffeeCup,
  DoodleHeart,
  DoodleStar,
  DoodleCroissant,
  DoodleLeaf,
  DoodleSparkles,
  DoodleUnderline,
  StickerSince1994,
  StickerFreshDaily,
  StickerYum,
} from "@/components/doodles";

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
      <AboutSection t={t} />
      <HoursSection locale={locale} t={t} />
    </>
  );
}

function HeroSection({
  t,
  tc,
  locale,
}: {
  t: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
  locale: string;
}) {
  return (
    <section className="relative overflow-hidden">
      {/* Warm gradient background with subtle texture */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-secondary/40 to-background" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Scattered doodles — positioned absolutely around the hero */}
      <DoodleCoffeeCup
        className="absolute left-[5%] top-[15%] hidden h-16 w-16 text-primary/25 sm:block doodle-float"
        aria-hidden="true"
      />
      <DoodleStar
        className="absolute right-[8%] top-[20%] hidden h-10 w-10 text-primary/20 sm:block doodle-float"
        aria-hidden="true"
      />
      <DoodleCroissant
        className="absolute left-[8%] bottom-[20%] hidden h-14 w-14 text-primary/20 sm:block doodle-float"
        aria-hidden="true"
      />
      <DoodleHeart
        className="absolute right-[12%] bottom-[25%] hidden h-8 w-8 text-primary/25 sm:block doodle-wiggle"
        aria-hidden="true"
      />
      <DoodleSparkles
        className="absolute left-[20%] top-[30%] hidden h-8 w-8 text-primary/15 sm:block doodle-float"
        aria-hidden="true"
      />
      <DoodleLeaf
        className="absolute right-[5%] top-[50%] hidden h-10 w-10 text-green-700/15 sm:block doodle-float"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex min-h-[75vh] max-w-4xl flex-col items-center justify-center px-4 text-center">
        {/* Since 1994 sticker — floating top right */}
        <div className="absolute right-4 top-20 hidden sm:block doodle-pop" style={{ animationDelay: "0.8s", "--doodle-rotate": "8deg" } as React.CSSProperties}>
          <StickerSince1994 />
        </div>

        {/* Small tag */}
        <span className="mb-6 inline-block rounded-full border border-primary/20 bg-primary/8 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-primary">
          {t("hero.tag")}
        </span>

        <h1
          className="relative text-5xl leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("hero.title")}
          {/* Underline doodle under the title */}
          <DoodleUnderline className="absolute -bottom-2 left-1/2 h-3 w-3/4 -translate-x-1/2 text-primary/30" />
        </h1>

        <p
          className="mt-5 text-xl text-primary/80 sm:text-2xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
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

        {/* Social proof */}
        <div className="mt-12 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-lg">&#9733;&#9733;&#9733;&#9733;&#9734;</span>
          <span>4.3/5 — TripAdvisor</span>
          <span className="mx-1">&middot;</span>
          <span>{t("hero.since")}</span>
        </div>
      </div>
    </section>
  );
}

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

  const categoryEmoji: Record<string, string> = {
    coffee: "\u2615",
    tea: "\uD83C\uDF75",
    breakfast: "\uD83C\uDF73",
    lunch: "\uD83C\uDF5C",
    pastries: "\uD83E\uDD50",
  };

  return (
    <section className="relative mx-auto max-w-5xl px-4 py-20">
      {/* Floating sticker near section header */}
      <div className="absolute -right-2 top-16 hidden lg:block doodle-pop" style={{ animationDelay: "0.3s", "--doodle-rotate": "-5deg" } as React.CSSProperties}>
        <StickerYum />
      </div>

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
        {/* Decorative doodles between cards */}
        <DoodleHeart
          className="absolute -left-8 top-1/2 hidden h-6 w-6 text-primary/20 lg:block doodle-wiggle"
        />
        <DoodleSparkles
          className="absolute -right-6 top-1/3 hidden h-8 w-8 text-primary/15 lg:block doodle-float"
        />

        {featured.map((item, i) => (
          <Link key={item._id} href="/menu">
            <Card
              className="group relative cursor-pointer overflow-hidden border-border/50 transition-all hover:border-primary/30 hover:shadow-md"
            >
              {/* "Fresh daily" sticker on first card */}
              {i === 0 && (
                <div className="absolute right-2 top-2 z-10 doodle-pop" style={{ animationDelay: "0.6s" } as React.CSSProperties}>
                  <StickerFreshDaily text={locale === "fr" ? "Frais du jour" : "Fresh daily"} />
                </div>
              )}
              <div className="flex h-36 items-center justify-center bg-gradient-to-br from-muted/40 to-muted/20 text-4xl transition-transform group-hover:scale-105">
                {categoryEmoji[item.category.slug] || "\uD83C\uDF7D"}
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
        ))}
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

function AboutSection({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <section id="about" className="relative scroll-mt-20 bg-secondary/40 px-4 py-20">
      {/* Scattered doodles */}
      <DoodleCoffeeCup
        className="absolute left-[5%] top-10 hidden h-12 w-12 text-primary/15 lg:block doodle-float"
      />
      <DoodleStar
        className="absolute right-[8%] bottom-12 hidden h-8 w-8 text-primary/15 lg:block doodle-wiggle"
      />

      <div className="mx-auto max-w-3xl text-center">
        <DoodleCoffeeCup className="mx-auto h-12 w-12 text-primary/40" />
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
              #20
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
              {t("about.ranking")}
            </p>
          </div>
          <div className="h-12 w-px bg-border" />
          <div className="relative">
            <p
              className="text-3xl text-primary"
              style={{ fontFamily: "var(--font-display)" }}
            >
              4.3
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
              TripAdvisor
            </p>
            {/* Tiny heart next to rating */}
            <DoodleHeart className="absolute -right-5 -top-1 h-4 w-4 text-primary/30 doodle-wiggle" />
          </div>
        </div>
      </div>
    </section>
  );
}

async function HoursSection({
  locale,
  t,
}: {
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const info = await fetchCafeInfo();
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
    <section className="relative mx-auto max-w-5xl px-4 py-20">
      {/* Decorative leaf */}
      <DoodleLeaf
        className="absolute right-[3%] top-14 hidden h-12 w-12 text-green-700/12 lg:block doodle-float"
      />

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
                      {h.closed ? t("hours.closed") : `${h.open} — ${h.close}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Location + contact */}
        <Card className="relative border-border/50">
          {/* Little croissant doodle */}
          <DoodleCroissant
            className="absolute -right-3 -top-4 h-10 w-10 text-primary/20 doodle-wiggle"
          />
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
                href="https://www.tripadvisor.ca/Restaurant_Review-g181730-d7340218-Reviews-Cafe_Le_Den-Pointe_Claire_Quebec.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm transition-colors hover:border-primary/40 hover:text-primary"
              >
                TripAdvisor
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
