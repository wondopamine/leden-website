/**
 * Hand-drawn SVG doodle elements — cafe napkin aesthetic.
 * Scattered around the page with slight rotations and gentle animations.
 */

// Coffee cup doodle — wobbly hand-drawn style
export function DoodleCoffeeCup({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Cup body */}
      <path
        d="M18 28c-1 0-2 1-2 3l4 28c0.5 4 3 6 7 6h18c4 0 6.5-2 7-6l4-28c0-2-1-3-2-3z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Handle */}
      <path
        d="M54 34c4-1 8 1 9 5s-1 9-5 11"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Steam lines */}
      <path
        d="M28 22c0-4 4-6 2-11M37 20c0-5 3-7 1-12M46 22c0-4 4-6 2-11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Saucer */}
      <path
        d="M12 65c0 0 14 5 28 5s28-5 28-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}

// Heart doodle — slightly wobbly
export function DoodleHeart({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 50 50"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M25 43c-1-1-18-12-20-22C3 13 8 6 16 8c4 1 7 4 9 7 2-3 5-6 9-7 8-2 13 5 11 13-2 10-19 21-20 22z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.15"
      />
    </svg>
  );
}

// Star doodle — hand-drawn sparkle
export function DoodleStar({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M20 4l3 12 12 2-10 7 4 12-9-8-10 7 5-12L5 17l13-1z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.12"
      />
    </svg>
  );
}

// Squiggly arrow — pointing somewhere
export function DoodleArrow({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M8 28c10-8 25-16 40-15s30 5 40 0"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M82 7l8 7-10 4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// Croissant doodle
export function DoodleCroissant({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 70 50"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10 35c5-15 15-25 25-25s20 10 25 25c-8-5-17-8-25-8s-17 3-25 8z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.08"
      />
      {/* Croissant lines */}
      <path
        d="M22 28c3-8 8-14 13-14M35 14c5 0 10 6 13 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M28 31c2-5 5-8 7-8M35 23c2 0 5 3 7 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
}

// Underline scribble — goes under text
export function DoodleUnderline({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 20"
      fill="none"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path
        d="M3 12c30-6 60-8 95-6s70 4 99-2"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

// Circle/highlight scribble — goes around text
export function DoodleCircle({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 60"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <ellipse
        cx="60"
        cy="30"
        rx="55"
        ry="24"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="4 6"
        fill="none"
        transform="rotate(-2 60 30)"
      />
    </svg>
  );
}

// Leaf/plant doodle
export function DoodleLeaf({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 50 60"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M25 55V25c0-12 12-20 20-20C45 17 38 30 25 30"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="currentColor"
        fillOpacity="0.08"
      />
      <path
        d="M25 55V30c0-10-10-18-18-20C7 22 14 32 25 35"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="currentColor"
        fillOpacity="0.06"
      />
    </svg>
  );
}

// Sparkle cluster — small dots/stars
export function DoodleSparkles({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="20" cy="8" r="1.5" fill="currentColor" opacity="0.7" />
      <circle cx="10" cy="20" r="1" fill="currentColor" opacity="0.5" />
      <circle cx="30" cy="18" r="1.8" fill="currentColor" opacity="0.6" />
      <circle cx="15" cy="32" r="1.2" fill="currentColor" opacity="0.4" />
      <circle cx="28" cy="30" r="1" fill="currentColor" opacity="0.5" />
      <path
        d="M20 16l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  );
}

// Hand-drawn "yum!" text sticker
export function StickerYum({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border-2 border-dashed border-primary/40 bg-primary/8 px-3 py-1 ${className}`}
      aria-hidden="true"
    >
      <span className="text-sm font-bold text-primary" style={{ fontFamily: "var(--font-display)" }}>
        Yum!
      </span>
      <DoodleHeart className="h-3.5 w-3.5 text-primary" />
    </div>
  );
}

// Hand-drawn "fresh daily" sticker
export function StickerFreshDaily({ className = "", text = "Fresh daily" }: { className?: string; text?: string }) {
  return (
    <div
      className={`inline-flex rotate-[-3deg] items-center gap-1.5 rounded-lg border-2 border-dashed border-primary/30 bg-card px-3 py-1.5 shadow-sm ${className}`}
      aria-hidden="true"
    >
      <DoodleLeaf className="h-4 w-4 text-green-600/70" />
      <span className="text-xs font-semibold text-foreground/70">
        {text}
      </span>
    </div>
  );
}

// Hand-drawn "since 1994" stamp sticker
export function StickerSince1994({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex h-16 w-16 rotate-[8deg] items-center justify-center rounded-full border-[3px] border-primary/50 ${className}`}
      aria-hidden="true"
    >
      <div className="text-center leading-none">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-primary/70">
          Since
        </span>
        <span
          className="block text-lg font-bold text-primary"
          style={{ fontFamily: "var(--font-display)" }}
        >
          &lsquo;94
        </span>
      </div>
    </div>
  );
}
