/**
 * Bold character stickers — superr.ai style.
 * Solid fills, thick black outlines, vibrant colors, cute faces.
 * Cafe-themed: coffee cup character, croissant creature, heart, star, leaf.
 */

// Happy coffee cup character — orange fill, big eyes, steam
export function StickerCoffee({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 95" fill="none" className={className} aria-hidden="true">
      {/* Body outline */}
      <path d="M20 30c-2 0-4 2-3 5l6 35c1 6 5 9 11 9h22c6 0 10-3 11-9l6-35c1-3-1-5-3-5z" fill="black" />
      {/* Body fill */}
      <path d="M23 33c-1 0-2 1-2 3l5 32c1 5 4 7 9 7h20c5 0 8-2 9-7l5-32c0-2-1-3-2-3z" fill="#F97316" />
      {/* Handle */}
      <path d="M70 38c5-1 10 2 11 7s-1 11-6 14" stroke="black" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M70 40c4-1 8 1 9 5s-1 9-5 11" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Left eye */}
      <ellipse cx="36" cy="48" rx="6" ry="7" fill="white" />
      <ellipse cx="37" cy="49" rx="3.5" ry="4" fill="black" />
      <circle cx="35.5" cy="47" r="1.5" fill="white" />
      {/* Right eye */}
      <ellipse cx="54" cy="48" rx="6" ry="7" fill="white" />
      <ellipse cx="55" cy="49" rx="3.5" ry="4" fill="black" />
      <circle cx="53.5" cy="47" r="1.5" fill="white" />
      {/* Smile */}
      <path d="M38 58c2 4 6 6 10 6s8-2 10-6" stroke="black" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Cheeks */}
      <circle cx="31" cy="55" r="3" fill="#FDBA74" opacity="0.7" />
      <circle cx="59" cy="55" r="3" fill="#FDBA74" opacity="0.7" />
      {/* Steam */}
      <path d="M35 24c0-5 5-7 3-13" stroke="black" strokeWidth="3" strokeLinecap="round" />
      <path d="M45 22c0-6 4-8 2-14" stroke="black" strokeWidth="3" strokeLinecap="round" />
      <path d="M55 24c0-5 5-7 3-13" stroke="black" strokeWidth="3" strokeLinecap="round" />
      {/* Saucer */}
      <path d="M14 82c0 0 16 7 31 7s31-7 31-7" stroke="black" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// Croissant creature — yellow fill, happy face
export function StickerCroissant({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 70" fill="none" className={className} aria-hidden="true">
      {/* Outer shape */}
      <path d="M8 48c6-20 18-35 37-35s31 15 37 35c-10-7-22-11-37-11s-27 4-37 11z" fill="black" />
      {/* Inner fill */}
      <path d="M12 46c5-17 16-30 33-30s28 13 33 30c-9-6-20-9-33-9s-24 3-33 9z" fill="#FBBF24" />
      {/* Layer lines */}
      <path d="M28 38c4-10 10-17 17-17" stroke="black" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <path d="M45 21c7 0 13 7 17 17" stroke="black" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <path d="M34 41c3-6 6-10 11-10" stroke="black" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
      <path d="M45 31c5 0 8 4 11 10" stroke="black" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
      {/* Eyes */}
      <ellipse cx="37" cy="36" rx="4" ry="4.5" fill="white" />
      <ellipse cx="38" cy="37" rx="2.5" ry="3" fill="black" />
      <circle cx="36.5" cy="35.5" r="1" fill="white" />
      <ellipse cx="53" cy="36" rx="4" ry="4.5" fill="white" />
      <ellipse cx="54" cy="37" rx="2.5" ry="3" fill="black" />
      <circle cx="52.5" cy="35.5" r="1" fill="white" />
      {/* Smile */}
      <path d="M40 43c1 3 3 4 5 4s4-1 5-4" stroke="black" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Cheeks */}
      <circle cx="33" cy="41" r="2.5" fill="#FDE68A" opacity="0.8" />
      <circle cx="57" cy="41" r="2.5" fill="#FDE68A" opacity="0.8" />
    </svg>
  );
}

// Heart character — red fill, cute face
export function StickerHeart({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
      {/* Outer */}
      <path d="M40 72c-2-2-30-18-33-34C4 24 12 12 24 15c5 1 10 5 13 10 3-5 8-9 13-10 12-3 20 9 17 23-3 16-31 32-33 34z" fill="black" />
      {/* Inner fill */}
      <path d="M40 68c-1-1-26-16-29-30C8 26 15 16 25 18c4 1 9 4 11 9 2-5 7-8 11-9 10-2 17 8 15 20-3 14-23 28-25 30z" fill="#EF4444" />
      {/* Eyes */}
      <ellipse cx="32" cy="37" rx="4" ry="4.5" fill="white" />
      <ellipse cx="33" cy="38" rx="2.5" ry="3" fill="black" />
      <circle cx="31.5" cy="36" r="1" fill="white" />
      <ellipse cx="48" cy="37" rx="4" ry="4.5" fill="white" />
      <ellipse cx="49" cy="38" rx="2.5" ry="3" fill="black" />
      <circle cx="47.5" cy="36" r="1" fill="white" />
      {/* Smile */}
      <path d="M35 45c1 3 3 5 5 5s4-2 5-5" stroke="black" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Cheeks */}
      <circle cx="28" cy="43" r="2.5" fill="#FCA5A5" opacity="0.7" />
      <circle cx="52" cy="43" r="2.5" fill="#FCA5A5" opacity="0.7" />
    </svg>
  );
}

// Star character — green fill, happy face
export function StickerStar({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
      {/* Outer */}
      <path d="M40 4l9 22h23l-18 14 7 22-21-14-21 14 7-22L8 26h23z" fill="black" />
      {/* Inner fill */}
      <path d="M40 10l7 18h19l-15 12 6 18-17-12-17 12 6-18L14 28h19z" fill="#B1EA48" />
      {/* Eyes */}
      <ellipse cx="34" cy="38" rx="3.5" ry="4" fill="white" />
      <ellipse cx="35" cy="39" rx="2.2" ry="2.5" fill="black" />
      <circle cx="33.5" cy="37.5" r="1" fill="white" />
      <ellipse cx="46" cy="38" rx="3.5" ry="4" fill="white" />
      <ellipse cx="47" cy="39" rx="2.2" ry="2.5" fill="black" />
      <circle cx="45.5" cy="37.5" r="1" fill="white" />
      {/* Smile */}
      <path d="M37 46c1 2 2 3 3 3s2-1 3-3" stroke="black" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// Leaf/sprout character — teal fill
export function StickerLeaf({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 80" fill="none" className={className} aria-hidden="true">
      {/* Stem */}
      <path d="M30 78V50" stroke="black" strokeWidth="4" strokeLinecap="round" />
      {/* Right leaf outer */}
      <path d="M30 50c0-18 18-28 26-28C56 38 44 52 30 52" fill="black" />
      {/* Right leaf fill */}
      <path d="M32 48c0-15 15-24 22-24C54 38 43 49 32 49" fill="#10B981" />
      {/* Left leaf outer */}
      <path d="M30 55c0-14-14-22-22-24C8 43 18 57 30 58" fill="black" />
      {/* Left leaf fill */}
      <path d="M28 53c0-12-12-19-19-20C9 43 17 54 28 55" fill="#34D399" />
      {/* Eyes */}
      <ellipse cx="23" cy="62" rx="3" ry="3.5" fill="white" />
      <ellipse cx="24" cy="63" rx="2" ry="2.2" fill="black" />
      <circle cx="22.5" cy="61.5" r="0.8" fill="white" />
      <ellipse cx="37" cy="62" rx="3" ry="3.5" fill="white" />
      <ellipse cx="38" cy="63" rx="2" ry="2.2" fill="black" />
      <circle cx="36.5" cy="61.5" r="0.8" fill="white" />
      {/* Smile */}
      <path d="M27 68c1 2 2 2 3 2s2 0 3-2" stroke="black" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Pot */}
      <path d="M20 72h20l-2 8H22z" fill="black" />
      <path d="M21 73h18l-1.5 6H23z" fill="#F97316" />
    </svg>
  );
}

// Soup bowl character — purple fill
export function StickerSoup({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 80" fill="none" className={className} aria-hidden="true">
      {/* Bowl outer */}
      <path d="M10 35h70l-8 30c-1 5-5 8-10 8H28c-5 0-9-3-10-8z" fill="black" />
      {/* Bowl fill */}
      <path d="M14 38h62l-7 27c-1 4-4 6-8 6H29c-4 0-7-2-8-6z" fill="#8B5CF6" />
      {/* Rim */}
      <rect x="6" y="32" width="78" height="6" rx="3" fill="black" />
      <rect x="8" y="33" width="74" height="4" rx="2" fill="#A78BFA" />
      {/* Eyes */}
      <ellipse cx="35" cy="48" rx="5" ry="5.5" fill="white" />
      <ellipse cx="36" cy="49" rx="3" ry="3.5" fill="black" />
      <circle cx="34.5" cy="47" r="1.2" fill="white" />
      <ellipse cx="55" cy="48" rx="5" ry="5.5" fill="white" />
      <ellipse cx="56" cy="49" rx="3" ry="3.5" fill="black" />
      <circle cx="54.5" cy="47" r="1.2" fill="white" />
      {/* Smile */}
      <path d="M39 56c2 3 4 5 6 5s4-2 6-5" stroke="black" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Steam */}
      <path d="M32 26c0-4 4-6 2-10" stroke="black" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M45 24c0-5 3-7 1-11" stroke="black" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M58 26c0-4 4-6 2-10" stroke="black" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
