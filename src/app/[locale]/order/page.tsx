import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import { getCafeInfo } from "@/lib/supabase/queries";
import { sampleCafeInfo } from "@/lib/sample-data";
import { OrderContent } from "@/components/order/order-content";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ orderConfig?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.order" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function OrderPage({ params, searchParams }: Props) {
  const { locale } = use(params);
  const { orderConfig } = use(searchParams);
  setRequestLocale(locale);

  return (
    <OrderData
      locale={locale}
      forceUnavailable={
        process.env.PLAYWRIGHT_STOREFRONT_PREVIEW === "1" &&
        orderConfig === "unavailable"
      }
    />
  );
}

async function OrderData({
  locale,
  forceUnavailable,
}: {
  locale: string;
  forceUnavailable: boolean;
}) {
  const preview = process.env.PLAYWRIGHT_STOREFRONT_PREVIEW === "1";
  const cafeInfo = forceUnavailable
    ? null
    : preview
      ? sampleCafeInfo
      : await getCafeInfo().catch(() => null);
  return (
    <OrderContent
      locale={locale}
      cafeInfo={cafeInfo}
      recoveryPhone={preview ? null : cafeInfo?.phone.trim() || null}
      availabilityRefreshDisabled={forceUnavailable}
    />
  );
}
