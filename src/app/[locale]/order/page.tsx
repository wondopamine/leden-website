import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import { fetchCafeInfo } from "@/lib/data";
import { OrderContent } from "@/components/order/order-content";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.order" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function OrderPage({ params }: Props) {
  const { locale } = use(params);
  setRequestLocale(locale);

  return <OrderData locale={locale} />;
}

async function OrderData({ locale }: { locale: string }) {
  const cafeInfo = await fetchCafeInfo();
  return <OrderContent locale={locale} cafeInfo={cafeInfo} />;
}
