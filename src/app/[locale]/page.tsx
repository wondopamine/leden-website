import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
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
import type { CafeInfo } from "@/lib/sanity/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Hours are needed immediately for the hero's live open/closed status.
  const info = await fetchCafeInfo();

  return (
    <>
      <Hero locale={locale} hours={info.hours} />

      <Suspense fallback={<HomeSkeleton />}>
        <BelowHero locale={locale} info={info} />
      </Suspense>

      <StickyOrderBar />
    </>
  );
}

async function BelowHero({ locale, info }: { locale: string; info: CafeInfo }) {
  const [items, place] = await Promise.all([fetchMenuItems(), getGooglePlaceData()]);

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
