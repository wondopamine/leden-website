import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import { OrderStatus } from "@/components/order/order-status";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.status" });
  return {
    title: t("title"),
    description: t("description"),
    robots: { index: false, follow: false, noarchive: true },
    referrer: "no-referrer",
  };
}

export default function OrderStatusPage({ params }: Props) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <OrderStatus locale={locale} />;
}
