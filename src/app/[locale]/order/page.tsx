import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { OrderContent } from "@/components/order/order-content";

type Props = {
  params: Promise<{ locale: string }>;
};

export default function OrderPage({ params }: Props) {
  const { locale } = use(params);
  setRequestLocale(locale);

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <OrderContent locale={locale} />
    </section>
  );
}
