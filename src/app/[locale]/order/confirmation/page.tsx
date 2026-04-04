import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@supabase/supabase-js";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ order?: string }>;
};

async function getOrderDetails(orderNumber: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("order_number", orderNumber)
    .single();

  return data;
}

export default function ConfirmationPage({ params, searchParams }: Props) {
  const { locale } = use(params);
  const { order } = use(searchParams);
  setRequestLocale(locale);

  return (
    <section className="mx-auto max-w-lg px-4 py-20">
      {order ? (
        <ConfirmationContent orderNumber={order} locale={locale} />
      ) : (
        <FallbackContent />
      )}
    </section>
  );
}

async function ConfirmationContent({ orderNumber, locale }: { orderNumber: string; locale: string }) {
  const t = useTranslations("confirmation");
  const order = await getOrderDetails(orderNumber);

  const pickupDisplay = order?.pickup_time
    ? new Date(order.pickup_time).toLocaleTimeString(locale === "fr" ? "fr-CA" : "en-CA", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : t("asap");

  return (
    <>
      <div className="text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
          &#10003;
        </div>
        <h1 className="mt-4 text-3xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{t("thankYou")}</p>
      </div>

      <Card className="mt-8">
        <CardContent className="space-y-4 p-6">
          <div>
            <p className="text-sm text-muted-foreground">{t("orderNumber")}</p>
            <p className="font-mono text-lg font-bold">{orderNumber}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">{t("pickupTime")}</p>
            <p className="font-semibold">{pickupDisplay}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">{t("pickupAt")}</p>
            <p className="font-semibold">{order?.locale === "fr" ? "121 Donegani, Pointe-Claire, QC" : "121 Donegani, Pointe-Claire, QC"}</p>
          </div>

          {order?.order_items && order.order_items.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">{t("items")}</p>
                <div className="space-y-2">
                  {order.order_items.map((item: { id: string; menu_item_name: string; quantity: number; price: number; modifiers: { name: string; option: string }[] }) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.quantity}x {item.menu_item_name}
                        {item.modifiers?.length > 0 && (
                          <span className="text-muted-foreground">
                            {" "}({item.modifiers.map((m) => m.option).join(", ")})
                          </span>
                        )}
                      </span>
                      <span className="font-medium">${(Number(item.price) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("subtotal")}</span>
                  <span>${Number(order.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST</span>
                  <span>${Number(order.tax_gst).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">QST</span>
                  <span>${Number(order.tax_qst).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-1">
                  <span>{t("total")}</span>
                  <span>${Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            </>
          )}

          <p className="text-sm text-muted-foreground">{t("paymentNote")}</p>
        </CardContent>
      </Card>

      <div className="mt-8 text-center">
        <Link href="/menu">
          <Button variant="outline">{t("backToMenu")}</Button>
        </Link>
      </div>
    </>
  );
}

function FallbackContent() {
  const t = useTranslations("confirmation");
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("thankYou")}</p>
      <Link href="/menu" className="mt-8 inline-block">
        <Button variant="outline">{t("backToMenu")}</Button>
      </Link>
    </div>
  );
}
