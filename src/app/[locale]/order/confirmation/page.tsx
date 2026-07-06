import { setRequestLocale, getTranslations } from "next-intl/server";
import { use } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Watermelon } from "@/components/brand/watermelon";
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
    <section className="mx-auto max-w-lg px-5 py-20">
      {order ? <ConfirmationContent orderNumber={order} locale={locale} /> : <FallbackContent />}
    </section>
  );
}

function SuccessHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative">
        <span className="flex size-16 items-center justify-center rounded-full bg-forest-9 text-cream-1">
          <Check aria-hidden className="size-8" strokeWidth={2.5} />
        </span>
        <Watermelon size={40} className="absolute -right-4 -top-3 rotate-[18deg]" />
      </div>
      <h1 className="mt-5 font-display text-h1 text-forest-12">{title}</h1>
      <p className="mt-2 text-body text-muted-foreground">{subtitle}</p>
    </div>
  );
}

async function ConfirmationContent({ orderNumber, locale }: { orderNumber: string; locale: string }) {
  const t = await getTranslations("confirmation");
  const order = await getOrderDetails(orderNumber);

  const pickupDisplay = order?.pickup_time
    ? new Date(order.pickup_time).toLocaleTimeString(locale === "fr" ? "fr-CA" : "en-CA", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : t("asap");

  return (
    <>
      <SuccessHeader title={t("title")} subtitle={t("thankYou")} />

      <div className="mt-8 rounded-2xl border border-cream-6 bg-card p-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("orderNumber")}>
            <span className="font-mono text-body font-bold text-forest-12">{orderNumber}</span>
          </Field>
          <Field label={t("pickupTime")}>
            <span className="text-body font-semibold text-forest-12">{pickupDisplay}</span>
          </Field>
        </div>
        <Field label={t("pickupAt")} className="mt-4">
          <span className="text-body font-semibold text-forest-12">121 Donegani, Pointe-Claire, QC</span>
        </Field>

        {order?.order_items && order.order_items.length > 0 && (
          <>
            <Separator className="my-5" />
            <p className="mb-2 text-label uppercase tracking-wide text-muted-foreground">{t("items")}</p>
            <div className="space-y-2">
              {order.order_items.map(
                (item: {
                  id: string;
                  menu_item_name: string;
                  quantity: number;
                  price: number;
                  modifiers: { name: string; option: string }[];
                }) => (
                  <div key={item.id} className="flex justify-between gap-3 text-caption">
                    <span className="text-forest-12">
                      {item.quantity}× {item.menu_item_name}
                      {item.modifiers?.length > 0 && (
                        <span className="text-muted-foreground"> ({item.modifiers.map((m) => m.option).join(", ")})</span>
                      )}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-forest-12">
                      ${(Number(item.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                )
              )}
            </div>

            <Separator className="my-5" />
            <div className="space-y-1 text-caption">
              <SummaryRow label={t("subtotal")} value={`$${Number(order.subtotal).toFixed(2)}`} muted />
              <SummaryRow label="GST" value={`$${Number(order.tax_gst).toFixed(2)}`} muted />
              <SummaryRow label="QST" value={`$${Number(order.tax_qst).toFixed(2)}`} muted />
              <div className="flex justify-between pt-1 text-body font-bold text-forest-12">
                <span>{t("total")}</span>
                <span className="tabular-nums">${Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          </>
        )}

        <p className="mt-5 text-caption text-muted-foreground">{t("paymentNote")}</p>
      </div>

      <div className="mt-8 text-center">
        <Link href="/menu">
          <Button variant="outline" size="lg" className="h-12 rounded-full px-8">
            {t("backToMenu")}
          </Button>
        </Link>
      </div>
    </>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-label uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1">{children}</p>
    </div>
  );
}

function SummaryRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted-foreground" : "text-forest-12"}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function FallbackContent() {
  const t = useTranslations("confirmation");
  return (
    <>
      <SuccessHeader title={t("title")} subtitle={t("thankYou")} />
      <div className="mt-8 text-center">
        <Link href="/menu">
          <Button variant="outline" size="lg" className="h-12 rounded-full px-8">
            {t("backToMenu")}
          </Button>
        </Link>
      </div>
    </>
  );
}
