import Image from "next/image";
import { useTranslations } from "next-intl";
import { Stars } from "@/components/ui/stars";
import { FadeIn } from "@/components/fade-in";
import { ReviewMarquee } from "@/components/home/review-marquee";
import type { PlaceData } from "@/lib/google-places";

export function Reviews({ place }: { place: PlaceData }) {
  const t = useTranslations("landing.reviews");
  const reviews = place.reviews.slice(0, 8);

  return (
    <section className="relative overflow-hidden bg-forest-9 py-[var(--section-y-lg)] text-cream-1">
      <FadeIn>
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-5">
          <div>
            <h2 className="text-h1 text-cream-1">{t("title")}</h2>
            <p className="mt-2 text-body text-cream-1/70">{t("subtitle")}</p>
          </div>
          <a
            href={place.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cream-1/25 bg-cream-1/10 px-4 py-2 text-caption transition-colors hover:bg-cream-1/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream-1 focus-visible:ring-offset-2 focus-visible:ring-offset-forest-9"
          >
            <Image src="/google.svg" alt="Google" width={16} height={16} />
            <span className="font-semibold">{place.rating}</span>
            <Stars count={Math.round(place.rating)} size="sm" label={`${place.rating} / 5`} />
            <span className="text-cream-1/70">
              ({place.reviewCount}) {t("onGoogle")}
            </span>
          </a>
        </div>
      </FadeIn>

      <ReviewMarquee reviews={reviews} />
    </section>
  );
}
