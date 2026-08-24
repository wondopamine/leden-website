import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import { fetchCategories, fetchMenuItems } from "@/lib/data";
import { MenuContent } from "@/components/menu/menu-content";
import { StickyOrderBar } from "@/components/home/sticky-order-bar";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.menu" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function MenuPage({ params }: Props) {
  const { locale } = use(params);
  setRequestLocale(locale);

  return (
    <>
      <section className="mx-auto max-w-5xl px-5 pb-28 pt-10 md:pb-16">
        <MenuData locale={locale} />
      </section>
      <StickyOrderBar hideWhenEmpty />
    </>
  );
}

async function MenuData({ locale }: { locale: string }) {
  const [categories, items] = await Promise.all([
    fetchCategories(),
    fetchMenuItems(),
  ]);

  return <MenuContent categories={categories} items={items} locale={locale} />;
}
