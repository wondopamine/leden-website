import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import { CircleAlert, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button-variants";
import { Watermelon } from "@/components/brand/watermelon";
import { getCafeInfo } from "@/lib/supabase/queries";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "metadata.confirmation",
  });
  return {
    title: t("title"),
    description: t("description"),
    robots: { index: false, follow: false },
  };
}

export default function ConfirmationPage({ params }: Props) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <LegacyConfirmation />;
}

async function LegacyConfirmation() {
  const t = await getTranslations("confirmation");
  const cafePhone = await getCafeInfo()
    .then((cafe) => cafe.phone.trim() || null)
    .catch(() => null);
  return (
    <section className="mx-auto max-w-lg px-5 py-14 sm:py-20">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <span className="flex size-16 items-center justify-center rounded-full bg-accent-surface text-accent-text">
            <CircleAlert aria-hidden className="size-8" />
          </span>
          <Watermelon
            size={40}
            className="absolute -right-4 -top-3 rotate-[18deg]"
          />
        </div>
        <h1 className="mt-5 font-display text-h1 text-forest-12">
          {t("legacyTitle")}
        </h1>
        <p className="mt-2 text-body text-muted-foreground">
          {t("legacyBody")}
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-5 text-center sm:p-6">
        <p className="text-caption text-muted-foreground">
          {t("legacyPrivacy")}
        </p>
        {cafePhone && (
          <a
            href={`tel:${cafePhone.replace(/[^+\d]/g, "")}`}
            className={buttonVariants({
              variant: "default",
              size: "lg",
              className: "mt-5 h-12 w-full rounded-full",
            })}
          >
            <Phone aria-hidden className="size-4" />
            {t("callCafe", { phone: cafePhone })}
          </a>
        )}
        <Link
          href="/menu"
          className={buttonVariants({
            variant: "outline",
            size: "lg",
            className: "mt-3 h-12 w-full rounded-full",
          })}
        >
          {t("backToMenu")}
        </Link>
      </div>
    </section>
  );
}
