import Image from "next/image";
import { useTranslations } from "next-intl";
import { MapPin, Navigation } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Watermelon } from "@/components/brand/watermelon";
import { OpenStatusPill } from "@/components/brand/open-status";
import { getOpenStatus, formatStatusLabel } from "@/lib/hours";
import type { CafeInfo } from "@/lib/types";

export function Footer({ locale, info }: { locale: string; info: CafeInfo }) {
  const t = useTranslations("footer");
  const tc = useTranslations("common");
  const status = getOpenStatus(info.hours);
  const year = new Date().getFullYear();
  const statusLabel = formatStatusLabel(status, tc, locale);

  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.address)}`;
  const links = [
    { href: "/", label: tc("home") },
    { href: "/menu", label: tc("menu") },
    { href: "/order", label: tc("orderForPickup") },
  ] as const;

  return (
    <footer className="border-t border-cream-6 bg-cream-1 pb-[max(5rem,env(safe-area-inset-bottom))] md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr]">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-3">
            <Image src="/logo-header.png" alt="Café Le Den" width={160} height={48} className="h-11 w-auto" />
            <Watermelon size={40} />
          </div>
          <p className="mt-4 max-w-xs text-caption text-muted-foreground">{t("madeWith")}</p>
        </div>

        {/* Quick links */}
        <nav aria-label="Footer" className="flex flex-col gap-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="w-fit text-body text-forest-11 transition-colors hover:text-orange-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-cream-1"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Visit */}
        <div className="flex flex-col items-start gap-3">
          <OpenStatusPill isOpen={status.isOpen} label={statusLabel} />
          <p className="flex items-start gap-2 text-caption text-muted-foreground">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-forest-9" />
            {info.address}
          </p>
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-caption font-medium text-forest-11 transition-colors hover:text-orange-11"
          >
            <Navigation aria-hidden className="size-4" /> {tc("directions")}
          </a>
        </div>
      </div>

      <div className="border-t border-cream-6/70">
        <p className="mx-auto max-w-6xl px-5 py-5 text-center text-label text-muted-foreground">
          &copy; {year} Café Le Den. {t("rights")}
        </p>
      </div>
    </footer>
  );
}
