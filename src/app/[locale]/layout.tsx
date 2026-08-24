import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { fetchCafeInfo } from "@/lib/data";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import { Toaster } from "@/components/ui/sonner";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const cafeInfo = await fetchCafeInfo();
  const t = await getTranslations("common");
  const announcement = cafeInfo.announcement;
  const announcementText = announcement
    ? (locale === "fr" ? announcement.fr : announcement.en)
    : null;

  return (
    <NextIntlClientProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-caption focus:font-medium focus:text-primary-foreground focus:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {t("skipToContent")}
      </a>
      {announcementText && <AnnouncementBanner text={announcementText} />}
      <Header />
      <main id="main" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <Footer locale={locale} info={cafeInfo} />
      <Toaster position="bottom-center" />
    </NextIntlClientProvider>
  );
}
