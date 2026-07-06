import { useTranslations } from "next-intl";
import { MapPin, Phone, Navigation } from "lucide-react";
import { FadeIn } from "@/components/fade-in";
import { OpenStatusPill } from "@/components/brand/open-status";
import { getOpenStatus, getCafeWeekday, formatTime, formatStatusLabel, type DayHours } from "@/lib/hours";
import type { CafeInfo } from "@/lib/types";

export function Visit({ locale, info }: { locale: string; info: CafeInfo }) {
  const t = useTranslations("landing.hours");
  const tc = useTranslations("common");
  const status = getOpenStatus(info.hours);
  const today = getCafeWeekday();
  const statusLabel = formatStatusLabel(status, tc, locale);

  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.address)}`;
  const telHref = info.phone ? `tel:${info.phone.replace(/[^\d+]/g, "")}` : undefined;

  const actionClass =
    "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-cream-6 bg-card px-5 text-caption font-medium text-forest-11 transition-colors hover:border-forest-8 hover:text-forest-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <section className="mx-auto max-w-6xl px-5 py-[var(--section-y)]">
      <FadeIn>
        <h2 className="text-center text-h1">{t("title")}</h2>
      </FadeIn>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {/* Hours */}
        <FadeIn>
          <div className="h-full rounded-2xl border border-cream-6 bg-card p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-label uppercase tracking-wide text-muted-foreground">
                {t("openDaily")}
              </h3>
              <OpenStatusPill isOpen={status.isOpen} label={statusLabel} />
            </div>
            <ul className="mt-5 space-y-1">
              {(info.hours as DayHours[]).map((h) => {
                const isToday = h.day === today;
                return (
                  <li
                    key={h.day}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-caption tabular-nums ${
                      isToday
                        ? "bg-forest-2 font-semibold text-forest-12"
                        : "text-muted-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {isToday && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-forest-9" />}
                      {tc(`daysShort.${h.day}`)}
                    </span>
                    <span>
                      {h.closed ? t("closed") : `${formatTime(h.open, locale)} – ${formatTime(h.close, locale)}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </FadeIn>

        {/* Find us */}
        <FadeIn delay={120}>
          <div className="flex h-full flex-col justify-between rounded-2xl border border-cream-6 bg-card p-6 sm:p-8">
            <div>
              <h3 className="text-label uppercase tracking-wide text-muted-foreground">
                {t("findUs")}
              </h3>
              <p className="mt-4 flex items-start gap-2 text-h3 font-medium text-forest-12">
                <MapPin aria-hidden className="mt-1 size-5 shrink-0 text-forest-9" />
                {info.address}
              </p>
              {info.phone && (
                <p className="mt-3 pl-7 text-body text-muted-foreground">{info.phone}</p>
              )}
            </div>
            <div className="mt-8 flex flex-wrap gap-2.5">
              {telHref && (
                <a href={telHref} className={actionClass}>
                  <Phone aria-hidden className="size-4" /> {tc("callUs")}
                </a>
              )}
              <a href={mapsHref} target="_blank" rel="noopener noreferrer" className={actionClass}>
                <Navigation aria-hidden className="size-4" /> {tc("directions")}
              </a>
              <a href="https://www.instagram.com/cafe.le.den/" target="_blank" rel="noopener noreferrer" className={actionClass}>
                Instagram
              </a>
              <a href="https://www.facebook.com/cafeleden/" target="_blank" rel="noopener noreferrer" className={actionClass}>
                Facebook
              </a>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
