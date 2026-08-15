import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/fade-in";
import { getItemImageUrl } from "@/lib/menu-images";
import { getLocalizedString, formatPrice } from "@/lib/utils/format";
import type { MenuItem } from "@/lib/types";

export function Featured({ locale, items }: { locale: string; items: MenuItem[] }) {
  const t = useTranslations("landing.featured");
  const tc = useTranslations("common");
  const tm = useTranslations("menu");

  const featured = items.filter((i) => i.status !== "hidden").slice(0, 6);
  if (featured.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 py-[var(--section-y)]">
      <FadeIn>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="text-h1">{t("title")}</h2>
            <p className="mt-2 text-body text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Button
            nativeButton={false}
            render={<Link href="/menu" />}
            variant="ghost"
            size="default"
            className="hidden rounded-full sm:inline-flex"
          >
            {tc("viewFullMenu")} <span aria-hidden>→</span>
          </Button>
        </div>
      </FadeIn>

      <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((item, i) => {
          const soldOut = item.status === "sold_out";
          return (
            <FadeIn as="li" key={item._id} delay={Math.min(i, 2) * 90}>
              <Link
                href="/menu"
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-[transform,box-shadow] duration-[var(--duration-base)] hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-cream-3">
                  <Image
                    src={getItemImageUrl(item)}
                    alt={getLocalizedString(item.name, locale)}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-[var(--duration-base)] group-hover:scale-[1.04]"
                  />
                  {soldOut && (
                    <div className="absolute inset-0 flex items-center justify-center bg-cream-1/70">
                      <Badge variant="secondary" className="text-caption">
                        {tm("soldOut")}
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-caption font-semibold text-primary">
                    {getLocalizedString(item.category.name, locale)}
                  </p>
                  <h3 className="mt-1.5 font-display text-h3 leading-tight text-forest-12">
                    {getLocalizedString(item.name, locale)}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-caption leading-snug text-muted-foreground">
                    {getLocalizedString(item.description, locale)}
                  </p>
                  <p className="mt-4 text-body font-semibold tabular-nums text-accent-text">
                    {formatPrice(item.price)}
                  </p>
                </div>
              </Link>
            </FadeIn>
          );
        })}
      </ul>

      <div className="mt-8 sm:hidden">
        <Button
          nativeButton={false}
          render={<Link href="/menu" />}
          variant="outline"
          size="lg"
          className="h-12 w-full rounded-full"
        >
          {tc("viewFullMenu")} <span aria-hidden>→</span>
        </Button>
      </div>
    </section>
  );
}
