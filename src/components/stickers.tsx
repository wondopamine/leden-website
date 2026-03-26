/**
 * Hand-drawn stickers matching the Cafe Le Den logo style.
 * Dark forest green + terracotta/burnt orange palette.
 * Organic, slightly imperfect shapes — coffee beans, leaves, steam, bread.
 * No cartoon faces — warm, artisanal, European cafe aesthetic.
 */

const GREEN = "#2D5A3D";
const GREEN_LIGHT = "#3D7A52";
const TERRA = "#C85A3A";
const TERRA_LIGHT = "#D97B5A";
const CREAM = "#F5E6D3";

// Coffee bean — matching the logo accent beans
export function StickerCoffee({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 70" fill="none" className={className} aria-hidden="true">
      {/* Bean shape */}
      <ellipse cx="30" cy="35" rx="22" ry="28" fill={TERRA} transform="rotate(-8 30 35)" />
      {/* Highlight */}
      <ellipse cx="26" cy="28" rx="8" ry="12" fill={TERRA_LIGHT} opacity="0.5" transform="rotate(-12 26 28)" />
      {/* Center crease */}
      <path d="M28 12c-4 8-5 18-3 28s6 16 8 18" stroke={GREEN} strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Shine */}
      <path d="M22 20c1-2 3-3 5-2" stroke={CREAM} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

// Small coffee bean — for scattered decoration
export function StickerBeanSmall({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 50" fill="none" className={className} aria-hidden="true">
      <ellipse cx="20" cy="25" rx="14" ry="19" fill={TERRA} transform="rotate(12 20 25)" />
      <ellipse cx="17" cy="20" rx="5" ry="8" fill={TERRA_LIGHT} opacity="0.4" transform="rotate(8 17 20)" />
      <path d="M19 10c-3 6-3 14-1 22s4 10 5 11" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// Croissant — hand-drawn organic style
export function StickerCroissant({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 55" fill="none" className={className} aria-hidden="true">
      {/* Main croissant body */}
      <path
        d="M8 38c2-6 8-16 18-22s18-8 19-7c1 1-2 5-1 12s5 15 8 18c-8 2-18 4-28 4s-14-2-16-5z"
        fill="#E8A848"
      />
      {/* Right horn */}
      <path d="M52 39c3 3 10 6 18 5s12-5 13-8c-6 2-14 0-20-3s-9-6-11-6" fill="#D4923A" />
      {/* Left horn */}
      <path d="M8 38c-3 1-6 0-7-3s1-8 4-11c0 5 1 9 3 14z" fill="#D4923A" />
      {/* Layer lines */}
      <path d="M14 34c6-10 14-18 24-22" stroke="#C07830" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <path d="M18 36c5-8 12-14 20-18" stroke="#C07830" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <path d="M24 37c4-5 8-10 14-13" stroke="#C07830" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      {/* Highlight */}
      <path d="M20 26c3-4 8-8 14-10" stroke={CREAM} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

// Leaf/sprout — organic hand-drawn
export function StickerLeaf({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 50 65" fill="none" className={className} aria-hidden="true">
      {/* Stem */}
      <path d="M25 62c0-8-2-16 0-24s6-14 10-18" stroke={GREEN} strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Main leaf */}
      <path d="M25 38c-12-2-20-10-20-20C18 18 28 28 30 38c-1 0-3 0-5 0z" fill={GREEN} />
      <path d="M25 38c10-4 16-14 14-24C28 18 24 28 23 38c1 0 1 0 2 0z" fill={GREEN_LIGHT} />
      {/* Leaf vein */}
      <path d="M10 22c5 2 10 8 15 16" stroke={GREEN_LIGHT} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* Small leaf */}
      <path d="M28 48c6-1 10-5 10-10-5 2-9 6-10 10z" fill={GREEN} opacity="0.7" />
    </svg>
  );
}

// Steam wisps — for above cups
export function StickerSteam({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 50" fill="none" className={className} aria-hidden="true">
      <path d="M12 45c0-8 6-10 4-18s4-10 6-16" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      <path d="M22 42c0-7 5-9 3-16s3-9 5-14" stroke={GREEN} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <path d="M30 44c0-6 4-8 2-14s3-8 4-12" stroke={TERRA} strokeWidth="2" strokeLinecap="round" opacity="0.25" />
    </svg>
  );
}

// Bread loaf — hand-drawn artisanal
export function StickerBread({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 70 50" fill="none" className={className} aria-hidden="true">
      {/* Loaf body */}
      <path d="M8 38c-2-4-1-10 4-16s16-12 26-12 20 4 24 10 2 12-2 16c-6 2-18 4-30 4s-20-1-22-2z" fill="#D4923A" />
      {/* Top crust */}
      <path d="M12 22c6-8 16-12 26-12s18 4 22 10" stroke="#B07828" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Score marks */}
      <path d="M22 18c2 6 2 14 0 18" stroke="#C07830" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M36 15c1 6 1 16-1 22" stroke="#C07830" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M48 18c1 5 0 12-2 17" stroke="#C07830" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      {/* Highlight */}
      <path d="M18 24c4-3 10-5 16-5" stroke={CREAM} strokeWidth="2" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

// Coffee cup silhouette — simple, hand-drawn
export function StickerCup({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 70" fill="none" className={className} aria-hidden="true">
      {/* Cup body */}
      <path d="M12 24h36l-4 32c-1 4-4 7-8 7H24c-4 0-7-3-8-7z" fill={GREEN} />
      {/* Handle */}
      <path d="M48 30c5 0 9 3 9 8s-4 8-9 8" stroke={GREEN} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      {/* Liquid line */}
      <path d="M16 32h28" stroke={TERRA} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      {/* Highlight */}
      <path d="M18 36c0 8 1 16 3 22" stroke={GREEN_LIGHT} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      {/* Steam */}
      <path d="M24 18c0-4 3-5 2-10" stroke={GREEN} strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <path d="M32 16c0-5 3-6 1-11" stroke={GREEN} strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <path d="M40 18c0-4 3-5 2-10" stroke={GREEN} strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      {/* Saucer */}
      <path d="M6 66c8 4 18 5 24 5s16-1 24-5" stroke={GREEN} strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}
