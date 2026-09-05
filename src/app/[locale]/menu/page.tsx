import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use } from "react";
import { CircleAlert } from "lucide-react";
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
  const t = await getTranslations({ locale, namespace: "menu" });
  const menu = await loadMenu();
  if (menu) {
    return (
      <MenuContent
        categories={menu.categories}
        items={menu.items}
        locale={locale}
      />
    );
  }

  return (
    <div>
      <h1 className="text-h1">{t("title")}</h1>
      <div
        className="mt-6 flex items-start gap-3 rounded-2xl border border-accent-border bg-accent-surface p-5"
        role="status"
      >
        <CircleAlert
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-accent-text"
        />
        <div>
          <p className="font-medium text-accent-text">
            {t("unavailableTitle")}
          </p>
          <p className="mt-1 text-caption text-accent-text">
            {t("unavailableBody")}
          </p>
        </div>
      </div>
    </div>
  );
}

async function loadMenu() {
  try {
    const [categories, items] = await Promise.all([
      fetchCategories(),
      fetchMenuItems(),
    ]);
    return { categories, items };
  } catch {
    return null;
  }
}
