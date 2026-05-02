# Phase 1: Design System Foundation + Brand Expression — Pattern Map

**Mapped:** 2026-04-29
**Files analyzed:** 13 (5 new, 8 modified)
**Analogs found:** 11 / 13 (2 files have no in-repo analog — markdown brand spec + culori Node script)

## File Classification

| New/Modified File | New/Mod | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|---------|------|-----------|----------------|---------------|
| `.planning/brand/SPEC.md` | new | planning artifact (markdown spec) | doc | `.planning/phases/01-…/01-SPEC.md` (sibling planning markdown) | role-only — planning markdown convention |
| `scripts/derive-tokens.ts` | new | build-time tooling (Node one-shot script) | transform (anchor hex → derived hex) | none in repo (no `scripts/` dir exists yet) | no analog — follow RESEARCH.md Pattern 6 |
| `src/app/globals.css` | mod | config (CSS token source-of-truth) | static config | self (current OKLCH theme) | self — hard cutover replaces non-comment lines |
| `src/components/ui/button.tsx` | mod | UI primitive (CVA component) | request-response (props → className) | self (already CVA + correct shape) | exact — token migration only |
| `src/components/ui/card.tsx` | mod | UI primitive (compound component) | request-response | self | exact — token migration only |
| `src/components/ui/input.tsx` | mod | UI primitive (form input wrapper) | request-response | self | exact — token migration only |
| `src/components/ui/select.tsx` | mod | UI primitive (compound dropdown) | request-response | self | exact — token migration only |
| `src/components/ui/badge.tsx` | mod | UI primitive (CVA component) | request-response | self | exact — token migration only |
| `src/components/ui/stars.tsx` | new | UI primitive (CVA component) | request-response | `src/components/ui/badge.tsx` (CVA + variants only, no `size`) + inline `Stars` in `[locale]/page.tsx:85-100` (current behaviour) | role+flow match |
| `src/components/ui/icon.tsx` | new | UI primitive (CVA wrapper) | request-response | `src/components/ui/button.tsx` (CVA with `variants.size` + `defaultVariants`) | role+flow match |
| `src/components/fade-in.tsx` | mod | UI primitive (motion wrapper) | event-driven (IntersectionObserver) | self | exact — refactor in place |
| `src/app/dev/components/page.tsx` | new | route (RSC server component) | request-response | `src/app/admin/login/page.tsx` (single-route page that imports UI primitives) | role-only — gallery is dev-gated, not auth |
| `eslint.config.mjs` | mod | config (lint flat config) | static config | self (existing flat config with `defineConfig` + `globalIgnores`) | self — extend with inline plugin |
| `package.json` | mod | config (deps manifest) | static config | self | self — add `culori` + `tsx` |

---

## Pattern Assignments

### `.planning/brand/SPEC.md` (markdown spec, doc)

**Analog:** No code analog. Follow `.planning/phases/01-design-system-foundation-brand-expression/01-SPEC.md` for the project's markdown spec voice (level-2 headings, terse prose). Acceptance is grep-driven.

**Authoring convention** (from CONTEXT.md D-04..D-06 and SPEC REQ 6):
- Exactly 5 `## ` sections in this order: `Typography`, `Photography`, `Voice`, `Motion`, `Mascot`.
- Each section ends in a single line that begins at column 0 and matches `^\*\*Decision:\*\*` literally.
- Each section cites PROJECT.md DNA refs (Graza / Monte Cafe / Craft / Superr) + ≥ 1 inline image link.

**Acceptance grep (must pass before merge):**

```bash
grep -E "^## (Typography|Photography|Voice|Motion|Mascot)$" .planning/brand/SPEC.md | wc -l   # must be 5
grep -cE "^\*\*Decision:\*\*" .planning/brand/SPEC.md                                          # must be 5
```

**Skeleton (to copy from):**

```markdown
# Cafe Le Den — Brand Expression Spec

**Locked:** YYYY-MM-DD
**Consumed by:** Phase 1 tokens (Typography → `--text-*`, Motion → `--duration-*` / `--ease-*`); Phases 3 + 4 page rebuilds.

## Typography
<DNA ref + 1 image link + concrete font choice>
**Decision:** <one-line concrete choice — face, weight, size range>

## Photography
**Decision:** <one-line concrete choice>

## Voice
**Decision:** <one-line concrete choice>

## Motion
**Decision:** <one-line concrete choice — duration band + easing curve>

## Mascot
**Decision:** <one-line concrete choice — watermelon usage rule>
```

---

### `scripts/derive-tokens.ts` (Node one-shot script, transform)

**Analog:** none in this repo (no `scripts/` directory exists yet — must be created).

**Authoritative reference:** `01-RESEARCH.md` "Pattern 6: OKLCH Lightness Sweep with culori" (lines ~706–790).

**Imports pattern** (from RESEARCH.md):

```ts
import { converter, formatHex, parse, differenceEuclidean } from "culori";
```

**Core pattern** — anchor → 9-stop sweep + ΔE76 verification:

```ts
type Anchor = { name: string; hex: string };

const ANCHORS: Anchor[] = [
  { name: "cream",  hex: "#EFE7D2" },
  { name: "forest", hex: "#2F5436" },
  { name: "orange", hex: "#D9682E" },
];

const LIGHTNESS = { 50:0.97, 100:0.93, 200:0.86, 300:0.78, 400:0.68, 600:0.50, 700:0.40, 800:0.28, 900:0.18 };

const toOklch  = converter("oklch");
const deltaE76 = differenceEuclidean("lab");   // ΔE76 = Euclidean distance in CIELAB (Pitfall 1)

for (const anchor of ANCHORS) {
  const oklchAnchor = toOklch(parse(anchor.hex));
  if (!oklchAnchor) throw new Error(`Failed to parse ${anchor.hex}`);
  for (const [stop, L] of Object.entries(LIGHTNESS)) {
    const hex = formatHex({ ...oklchAnchor, l: L });
    console.log(`  --brand-${anchor.name}-${stop}: ${hex};`);
  }
  const fiveHundredHex = formatHex(oklchAnchor);
  const dE = deltaE76(parse(anchor.hex), parse(fiveHundredHex));
  if (dE > 2) throw new Error(`ΔE76 ${dE.toFixed(3)} > 2 for ${anchor.name}`);
}
```

**Run convention:** `npx tsx scripts/derive-tokens.ts` (tsx is added as devDep in `package.json`). Output is copy-pasted by hand into `globals.css`; the script is **not** wired into the build (per D-02).

**Pitfall guards (from RESEARCH.md):**
- Use `differenceEuclidean("lab")` — NOT `"oklch"`. ΔE76 is by definition CIELAB.
- After verification, add a comment in `globals.css`: `/* OKLCH lightness sweep verified YYYY-MM-DD via culori v4.x — ΔE76 ≤ 2 at all anchors */` (per D-03).

---

### `src/app/globals.css` (CSS token source, static config — hard cutover)

**Analog:** self. Current file already follows `@theme inline { ... }` + `:root { ... }` + keyframes structure. The hard cutover replaces the OKLCH `:root` block and adds new namespaces.

**Authoritative reference:** `01-RESEARCH.md` "Pattern 1: Tailwind v4 `@theme` — Two-Block CSS Structure" (lines ~246–390) and `01-SPEC.md` REQ 1–3.

**Existing structure to keep** (`src/app/globals.css:1-50`):

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  /* ... existing semantic aliases ... */
  --font-sans: "Geist", "Geist Fallback", ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-display), "Georgia", "Times New Roman", serif;
  --radius-sm: calc(var(--radius) * 0.6);
  /* ... */
}
```

**Existing block to DELETE** (`src/app/globals.css:52-86` — the OKLCH "Warm cafe theme" block):

```css
/* Warm cafe theme — orange/amber primary, cream background, espresso text */
:root {
  --background: oklch(0.975 0.008 75);
  --foreground: oklch(0.22 0.03 50);
  /* ... 33 OKLCH lines ... */
  --sidebar-ring: oklch(0.62 0.18 45);
}
```

**Existing animation lines that MUST migrate to motion tokens** (`src/app/globals.css:124-195`):

```css
.doodle-pop { animation: doodle-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.doodle-draw path { animation: doodle-draw 1.5s ease-out forwards; }
.review-carousel { animation: scroll-reviews 40s linear infinite; }
.logo-animate {
  animation:
    logo-reveal-1 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s forwards,
    logo-reveal-2 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s forwards,
    logo-reveal-3 0.4s ease-out 0.9s forwards;
}
.hero-fade-in { animation: hero-fade-up 0.5s ease-out forwards; }
.hero-fade-in-1 { animation-delay: 1.2s; }
/* ... etc ... */
```

→ Each literal `0.5s` / `ease-out` / `cubic-bezier(...)` outside `@keyframes` blocks must become `var(--duration-*)` / `var(--ease-*)`.

**Acceptance greps** (from SPEC):

```bash
grep -E "oklch\(" src/app/globals.css                          # zero matches in non-comment lines
grep -cE "(--brand-cream-|--brand-forest-|--brand-orange-)" src/app/globals.css   # ≥ 27
grep -E "(--text-display|--text-h1|--text-h2|--text-h3|--text-body|--text-caption|--text-label)" src/app/globals.css   # all 7 present
grep -E "(--space-|--shadow-|--duration-|--ease-)" src/app/globals.css            # scales present
grep -E "(0\.[0-9]+s|ease-(out|in|in-out))" src/app/globals.css                   # zero in non-keyframe lines
```

---

### `src/components/ui/button.tsx` (CVA component, request-response — modify)

**Analog:** self. The file already has the correct shape; the diff is tokens-only.

**Imports pattern (keep as-is)** — `src/components/ui/button.tsx:1-6`:

```tsx
"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
```

**Core CVA pattern (keep shape, swap tokens)** — `src/components/ui/button.tsx:8-43`:

```tsx
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg ...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        outline:  "border-border bg-background hover:bg-muted hover:text-foreground ...",
        secondary:"bg-secondary text-secondary-foreground hover:bg-secondary/80 ...",
        ghost:    "hover:bg-muted hover:text-foreground ...",
        destructive: "bg-destructive/10 text-destructive ...",
        link:     "text-primary underline-offset-4 hover:underline",
      },
      size: { default: "...", xs: "...", sm: "...", lg: "...", icon: "...", "icon-xs": "...", "icon-sm": "...", "icon-lg": "..." },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)
```

**Component shape (keep as-is)** — `src/components/ui/button.tsx:45-58`:

```tsx
function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
```

**Token migration scope (per RESEARCH.md "shadcn semantic-token mapping", Open Question #5):**
- All semantic-token references (`bg-primary`, `text-primary-foreground`, `bg-muted`, `text-foreground`, `bg-secondary`, `text-destructive`, `border-border`, etc.) **stay as-is** — they resolve through the new `--primary: var(--brand-forest-500)` indirection in `globals.css`.
- Do NOT swap `bg-primary` → `bg-brand-forest-500` at the component level. The point of the indirection is one-place theming.
- Verify: no hex literals remain in `button.tsx` after the migration (the rule from REQ 5 will catch any).

---

### `src/components/ui/card.tsx` (compound component, request-response — modify)

**Analog:** self. Same pattern: token-only migration; semantic tokens stay (`bg-card`, `text-card-foreground`, `bg-muted/50`, `border-t`).

**Existing pattern to keep** — `src/components/ui/card.tsx:5-21`:

```tsx
function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10 ...",
        className
      )}
      {...props}
    />
  )
}
```

**Token migration scope:** none structural. Verify no hex literals appear in any Card subcomponent.

---

### `src/components/ui/input.tsx` (form input wrapper, request-response — modify)

**Analog:** self. Single-component file wrapping `@base-ui/react/input`. Tokens only.

**Existing pattern (keep)** — `src/components/ui/input.tsx:1-20`:

```tsx
import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent ... placeholder:text-muted-foreground ...",
        className
      )}
      {...props}
    />
  )
}

export { Input }
```

---

### `src/components/ui/select.tsx` (compound dropdown, request-response — modify)

**Analog:** self. Multiple subcomponents (`SelectTrigger`, `SelectContent`, `SelectItem`, `SelectScrollUpButton`, etc.) all consuming semantic tokens already (`bg-popover`, `text-popover-foreground`, `border-input`, `text-muted-foreground`, `bg-accent`, `text-accent-foreground`).

**Existing pattern (keep)** — `src/components/ui/select.tsx:31-57` (SelectTrigger excerpt):

```tsx
function SelectTrigger({ className, size = "default", children, ...props }: SelectPrimitive.Trigger.Props & { size?: "sm" | "default" }) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent ... data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 ...",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon render={<ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />} />
    </SelectPrimitive.Trigger>
  )
}
```

---

### `src/components/ui/badge.tsx` (CVA component, request-response — modify)

**Analog:** self.

**Existing CVA pattern (keep)** — `src/components/ui/badge.tsx:7-28`:

```tsx
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 ... rounded-4xl border border-transparent ...",
  {
    variants: {
      variant: {
        default:     "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:   "bg-secondary text-secondary-foreground ...",
        destructive: "bg-destructive/10 text-destructive ...",
        outline:     "border-border text-foreground ...",
        ghost:       "hover:bg-muted hover:text-muted-foreground ...",
        link:        "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: { variant: "default" },
  }
)
```

**Component shape (keep — uses `useRender` not direct `<span>`)** — `src/components/ui/badge.tsx:30-50`:

```tsx
function Badge({ className, variant = "default", render, ...props }: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">({ className: cn(badgeVariants({ variant }), className) }, props),
    render,
    state: { slot: "badge", variant },
  })
}
```

> **Note:** Badge has only `variant` (no `size`) variants today. Tokens migration only — do NOT add `size` to keep the diff minimal.

---

### `src/components/ui/stars.tsx` (NEW — CVA component, request-response)

**Analog:** `src/components/ui/badge.tsx` (CVA shape with `defaultVariants`) + `src/components/ui/button.tsx` (`variants.size` enum) + inline `Stars` in `src/app/[locale]/page.tsx:85-100` (current rendering behaviour).

**Imports pattern** (from `button.tsx:1-6` style):

```tsx
"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
```

**Existing inline behaviour to extract** — `src/app/[locale]/page.tsx:85-100`:

```tsx
function Stars({ count, size = "sm" }: { count: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span className="inline-flex gap-0.5 text-amber-500">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`${cls} ${i < count ? "fill-current" : "fill-muted stroke-current opacity-30"}`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.368-2.447a1 1 0 00-1.175 0l-3.368 2.447c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
        </svg>
      ))}
    </span>
  );
}
```

**Target shape** (per CONTEXT.md D-09 + RESEARCH.md Pattern 3 lines 421–464):

```tsx
const starsVariants = cva(
  "inline-flex gap-0.5 text-brand-orange-500",   // brand color, NOT text-amber-500
  {
    variants: {
      size: {
        sm: "[&_svg]:size-3.5",
        md: "[&_svg]:size-4",
        lg: "[&_svg]:size-5",
      },
    },
    defaultVariants: { size: "md" },
  }
);

type Props = React.ComponentProps<"span"> &
  VariantProps<typeof starsVariants> & {
    count: number;        // filled stars
    max?: number;         // total stars (default 5)
  };

export function Stars({ className, size, count, max = 5, ...props }: Props) {
  return (
    <span className={cn(starsVariants({ size }), className)} {...props}>
      {Array.from({ length: max }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" className={i < count ? "fill-current" : "fill-muted stroke-current opacity-30"}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.368-2.447a1 1 0 00-1.175 0l-3.368 2.447c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
        </svg>
      ))}
    </span>
  );
}
```

**Migration step:** delete lines 85–100 from `src/app/[locale]/page.tsx`; add `import { Stars } from "@/components/ui/stars"` at top; add explicit `size="md"` (or appropriate) at every existing `<Stars count=... />` call site (per D-08).

---

### `src/components/ui/icon.tsx` (NEW — CVA wrapper around lucide-react, request-response)

**Analog:** `src/components/ui/button.tsx` (CVA with `variants.size` + `variants.intent` shape + `defaultVariants`).

**Imports pattern** (button-style + lucide-react):

```tsx
"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
```

**Target shape** (per CONTEXT.md D-09 + RESEARCH.md Pattern 3 lines 470–504):

```tsx
const iconVariants = cva(
  "inline-block shrink-0",
  {
    variants: {
      size: {
        sm: "size-3.5",
        md: "size-4",
        lg: "size-5",
      },
      intent: {
        default: "text-foreground",
        muted:   "text-muted-foreground",
        brand:   "text-primary",       // resolves to var(--brand-forest-500) post-cutover
      },
    },
    defaultVariants: { size: "md", intent: "default" },
  }
);

type Props = React.ComponentProps<"svg"> &
  VariantProps<typeof iconVariants> & { as: LucideIcon };

export function Icon({ as: Component, className, size, intent, ...props }: Props) {
  return <Component className={cn(iconVariants({ size, intent }), className)} {...props} />;
}
```

**Call site convention:** `<Icon as={Coffee} size="lg" intent="brand" />`.

**`GoogleIcon` resolution (RESEARCH.md Open Q #1, Pattern 5 allowlist policy):**
- The duplicated `GoogleIcon` in `src/app/[locale]/page.tsx:103-112` contains 4 third-party brand hex literals (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`).
- **Recommended (per RESEARCH.md):** move SVG to `/public/google.svg` + render via `next/image` `<Image>`. Eliminates the hex literals; no ESLint allowlist needed; matches DRY direction in CONCERNS.md.
- Alternative: keep `GoogleIcon` in a separate file and add the 4 hex values to the ESLint `allowlist` option.
- Plan-phase decides; either satisfies SPEC.

---

### `src/components/fade-in.tsx` (motion wrapper, event-driven — modify in place)

**Analog:** self. The IntersectionObserver hook stays; only the motion CSS values migrate.

**Existing pattern (lines 1-38)** — `src/components/fade-in.tsx`:

```tsx
"use client";

import { useFadeIn } from "@/hooks/use-fade-in";

export function FadeIn({ children, className, delay = 0, direction = "up" }: { /* ... */ }) {
  const { ref, isVisible } = useFadeIn(0.15);

  const translateClass = { up: "translate-y-8", left: "translate-x-8", right: "-translate-x-8", none: "" }[direction];

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-x-0 translate-y-0" : `opacity-0 ${translateClass}`
      } ${className ?? ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
```

**Target pattern** (per RESEARCH.md "fade-in.tsx — refactored to consume motion tokens", lines ~890–940):

```tsx
"use client";

import { useFadeIn } from "@/hooks/use-fade-in";
import { cn } from "@/lib/utils";

export function FadeIn({ children, className, delay = 0, direction = "up" }: { /* ... unchanged ... */ }) {
  const { ref, isVisible } = useFadeIn(0.15);

  const translateClass = { up: "translate-y-8", left: "translate-x-8", right: "-translate-x-8", none: "" }[direction];

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all",                          // was: "transition-all duration-700 ease-out"
        isVisible ? "opacity-100 translate-x-0 translate-y-0" : `opacity-0 ${translateClass}`,
        className
      )}
      style={{
        transitionDuration: "var(--duration-slow)",
        transitionTimingFunction: "var(--ease-out)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
```

**Migration notes:**
- `delay` prop stays a JS number (per-instance, dynamic — keep as inline style).
- `useFadeIn` hook (`src/hooks/use-fade-in.ts`) is NOT modified — the `0.15` IntersectionObserver threshold is not a brand token.
- Adopting `cn()` here matches the rest of `src/components/ui/`.

---

### `src/app/dev/components/page.tsx` (NEW — dev-only RSC route, request-response)

**Analog:** `src/app/admin/login/page.tsx` (single-route page that imports UI primitives — though gating mechanism differs).

**Authoritative reference:** `01-RESEARCH.md` "Pattern 4: Dev-Only Route Gating in Next.js 16 App Router" (lines ~510–574).

**Imports pattern** (analog: `src/app/admin/login/page.tsx:1-15` style — straight imports of `@/components/ui/...`):

```tsx
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Stars } from "@/components/ui/stars";
import { Icon } from "@/components/ui/icon";
import { FadeIn } from "@/components/fade-in";
import { Coffee, Star } from "lucide-react";
```

**Gating pattern** (server component — NO `"use client"`):

```tsx
export default function DevComponentsGalleryPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-h1">Component Gallery</h1>
      <p className="text-muted-foreground mt-2 text-body">Dev-only — not shipped to production.</p>

      <section className="mt-12">
        <h2 className="text-h2">Button</h2>
        <ComponentExample
          title="Variants"
          code={`<Button variant="default" size="default">Default</Button>
<Button variant="outline" size="default">Outline</Button>
<Button variant="ghost" size="default">Ghost</Button>`}
        >
          <div className="flex gap-3">
            <Button variant="default" size="default">Default</Button>
            <Button variant="outline" size="default">Outline</Button>
            <Button variant="ghost" size="default">Ghost</Button>
          </div>
        </ComponentExample>
        {/* ... all 6 variants × all 8 sizes ... */}
      </section>

      {/* ... Card, Input, Select, Badge, Stars, Icon, FadeIn ... */}
    </div>
  );
}

function ComponentExample({ title, code, children }: { title: string; code: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-lg border border-border bg-card p-6">
      <h3 className="text-h3">{title}</h3>
      <div className="mt-4">{children}</div>
      <pre className="mt-4 overflow-x-auto rounded bg-muted p-4 text-caption">
        <code>{code}</code>
      </pre>
    </div>
  );
}
```

**Pitfalls (RESEARCH.md Pitfall 3):**
- Do NOT add `"use client"` — must be a Server Component so `notFound()` short-circuits before any HTML ships.
- Do NOT put the `NODE_ENV` check inside `useEffect` — production users would briefly see the gallery.

**Acceptance grep (from SPEC):**
- Visiting `/dev/components` in `next dev` renders each of 8 components in ≥ 2 variant or size states.
- `next build` either omits the route OR returns 404 in production.

---

### `eslint.config.mjs` (lint flat config, static config — modify)

**Analog:** self. The current file already uses ESLint 9 flat config (`defineConfig` + `globalIgnores`).

**Authoritative reference:** `01-RESEARCH.md` "Pattern 5: ESLint 9 Inline Virtual Plugin" (lines ~576–704).

**Existing pattern to keep** — `eslint.config.mjs:1-19`:

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
```

**Target shape** — extend with two inline rules (per RESEARCH.md Pattern 5):

```js
// Inline rule #1: catch raw hex string literals
const noRawHexLiteral = {
  meta: {
    type: "problem",
    docs: { description: "Disallow raw hex color literals; use brand tokens instead" },
    schema: [{
      type: "object",
      properties: { allowlist: { type: "array", items: { type: "string" } } },
      additionalProperties: false,
    }],
    messages: {
      rawHex: "Raw hex {{value}} is not a brand token. Use a token (e.g. var(--brand-forest-500) or bg-brand-forest-500).",
    },
  },
  create(context) {
    const opts = context.options[0] ?? {};
    const allowlist = new Set(opts.allowlist ?? []);
    const hexRe = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
    return {
      Literal(node) {
        if (typeof node.value !== "string") return;
        if (!hexRe.test(node.value)) return;
        if (allowlist.has(node.value)) return;
        context.report({ node, messageId: "rawHex", data: { value: node.value } });
      },
      TemplateElement(node) {
        const v = node.value?.cooked ?? "";
        const matches = v.match(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g);
        if (!matches) return;
        for (const m of matches) {
          if (allowlist.has(m)) continue;
          context.report({ node, messageId: "rawHex", data: { value: m } });
        }
      },
    };
  },
};

// Inline rule #2: catch Tailwind arbitrary color classes (className="bg-[#2D5A3D]")
const noArbitraryColorClass = {
  meta: { /* ... */ },
  create(context) {
    const arbHexRe = /-\[(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8}))(?:\/[0-9.]+)?\]/g;
    function checkString(node, str) {
      let match;
      while ((match = arbHexRe.exec(str)) !== null) {
        context.report({ node, messageId: "arbitrary", data: { match: match[0] } });
      }
    }
    return {
      JSXAttribute(node) {
        if (node.name?.name !== "className") return;
        const v = node.value;
        if (!v) return;
        if (v.type === "Literal" && typeof v.value === "string") checkString(node, v.value);
        else if (v.type === "JSXExpressionContainer") {
          const expr = v.expression;
          if (expr?.type === "Literal" && typeof expr.value === "string") checkString(node, expr.value);
          if (expr?.type === "TemplateLiteral") for (const q of expr.quasis) checkString(node, q.value?.cooked ?? "");
        }
      },
    };
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"],
    plugins: {
      local: { rules: { "no-raw-hex": noRawHexLiteral, "no-arbitrary-color-class": noArbitraryColorClass } },
    },
    rules: {
      "local/no-raw-hex": ["error", {
        // Plan-phase decides: per RESEARCH.md Open Q #1, prefer moving GoogleIcon SVG to /public/google.svg.
        // If kept inline, allowlist Google brand colors here.
        allowlist: [],
      }],
      "local/no-arbitrary-color-class": "error",
    },
  },
  // Optional file-scoped overrides for stickers.tsx / doodles.tsx / analytics-dashboard.tsx — see Pitfall 5
  // {
  //   files: ["src/components/stickers.tsx", "src/components/doodles.tsx"],
  //   rules: { "local/no-raw-hex": "off" },
  // },
]);

export default eslintConfig;
```

**Pitfall guards (RESEARCH.md):**
- The hex regex MUST be bounded `(3|6|8)` chars to avoid HTML-entity false positives like `&#10003;`.
- D-11 says rule turns on LAST — no `warn` level, no allowlist for brand-internal hex; first run on post-cutover codebase exits zero.

---

### `package.json` (deps manifest, static config — modify)

**Analog:** self.

**Existing pattern (keep)** — `package.json:1-43`:

```json
{
  "name": "leden-website",
  "scripts": { "dev": "next dev", "build": "next build", "start": "next start", "lint": "eslint" },
  "dependencies": { /* ... */ },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.1",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

**Target additions** (per CONTEXT.md + RESEARCH.md "Standard Stack" + "Environment Availability"):

```json
"devDependencies": {
  /* ... existing ... */
  "culori": "^4.0.0",       // OKLCH math + ΔE76 — derive-tokens.ts only, NOT runtime
  "tsx": "^4.0.0"           // Run derive-tokens.ts as a TypeScript one-shot script
}
```

**Verification:** Plan-phase runs `npm view culori version` + `npm view tsx version` before pinning.

**Rationale** (per PROJECT.md "no new deps without rationale"):
- `culori` — used by Tailwind v4 itself for default palette generation; ESM-native; supports OKLCH + CIELAB + ΔE76 in one library; alternatives `chroma-js` / `colorjs.io` are inferior for this scope. **devDependency only — never bundled.**
- `tsx` — runs `scripts/derive-tokens.ts` directly without a separate `tsc` build step. Fallback: write the script as plain `.js` and skip `tsx`.

---

## Shared Patterns

### 1. CVA + `cn()` composition (all UI primitives)
**Source:** `src/components/ui/button.tsx:8-58` + `src/components/ui/badge.tsx:7-50`
**Apply to:** `button.tsx`, `card.tsx` (where applicable), `input.tsx`, `select.tsx`, `badge.tsx`, **stars.tsx (new)**, **icon.tsx (new)**

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const variants = cva("base classes", {
  variants: { /* ... */ },
  defaultVariants: { /* ... */ },
});

function Component({ className, ...props }: Props & VariantProps<typeof variants>) {
  return <Element className={cn(variants({ ...props }), className)} {...props} />;
}
```

### 2. Semantic-token indirection (RESEARCH.md Open Q #5)
**Source:** existing `globals.css:7-50` `@theme inline` block
**Apply to:** `globals.css` cutover + every UI primitive

```css
:root {
  --brand-forest-500: #2f5436;   /* anchor */
  --primary: var(--brand-forest-500);   /* semantic alias */
}

@theme inline {
  --color-brand-forest-500: var(--brand-forest-500);
  --color-primary: var(--primary);
}
```

→ Components keep using `bg-primary` (not `bg-brand-forest-500`). One-place theming, lowest churn.

### 3. Path alias `@/` (every TS/TSX file)
**Source:** existing tsconfig `paths` mapping (used throughout the codebase: `import { cn } from "@/lib/utils"`, `import { Button } from "@/components/ui/button"`).
**Apply to:** every new `.tsx` file in this phase. Never use relative paths like `../../lib/utils`.

### 4. `data-slot="<name>"` convention (UI primitives)
**Source:** `button.tsx:53` (`data-slot="button"`), `card.tsx:13` (`data-slot="card"`), `input.tsx:10`, `select.tsx:42` etc.
**Apply to:** `stars.tsx` should add `data-slot="stars"`; `icon.tsx` should add `data-slot="icon"`. Matches existing primitive convention; helps with debugging + future styling hooks.

### 5. `"use client"` directive scoping
**Source:** `button.tsx:1` (`"use client"`), `select.tsx:1`, `fade-in.tsx:1`. NOT present in `card.tsx`, `input.tsx`, `badge.tsx`.
**Apply to:**
- `stars.tsx` — `"use client"` (renders SVG client-side, defensive).
- `icon.tsx` — `"use client"` (lucide-react components).
- `dev/components/page.tsx` — **NO `"use client"`** (must be Server Component for `notFound()` to work — Pitfall 3).

### 6. PROJECT.md "no new deps without rationale"
**Apply to:** any package.json change. Document `culori` + `tsx` rationale in the PR commit body.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.planning/brand/SPEC.md` | planning markdown | doc | No prior brand spec exists; structure is grep-driven and self-contained per SPEC REQ 6 + CONTEXT D-04..D-06. Other `.planning/**/SPEC.md` files share the markdown tone but have different structural requirements. |
| `scripts/derive-tokens.ts` | one-shot Node script | transform | No `scripts/` directory exists in the repo. Follow RESEARCH.md Pattern 6 (lines ~706–790) verbatim — culori-driven OKLCH lightness sweep. |

---

## Verification Greps (composite, after all PRs merge)

Run these to confirm the pattern map was applied correctly:

```bash
# Phase 1 acceptance suite (from SPEC.md)
grep -E "oklch\(" src/app/globals.css                                                    # 0 (in non-comments)
grep -cE "(--brand-cream-|--brand-forest-|--brand-orange-)" src/app/globals.css          # ≥ 27
grep -E "(--text-display|--text-h1|--text-h2|--text-h3|--text-body|--text-caption|--text-label)" src/app/globals.css  # all 7
grep -E "(--space-|--shadow-|--duration-|--ease-)" src/app/globals.css                   # present
grep -E "(0\.[0-9]+s|ease-(out|in|in-out))" src/app/globals.css                          # 0 in non-keyframe lines
grep -rE "<button[ >]" src/app/ src/components/ --include="*.tsx" | grep -v "src/components/ui/"   # 0
grep -E "^## (Typography|Photography|Voice|Motion|Mascot)$" .planning/brand/SPEC.md      # 5
grep -cE "^\*\*Decision:\*\*" .planning/brand/SPEC.md                                    # 5
ls src/components/ui/{button,card,input,select,badge,stars,icon}.tsx                     # all 7 exist
ls src/components/fade-in.tsx                                                            # exists
ls src/app/dev/components/page.tsx                                                       # exists
ls scripts/derive-tokens.ts                                                              # exists
npm run lint                                                                             # exit 0
```

---

## Metadata

**Analog search scope:** `src/components/ui/`, `src/components/`, `src/app/`, `src/hooks/`, `src/lib/`, `eslint.config.mjs`, `package.json`, `.planning/phases/01-…`
**Files scanned:** 14 (5 UI primitives, 1 motion wrapper, 1 hook, 1 utils, 1 layout, 1 page, 1 admin page, 1 ESLint config, 1 package manifest, 1 globals.css, 2 spec files)
**Pattern extraction date:** 2026-04-29
**Phase:** 01-design-system-foundation-brand-expression
