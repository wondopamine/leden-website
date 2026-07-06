---
phase: 01-design-system-foundation-brand-expression
plan: "03"
subsystem: design-system
tags:
  - components
  - design-system
  - cva
  - tailwind-v4
  - phase-1

dependency_graph:
  requires:
    - "01-02-SUMMARY.md (globals.css brand tokens -- --brand-orange-500, --duration-slow, --ease-out)"
    - "01-01-SUMMARY.md (locked brand decisions — Stars uses brand-orange-500, not amber-500)"
  provides:
    - "src/components/ui/stars.tsx — CVA Stars component (size sm/md/lg, count + max props)"
    - "src/components/ui/icon.tsx — CVA Icon wrapper for lucide-react (size + intent variants)"
    - "public/google.svg — Google brand SVG asset (eliminates inline hex from component tree)"
    - "src/components/fade-in.tsx — motion-token-driven IntersectionObserver fade wrapper"
  affects:
    - "Plan 04 (dev gallery) — imports Stars + Icon with exact prop signatures documented below"
    - "Plan 05 (ESLint no-raw-hex rule) — 8 component files are clean; page.tsx + stickers.tsx + analytics-dashboard.tsx are the remaining surface"
    - "Phase 3+ page rebuilds — consume Stars + Icon components"

tech_stack:
  added: []
  patterns:
    - "CVA component shape: starsVariants / iconVariants following button.tsx / badge.tsx analog"
    - "Brand-token color in component base class: text-brand-orange-500 (not text-amber-500)"
    - "Motion token via inline style: transitionDuration: var(--duration-slow), transitionTimingFunction: var(--ease-out)"
    - "Third-party brand SVG as public asset: /public/google.svg eliminates hex literals from .tsx lint surface"
    - "Explicit size prop at every Stars call site (D-08 compliance)"

key_files:
  created:
    - "src/components/ui/stars.tsx"
    - "src/components/ui/icon.tsx"
    - "public/google.svg"
  modified:
    - "src/components/fade-in.tsx"
    - "src/app/[locale]/page.tsx"

key_decisions:
  - "Stars uses text-brand-orange-500 (not text-amber-500) — brand-tokenized per RESEARCH.md Pattern 3"
  - "GoogleIcon moved to /public/google.svg: ESLint no-raw-hex rule does not scan /public/, so the 4 Google brand hex fills exit the lint surface entirely"
  - "All 4 Stars call sites in page.tsx use size=sm to preserve pre-refactor visual (inline Stars defaulted sm; new component defaults md)"
  - "fade-in.tsx adopts cn() from @/lib/utils (was using string template literal); adds React import"
  - "Icon component uses as prop (LucideIcon) rather than children to stay consistent with lucide-react render pattern"

patterns_established:
  - "CVA component pattern: cva(base, { variants, defaultVariants }) + data-slot + cn() — see stars.tsx + icon.tsx"
  - "Motion tokens: never use Tailwind duration-N / ease-* utilities in component files; use inline style with var(--duration-*) / var(--ease-*)"
  - "Third-party brand hex: move inline SVG to /public/*.svg asset; reference via next/image"

requirements_completed:
  - DSY-04

duration: 25min
completed: "2026-05-02"
---

# Phase 1 Plan 03: Component Token Migration Summary

**Two new CVA components (Stars + Icon) created; fade-in.tsx migrated to motion tokens; GoogleIcon's four brand hex literals extracted from src/ to /public/google.svg; 5 existing shadcn primitives confirmed hex-clean; build green.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-02T14:00:00Z
- **Completed:** 2026-05-02T14:25:00Z
- **Tasks:** 2
- **Files modified:** 5 (2 created components + 1 SVG asset + 1 fade-in refactor + 1 page extraction)

## Accomplishments

- Created `src/components/ui/stars.tsx` — CVA-driven star rating with size variants sm/md/lg, `count` + `max` props, `text-brand-orange-500` color, `data-slot="stars"`
- Created `src/components/ui/icon.tsx` — CVA-driven lucide-react wrapper with size sm/md/lg + intent default/muted/brand variants, `data-slot="icon"`
- Moved `GoogleIcon` inline SVG (4 Google brand hex fills) from `page.tsx` to `/public/google.svg` — these hex literals no longer exist in the `src/` lint surface
- Refactored `src/components/fade-in.tsx` to consume `var(--duration-slow)` + `var(--ease-out)` via inline style (removed `duration-700` + `ease-out` Tailwind utilities)
- Extracted inline `function Stars` and `function GoogleIcon` from `src/app/[locale]/page.tsx`; all 4 call sites now reference `@/components/ui/stars` with explicit `size="sm"` per D-08
- Verified 5 existing primitives (button, card, input, select, badge) — zero hex literals, zero structural change needed
- `npx tsc --noEmit` and `npm run build` both exit 0 (19 routes generated)

## New Component Prop Signatures (for Plan 04 gallery)

```ts
// src/components/ui/stars.tsx
export function Stars({
  className,
  size,     // "sm" | "md" | "lg" — default "md"
  count,    // number (required) — filled stars
  max,      // number — default 5
  ...props  // React.ComponentProps<"span">
}: StarsProps): JSX.Element

// src/components/ui/icon.tsx
export function Icon({
  as,       // LucideIcon (required) — the lucide-react component to render
  className,
  size,     // "sm" | "md" | "lg" — default "md"
  intent,   // "default" | "muted" | "brand" — default "default"
  ...props  // Omit<React.ComponentProps<"svg">, "as">
}: IconProps): JSX.Element
```

Usage examples:
```tsx
<Stars count={4} size="sm" />
<Stars count={5} size="md" max={5} />
<Icon as={Coffee} />
<Icon as={Coffee} size="lg" intent="brand" />
```

## Task Commits

1. **Task 1: Verify 5 existing UI primitives + create Stars + Icon** - `62f6d69` (feat)
2. **Task 2: Refactor fade-in; move GoogleIcon to public/; extract inline Stars from page.tsx** - `4e72f4a` (feat)

## Files Created/Modified

- `src/components/ui/stars.tsx` — NEW: CVA Stars component (count + max + size sm/md/lg)
- `src/components/ui/icon.tsx` — NEW: CVA Icon wrapper (LucideIcon + size + intent)
- `public/google.svg` — NEW: Google brand SVG with 4 official brand hex fills (moved from inline tsx)
- `src/components/fade-in.tsx` — MODIFIED: motion tokens via inline style; cn() added; React import added
- `src/app/[locale]/page.tsx` — MODIFIED: Stars + Image imports added; inline Stars + GoogleIcon deleted; 7 GoogleIcon + 4 Stars call sites updated

## Stars Call Sites Summary (page.tsx)

All 4 call sites use `size="sm"` to preserve pre-refactor visual (inline Stars defaulted to "sm"; CVA component defaults to "md"):

| Location | Call | Explicit size |
|---|---|---|
| HeroGoogleBadge | `<Stars count={Math.round(place.rating)} size="sm" />` | sm |
| ReviewsSection — top badge | `<Stars count={Math.round(place.rating)} size="sm" />` | sm |
| ReviewsSection — review card | `<Stars count={review.rating} size="sm" />` | sm |
| ReviewsSection — mobile button | `<Stars count={Math.round(place.rating)} size="sm" />` | sm |

## Remaining Hex Literals in src/ (Plan 05 cleanup surface)

These files still contain hex literals outside the 8 component files. They are OUT OF SCOPE for Plan 03 — Plan 05's ESLint cutover handles per-file cleanup or documented overrides.

| File | Hex values | Notes |
|---|---|---|
| `src/app/[locale]/page.tsx` | `#f2ead5`, `#2D5A3D` | Pre-existing inline Tailwind values in gradient + bg classes (not from this plan's changes) |
| `src/components/stickers.tsx` | `#2D5A3D`, `#3D7A52`, `#C85A3A`, `#D97B5A`, `#CREAM`, SVG fill literals | Watermelon mascot SVG — brand-exempt per mascot decision |
| `src/components/admin/analytics-dashboard.tsx` | `#e7e5e4`, `#78716c`, `#292524`, `#d6d3d1` | Recharts props that accept only literal color strings (not className) |
| `src/app/globals.css` | 30 brand scale hex values, `#b3261e` destructive | Expected — this IS the token source of truth |

## Decisions Made

- Stars uses `text-brand-orange-500` — brand-tokenized, not `text-amber-500` (RESEARCH.md Pattern 3 explicitly calls this out)
- All 4 Stars call sites in page.tsx use `size="sm"` to preserve original visual (D-08: explicit size at every call site)
- `GoogleIcon` moved to `/public/google.svg`: the 4 Google brand hex fills (#4285F4 / #34A853 / #FBBC05 / #EA4335) are third-party brand colors outside the project's token system — moving to a public SVG asset is the correct resolution per RESEARCH.md Open Q #1
- `fade-in.tsx` receives `import * as React from "react"` (was missing; needed for `React.ReactNode` type)
- `Icon` uses `as` prop pattern rather than `children` — this matches lucide-react's render model and avoids wrapper element overhead

## Deviations from Plan

None — plan executed exactly as written. All component shapes match PATTERNS.md target blocks verbatim.

## Issues Encountered

None. TypeScript was clean on the first pass for all 5 files. Build succeeded on first run.

## Known Stubs

None. All components render real data passed via props. No placeholder values.

## Threat Flags

None. This plan creates only UI components and a static SVG asset. No network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check: PASSED

- [x] `src/components/ui/stars.tsx` exists: FOUND
- [x] `src/components/ui/icon.tsx` exists: FOUND
- [x] `public/google.svg` exists: FOUND
- [x] `grep -c "starsVariants" src/components/ui/stars.tsx` = 4 (≥ 1)
- [x] `grep -c "iconVariants" src/components/ui/icon.tsx` = 4 (≥ 1)
- [x] `grep -c 'data-slot="stars"' src/components/ui/stars.tsx` = 1 (≥ 1)
- [x] `grep -c 'data-slot="icon"' src/components/ui/icon.tsx` = 1 (≥ 1)
- [x] `grep -c "text-brand-orange-500" src/components/ui/stars.tsx` = 1 (≥ 1)
- [x] Zero hex literals across all 8 component files (button/card/input/select/badge/stars/icon + fade-in)
- [x] Zero Google brand hex in src/ tree
- [x] `grep -c "var(--duration-slow)" src/components/fade-in.tsx` = 1 (≥ 1)
- [x] `grep -c "var(--ease-out)" src/components/fade-in.tsx` = 1 (≥ 1)
- [x] `grep -c "duration-700" src/components/fade-in.tsx` = 0
- [x] `grep -c "function GoogleIcon" src/app/[locale]/page.tsx` = 0
- [x] `grep -c "function Stars" src/app/[locale]/page.tsx` = 0
- [x] `grep -c "@/components/ui/stars" src/app/[locale]/page.tsx` = 1 (≥ 1)
- [x] `grep -c "/google.svg" src/app/[locale]/page.tsx` = 7 (≥ 1)
- [x] All 4 `<Stars count` call sites have explicit `size=` prop
- [x] Commit 62f6d69 exists in git log
- [x] Commit 4e72f4a exists in git log
- [x] `npx tsc --noEmit` exits 0
- [x] `npm run build` exits 0 (19 routes generated)
