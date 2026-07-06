# Design

> Seeded from `src/app/globals.css` (the token layer) and `.planning/brand/SPEC.md` (locked brand-expression decisions). Colors here describe brand *intent* and the semantic mapping; the raw 50–900 brand scales are being migrated to Radix-quality monotonic scales (the current OKLCH-swept scales contain inversions — e.g. `forest-600` is lighter than `forest-500`). Prefer semantic tokens over raw scale steps.

## Theme

Warm, light, editorial. The physical scene: a Montrealer glances at their phone on a bright street or in a warm café, deciding where to eat lunch. Light theme only — the surface is cream, like butcher paper or a bakery bag, never dark. Personality is handmade and confident, anchored by a chunky wordmark and a watermelon mascot used as a small accent.

## Color Palette

Brand palette is anchored by the existing logo. Three hues, each with a 50–900 scale (`--brand-{cream|forest|orange}-*`), plus a UI-system red kept independent of the brand.

**Anchors (–500 stops):**
- Cream `#EFE7D2` — the background / paper. Warm neutral, low chroma.
- Forest green `#2F5436` — primary. Used for the wordmark "Café", primary buttons, headings-on-cream.
- Warm orange `#D9682E` — accent. Used for "Le Den", CTAs' energy, links, small highlights. Deploy sparingly (≤10–15% of surface).
- Destructive `#B3261E` — UI red, not a brand color.

**Scales:** Each hue has a **Radix-methodology 1–12 scale** (`--cream-*`, `--forest-*`, `--orange-*`) generated + contrast-verified by `scripts/derive-radix-tokens.ts` (monotonic OKLCH lightness 1→12; anchor pinned at its natural step: cream→2, forest→9, orange→9). Step semantics: 1–2 bg · 3–5 component bg · 6 subtle border · 7–8 border/ring · 9–10 solid fill+hover · 11–12 text.

**Semantic mapping (the source of truth for components — shadcn/Base UI primitives consume these; every text pairing ≥ WCAG AA):**
- `--background` = cream-2, `--foreground` = forest-12
- `--card` / `--popover` = cream-1, foreground forest-12
- `--primary` = forest-9, `--primary-foreground` = cream-1
- `--secondary` / `--muted` = cream-3, foreground forest-11
- `--accent` = orange-9, `--accent-foreground` = forest-12 (dark on orange, 4.71:1)
- `--border` = cream-6, `--input` = cream-8, `--ring` = orange-10
- On-cream accent text (prices, links): `orange-11` (4.71:1). Never light text on orange-9 (fails AA).

**Color strategy:** Committed-warm. Cream carries ~80% of the surface; forest carries structure and one full-bleed band; orange is the single accent held to ~10–15% (order CTA, prices, live-status). Restraint-then-commit: one loud element per section. Not Restrained (the surface is deliberately warm-tinted), not Drenched.

## Typography

Two families. Display is an editorial serif; body/UI is a clean grotesque sans.

- **Display** — **Fraunces** (variable serif with SOFT/WONK axes for the chunky, hand-made feel), loaded via `next/font`. `--text-display` clamps 2.75→4rem. Used for hero tagline and section headings via the `text-display`/`text-h1`/`text-h2`/`text-h3` tokens.
- **Headings** — Fraunces: `text-h1` clamp 2→2.5rem (500), `text-h2` clamp 1.6→2rem (500), `text-h3` 1.5rem (600). Applied to `h1,h2,h3` by default in the base layer.
- **Body** — **Inter**, loaded via `next/font`: `--text-body` 1rem/1.5 (400).
- **Caption** — `--text-caption` 0.8125rem/1.4 (500). **Label** — `--text-label` 0.75rem/1.3 (600), uppercase, tracking 0.05em.
- Tailwind v4 generates `text-display`, `text-h1`…`text-label` utilities. **Pages use these, not raw `text-4xl`.**
- Hierarchy via scale + weight contrast; measure capped ~65–75ch on body copy.

> `--font-display` resolves to `var(--font-fraunces)` (loaded, no more silent Georgia fallback); `--font-sans` resolves to `var(--font-inter)`. Set in `src/app/layout.tsx` + `@theme` in `globals.css`.

## Spacing

Scale: `--space-xs` 0.5rem, `--space-sm` 1rem, `--space-md` 1.5rem, `--space-lg` 2rem, `--space-xl` 3rem. Vary section rhythm deliberately; avoid identical padding on every section. Current pages use ad-hoc `py-24 sm:py-32` — migrate to a consistent section-rhythm scale.

## Elevation

Three shadows, soft and warm: `--shadow-sm` (hairline), `--shadow-md` (card lift), `--shadow-lg` (hover/modal). Radius scale: `--radius-sm` 0.375rem, `--radius-md` 0.5rem, `--radius-lg` 0.75rem, `--radius-xl` 1rem. Cards and CTAs currently favor large/pill radii. Use elevation sparingly; prefer borders and tints over stacked shadows.

## Motion

Three durations — fast 150ms, base 300ms, slow 500ms. Three eases — in `cubic-bezier(0.4,0,1,1)`, out `cubic-bezier(0,0,0.2,1)`, spring `cubic-bezier(0.34,1.56,0.64,1)`. Hero fade-ups use slow + out. No parallax, no scroll-jacking. Every animation must have a `prefers-reduced-motion: reduce` off-switch. Do not animate layout properties; animate transform/opacity.

## Iconography & Assets

- Icons: `lucide-react` via a CVA `Icon` component (`src/components/ui/icon.tsx`). One coherent set only.
- Brand marks: `/public/logo.png` (wordmark), `/public/google.svg`. Watermelon mascot: accent role only, ≤64px, allowed in hero corner / footer / confirmation success; never inside buttons, never a logo replacement, never animated longer than `--duration-slow`.
- Photography: warm-tone product + ambient café shots, natural daylight, mid-shadow; aspect 4:5 portrait or 16:9 landscape; no human-face hero shots in v1; no Unsplash filler. Serve via `next/image`.

## Components

Base UI primitives + shadcn (base-nova style) in `src/components/ui/`: Button, Card, Input, Label, Select, Badge, Stars, Icon, Dialog, Sheet, Tabs, Switch, Dropdown-menu, Scroll-area, Separator, Skeleton, Table, Textarea, Sonner (toasts). `FadeIn` wraps scroll-reveal. Buttons carry explicit `variant` + `size` at every call site. A dev-only gallery lives at `/dev/components`.
