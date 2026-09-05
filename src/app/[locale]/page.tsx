import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CircleAlert } from "lucide-react";
import { fetchCafeInfo, fetchMenuItems } from "@/lib/data";
import { getGooglePlaceData } from "@/lib/google-places";
import { Hero } from "@/components/home/hero";
import { Featured } from "@/components/home/featured";
import { Reviews } from "@/components/home/reviews";
import { Story } from "@/components/home/story";
import { Visit } from "@/components/home/visit";
import { StickyOrderBar } from "@/components/home/sticky-order-bar";
import { HomeSkeleton } from "@/components/home/section-skeleton";
import { WatermelonDivider } from "@/components/brand/watermelon";
import type { CafeInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ homeConfig?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.home" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function HomePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { homeConfig } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "landing" });
  const storefront =
    process.env.PLAYWRIGHT_STOREFRONT_PREVIEW === "1" &&
    homeConfig === "unavailable"
      ? null
      : await loadStorefront();

  if (!storefront) {
    return (
      <section className="mx-auto flex max-w-3xl flex-1 items-center px-5 py-24">
        <div
          className="w-full rounded-3xl border border-accent-border bg-accent-surface p-6 text-accent-text sm:p-8"
          role="status"
        >
          <CircleAlert aria-hidden className="size-7" />
          <h1 className="mt-4 font-display text-h2">
            {t("unavailableTitle")}
          </h1>
          <p className="mt-2 max-w-xl text-body">
            {t("unavailableBody")}
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      <Hero locale={locale} info={storefront.info} />

      <Suspense fallback={<HomeSkeleton />}>
        <BelowHero
          locale={locale}
          info={storefront.info}
          items={storefront.items}
        />
      </Suspense>

      <StickyOrderBar />
    </>
  );
}

async function loadStorefront() {
  try {
    const [info, items] = await Promise.all([
      fetchCafeInfo(),
      fetchMenuItems(),
    ]);
    return { info, items };
  } catch {
    return null;
  }
}

async function BelowHero({
  locale,
  info,
  items,
}: {
  locale: string;
  info: CafeInfo;
  items: Awaited<ReturnType<typeof fetchMenuItems>>;
}) {
  const place = await getGooglePlaceData();

  return (
    <>
      <Featured locale={locale} items={items} />
      <WatermelonDivider className="mx-auto max-w-6xl px-5" />
      <Reviews place={place} />
      <Story place={place} />
      <WatermelonDivider className="mx-auto max-w-6xl px-5 pb-[var(--section-y)]" />
      <Visit locale={locale} info={info} />
    </>
  );
}
