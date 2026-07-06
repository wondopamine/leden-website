import { cn } from "@/lib/utils";

/**
 * Hand-drawn watermelon slice — the brand mascot, on-palette (forest rind,
 * cream pith, orange flesh, dark seeds). Accent role only: hero corner, footer,
 * confirmation, section dividers. Capped at 64px per the brand spec. Decorative
 * by default (aria-hidden); pass a `label` to announce it.
 */
export function Watermelon({
  size = 56,
  className,
  label,
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  const s = Math.min(size, 64);
  return (
    <svg
      width={s}
      height={(s * 44) / 64}
      viewBox="0 0 64 44"
      fill="none"
      className={cn("select-none", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* rind */}
      <path d="M2 8 A30 30 0 0 0 62 8 Z" fill="var(--forest-9)" />
      {/* pith */}
      <path d="M5.5 8 A26.5 26.5 0 0 0 58.5 8 Z" fill="var(--cream-1)" />
      {/* flesh */}
      <path d="M9 8 A23 23 0 0 0 55 8 Z" fill="var(--orange-9)" />
      {/* seeds */}
      <g fill="var(--forest-12)">
        <ellipse cx="22" cy="20" rx="1.3" ry="2.3" transform="rotate(-18 22 20)" />
        <ellipse cx="32" cy="24" rx="1.3" ry="2.3" />
        <ellipse cx="42" cy="20" rx="1.3" ry="2.3" transform="rotate(18 42 20)" />
        <ellipse cx="27" cy="30" rx="1.3" ry="2.3" transform="rotate(-10 27 30)" />
        <ellipse cx="37" cy="30" rx="1.3" ry="2.3" transform="rotate(10 37 30)" />
      </g>
      {/* hand-drawn rind outline + cut line */}
      <path
        d="M2 8 A30 30 0 0 0 62 8"
        stroke="var(--forest-12)"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path d="M3 8 H61" stroke="var(--forest-12)" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

/** A single watermelon seed — for list bullets and small accents. */
export function WatermelonSeed({ className, size = 10 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.5}
      viewBox="0 0 10 15"
      className={cn("inline-block shrink-0", className)}
      aria-hidden="true"
    >
      <ellipse cx="5" cy="7.5" rx="4" ry="6.5" fill="var(--forest-9)" />
    </svg>
  );
}

/**
 * Section divider: a hand-drawn rule with a small watermelon slice centered.
 * Functional wayfinding between homepage sections.
 */
export function WatermelonDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-4 text-forest-6", className)} aria-hidden="true">
      <span className="h-px w-16 bg-current sm:w-24" />
      <Watermelon size={34} />
      <span className="h-px w-16 bg-current sm:w-24" />
    </div>
  );
}
