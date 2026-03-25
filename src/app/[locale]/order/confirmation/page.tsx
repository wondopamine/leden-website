import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ order?: string }>;
};

export default function ConfirmationPage({ params, searchParams }: Props) {
  const { locale } = use(params);
  const { order } = use(searchParams);
  setRequestLocale(locale);
  const t = useTranslations("confirmation");

  return (
    <section className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="text-5xl">&#10003;</div>
      <h1 className="mt-4 text-3xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-lg text-muted-foreground">{t("thankYou")}</p>

      <Card className="mt-8 text-left">
        <CardContent className="space-y-4 p-6">
          {order && (
            <div>
              <p className="text-sm text-muted-foreground">{t("orderNumber")}</p>
              <p className="font-mono text-lg font-bold">{order}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">{t("pickupAt")}</p>
            <p className="font-semibold">121 Donegani, Pointe-Claire, QC</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("paymentNote")}</p>
          </div>
        </CardContent>
      </Card>

      <Link href="/menu" className="mt-8 inline-block">
        <Button variant="outline">{t("backToMenu")}</Button>
      </Link>
    </section>
  );
}
