import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { fetchCafeInfo } from "@/lib/data";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";

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
  const announcement = cafeInfo.announcement;
  const announcementText = announcement
    ? (locale === "fr" ? announcement.fr : announcement.en)
    : null;

  return (
    <NextIntlClientProvider>
      {announcementText && <AnnouncementBanner text={announcementText} />}
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </NextIntlClientProvider>
  );
}
