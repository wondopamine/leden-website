import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { fetchCafeInfo } from "@/lib/data";
import { OrderContent } from "@/components/order/order-content";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default function OrderPage({ params }: Props) {
  const { locale } = use(params);
  setRequestLocale(locale);

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <OrderData locale={locale} />
    </section>
  );
}

async function OrderData({ locale }: { locale: string }) {
  const cafeInfo = await fetchCafeInfo();
  return <OrderContent locale={locale} cafeInfo={cafeInfo} />;
}
