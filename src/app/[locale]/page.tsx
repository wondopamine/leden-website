import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { fetchCafeInfo, fetchMenuItems } from "@/lib/data";
import { getLocalizedString, formatPrice } from "@/lib/utils/format";
import { use } from "react";

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
      <HeroSection t={t} tc={tc} />
      <FeaturedSection locale={locale} t={t} />
      <AboutSection t={t} />
      <HoursSection locale={locale} t={t} />
    </>
  );
}

function HeroSection({
  t,
  tc,
}: {
  t: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
}) {
  return (
    <section className="relative flex min-h-[70vh] items-center justify-center bg-gradient-to-b from-secondary/50 to-background px-4">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          {t("hero.title")}
        </h1>
        <p className="mt-3 text-lg font-medium text-primary">
          {t("hero.subtitle")}
        </p>
        <p className="mt-4 text-lg text-muted-foreground">
          {t("hero.description")}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/menu">
            <Button size="lg">{tc("orderNow")}</Button>
          </Link>
          <Link href="/menu">
            <Button size="lg" variant="outline">
              {tc("viewMenu")}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

async function FeaturedSection({
  locale,
  t,
}: {
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const items = await fetchMenuItems();
  const featured = items.filter((item) => item.available).slice(0, 4);

  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <h2 className="text-center text-3xl font-bold">{t("featured.title")}</h2>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((item) => (
          <Card key={item._id} className="overflow-hidden">
            <div className="aspect-[4/3] bg-muted/50 flex items-center justify-center">
              <span className="text-4xl">
                {item.category.slug === "coffee"
                  ? "\u2615"
                  : item.category.slug === "tea"
                    ? "\uD83C\uDF75"
                    : item.category.slug === "breakfast"
                      ? "\uD83C\uDF73"
                      : item.category.slug === "lunch"
                        ? "\uD83C\uDF5C"
                        : "\uD83E\uDD50"}
              </span>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold">
                {getLocalizedString(item.name, locale)}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {getLocalizedString(item.description, locale)}
              </p>
              <p className="mt-2 font-semibold text-primary">
                {formatPrice(item.price)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function AboutSection({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <section className="bg-secondary/30 px-4 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold">{t("about.title")}</h2>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          {t("about.description")}
        </p>
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
    Monday: { en: "Monday", fr: "Lundi" },
    Tuesday: { en: "Tuesday", fr: "Mardi" },
    Wednesday: { en: "Wednesday", fr: "Mercredi" },
    Thursday: { en: "Thursday", fr: "Jeudi" },
    Friday: { en: "Friday", fr: "Vendredi" },
    Saturday: { en: "Saturday", fr: "Samedi" },
    Sunday: { en: "Sunday", fr: "Dimanche" },
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <h2 className="text-center text-3xl font-bold">{t("hours.title")}</h2>
      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-semibold">{t("hours.openDaily")}</h3>
            <div className="space-y-2">
              {info.hours.map((h) => (
                <div key={h.day} className="flex justify-between text-sm">
                  <span>{locale === "fr" ? dayNames[h.day]?.fr : dayNames[h.day]?.en}</span>
                  <span className="text-muted-foreground">
                    {h.closed ? t("hours.closed") : `${h.open} - ${h.close}`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col justify-center p-6">
            <h3 className="mb-2 text-lg font-semibold">{t("hours.address")}</h3>
            <Separator className="my-4" />
            <p className="text-sm text-muted-foreground">{info.address}</p>
            {info.phone && (
              <p className="mt-2 text-sm text-muted-foreground">{info.phone}</p>
            )}
            <div className="mt-4 flex gap-4">
              <a
                href="https://www.instagram.com/cafe.le.den/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Instagram
              </a>
              <a
                href="https://www.facebook.com/cafeleden/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Facebook
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
