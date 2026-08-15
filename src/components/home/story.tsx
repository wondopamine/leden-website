import { useTranslations } from "next-intl";
import { FadeIn } from "@/components/fade-in";
import { Stars } from "@/components/ui/stars";
import type { PlaceData } from "@/lib/google-places";

export function Story({ place }: { place: PlaceData }) {
  const t = useTranslations("landing.about");

  return (
    <section id="about" className="scroll-mt-20 bg-card py-[var(--section-y-lg)]">
      <div className="mx-auto grid max-w-6xl items-end gap-10 px-5 md:grid-cols-[1.2fr_0.8fr] md:gap-16">
        <FadeIn>
          <h2 className="text-h1">{t("title")}</h2>
          <p className="mt-5 max-w-2xl text-pretty text-h3 font-medium leading-relaxed text-foreground">
            {t("description")}
          </p>
        </FadeIn>

        <FadeIn delay={120}>
          <div className="rounded-2xl border border-border bg-background p-6 sm:p-8">
            <p className="font-display text-display leading-none text-primary">1994</p>
            <p className="mt-2 text-caption font-semibold text-muted-foreground">
              Valois Village, Pointe-Claire
            </p>
            <div className="mt-8 border-t border-border pt-5">
              <div className="flex items-center gap-2">
                <Stars count={Math.round(place.rating)} size="md" />
                <span className="font-semibold tabular-nums text-foreground">
                  {place.rating}/5
                </span>
              </div>
              <p className="mt-1 text-caption tabular-nums text-muted-foreground">
                Google · {place.reviewCount}
              </p>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
