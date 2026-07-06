import { useTranslations } from "next-intl";
import { FadeIn } from "@/components/fade-in";
import { Watermelon, WatermelonSeed } from "@/components/brand/watermelon";
import { Stars } from "@/components/ui/stars";
import type { PlaceData } from "@/lib/google-places";

export function Story({ place }: { place: PlaceData }) {
  const t = useTranslations("landing.about");

  return (
    <section id="about" className="scroll-mt-20 bg-cream-1 py-[var(--section-y-lg)]">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 md:grid-cols-[1.1fr_0.9fr] md:gap-16">
        <FadeIn>
          <h2 className="text-h1">{t("title")}</h2>
          <p className="mt-5 max-w-prose text-body leading-relaxed text-forest-11">
            {t("description")}
          </p>
          {/* quiet credential line — not a hero-metric block */}
          <p className="mt-6 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-caption text-muted-foreground">
            <span className="font-medium text-forest-11">Est. 1994</span>
            <span aria-hidden className="text-cream-7">&middot;</span>
            <span>Valois Village, Pointe-Claire</span>
            <span aria-hidden className="text-cream-7">&middot;</span>
            <span className="inline-flex items-center gap-1.5">
              <Stars count={Math.round(place.rating)} size="sm" />
              {place.rating} ({place.reviewCount})
            </span>
          </p>
        </FadeIn>

        {/* signature brand panel — a real ambient café photo can replace this later */}
        <FadeIn delay={120} direction="none">
          <div className="relative flex aspect-[4/5] flex-col items-center justify-center gap-5 overflow-hidden rounded-2xl border border-forest-6/40 bg-forest-2 p-8 text-center">
            <Watermelon size={64} className="drop-shadow-sm" />
            <p className="max-w-[10ch] font-display text-h2 leading-tight text-forest-11">
              {t("panel")}
            </p>
            <div className="flex items-center gap-2 text-forest-9">
              <WatermelonSeed size={8} />
              <WatermelonSeed size={8} />
              <WatermelonSeed size={8} />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
