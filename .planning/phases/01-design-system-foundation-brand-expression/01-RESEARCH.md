# Phase 1: Design System Foundation + Brand Expression — Research

**Researched:** 2026-04-29
**Domain:** Design tokens (Tailwind v4 `@theme`) + OKLCH palette generation + ESLint 9 custom rules + shadcn primitive migration + Next.js 16 dev-only routing
**Confidence:** HIGH on Tailwind v4 / shadcn / ESLint mechanics; MEDIUM on Next.js 16 dev-only route gating (NODE_ENV is the canonical signal but the App Router has subtleties); HIGH on culori/OKLCH math.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Token Derivation Method**
- **D-01:** Generate 50–900 shade scales from each logo anchor via **OKLCH lightness sweep** — hold chroma + hue from the anchor, sweep lightness across the scale; final values stored as **hex literals** in `src/app/globals.css`. Anchors land cleanly at the `-500` stop.
- **D-02:** Derivation runs from a **checked-in Node script at `scripts/derive-tokens.ts`** — reproducible; can be re-run if brand anchors change. Output is hex literals committed to `globals.css`; the script is **not** part of the build.
- **D-03:** SPEC's ΔE76 ≤ 2 acceptance is enforced by **manual verification once + a comment in `globals.css`** noting verification date and tool. **No CI test** — tests deferred this milestone per PROJECT.md.

**Brand-Spec Authorship**
- **D-04:** **Claude synthesizes** `.planning/brand/SPEC.md` from logo personality + Graza/Monte Cafe/Craft/Superr DNA refs. User reviews and edits each `**Decision:**` line in place. Not delegated to `/design-consultation` — scope is small, PROJECT.md has the inputs.
- **D-05:** **Brand spec lands FIRST** in Phase 1 — before tokens, before any component refactor. Typography `Decision:` feeds typography token values; Motion `Decision:` feeds motion token easing curves and durations. Locking design intent before code prevents a token rewrite mid-phase.
- **D-06:** Each of the 5 `Decision:` lines cites **PROJECT.md DNA references (Graza / Monte Cafe / Craft / Superr) plus 1 inline image link per pillar**. Evidence-based and short — no free-form rationale paragraphs.

**Component Variants Strategy**
- **D-07:** Button ships with **all 6 shadcn variants** — `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`. Existing `button.tsx` already supports them via CVA; keeping the full set means lowest churn at call sites during DSY-07.
- **D-08:** **Explicit `variant` + `size` props at every call site.** `defaultVariants` stays in `button.tsx` (and is documented in the gallery), but call sites in `src/app/` and `src/components/` MUST pass both props explicitly.
- **D-09:** **Stars + Icon use CVA** — Stars exposes `size` variants (`sm` / `md` / `lg`) and a `count` prop; Icon wraps `lucide-react` with `size` + `intent` (`default` / `muted` / `brand`) variants.

**Cutover Sequencing**
- **D-10:** **Multiple sequenced PRs, not one big phase PR.** Order:
  1. Brand spec (`.planning/brand/SPEC.md`)
  2. Tokens — `scripts/derive-tokens.ts` + hard-cutover commit replacing OKLCH in `globals.css` with brand-anchored tokens + Tailwind `@theme` extension
  3. Component refactor — Button/Card/Input/Select/Badge consume tokens; Stars + Icon extracted from `page.tsx` into `src/components/ui/`; `fade-in.tsx` updated to use motion tokens
  4. `/dev/components` gallery route
  5. ESLint `no-raw-hex` rule + Tailwind off-token guard turned on
  6. Button cutover across all customer + admin pages (DSY-07)
- **D-11:** **ESLint rule turns on LAST** — after every file in `src/` is already token-clean. No allowlist artifact, no temporary `warn` level, no mid-phase exemptions. The rule's first run on the codebase exits zero.
- **D-12:** Token landing is a **single hard-cutover commit** (per SPEC) — no compatibility shim, no parallel theme. Mid-refactor visual regressions on Phase 3/4 surfaces are accepted because those pages will be rebuilt.

### Claude's Discretion
- **D-08 was Claude-decided** — user deferred. Locked as "Explicit always" because it serves the SPEC's single-source-of-truth goal. If explicit-always produces noisy diffs, plan-phase may revisit.

### Deferred Ideas (OUT OF SCOPE)
- **Dark mode tokens** — `next-themes` installed and `@custom-variant dark` exists, but dark mode is NOT in v1 REQUIREMENTS.
- **CI test for ΔE76 ≤ 2** — D-03 enforces manually; belongs in the test-infrastructure milestone.
- **z-index / opacity / breakpoint tokens** — explicitly out of scope per SPEC.
- **Storybook** — gallery route is `/dev/components` instead.
- **Trim Button variants to brand-needed only** — D-07 keeps all 6; prune in a follow-up if `secondary` / `destructive` end up unused.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **DSY-01** | Logo-anchored color tokens with 50–900 scales for cream / forest / orange — hard cutover replaces OKLCH theme | Standard Stack: `culori` for OKLCH lightness sweep + ΔE76; Architecture Pattern: Tailwind v4 `@theme` + dual-block CSS (raw scale + semantic mapping) |
| **DSY-02** | Typography tokens (display / h1 / h2 / h3 / body / caption / label) — full scale with size, line-height, weight | Architecture Pattern: Tailwind v4 `--text-*` namespace generates `text-h1` etc.; the slash modifier `text-h1/8` syntax is built-in for line-height pairing |
| **DSY-03** | Spacing / radius / shadow / motion scales — full enumeration; existing hero animation must consume `--duration-*` and `--ease-*` | Pitfall: Tailwind v4 generates `duration-fast` / `ease-out` utilities ONLY for `--animate-*` namespace tokens; for keyframe `@keyframes` blocks the `var()` references work at the CSS level — no Tailwind utility needed |
| **DSY-04** | Eight components + dev-only `/dev/components` gallery | Architecture Pattern: gated via `process.env.NODE_ENV !== "production"` returning `notFound()`; Don't-Hand-Roll: lucide-react via Icon wrapper, no inline SVGs |
| **DSY-05** | ESLint custom rule + Tailwind theme rejecting raw hex / off-token utilities; CI fails on violation | Standard Stack: ESLint 9 inline virtual plugin (no separate package); two AST selectors needed — one for Literal hex strings, one for JSX className attribute values containing `[#...]` arbitrary syntax |
| **DSY-06** | `.planning/brand/SPEC.md` — 5 sections each ending in `**Decision:**` | No tooling; Claude-authored markdown per D-04 |
| **DSY-07** | Cutover all native `<button>` to `<Button>` with explicit variant+size | Code inventory: **0 native `<button>` already remain in `src/app/` + `src/components/`** outside `ui/` — DSY-07 is largely a verification + explicit-prop pass, not a structural rewrite. The real diff surface is **adding explicit `variant` + `size` props** at existing `<Button>` call sites that currently rely on defaults. |

</phase_requirements>

## Summary

Phase 1 is a coordinated foundation drop. The technical machinery is well-trodden — Tailwind v4 `@theme`, ESLint 9 flat config, CVA primitives, and `culori` for OKLCH math are all stable, documented, and used together by shadcn itself. **No novel infrastructure is required.** The phase's risk is sequencing and verification discipline, not technical unknowns.

Three insights from this research that will shape the plan:

1. **The DSY-05 lint rule needs two AST checks, not one.** A regex for raw hex string literals catches `const x = "#FF0000"` and `fill="#4285F4"`. But Tailwind's arbitrary value escape hatch — `text-[#2D5A3D]` — sits inside a `className` template/string and looks like a normal class name. Catching both requires either two `no-restricted-syntax` selectors or a tiny inline plugin with two rules. CONCERNS.md explicitly flags `text-[#2D5A3D]` and `bg-[#2D5A3D]` as the offending pattern, so this is non-optional.

2. **DSY-07 is mostly a prop-explicitness pass, not a structural rewrite.** A grep audit (run during this research) shows **zero remaining native `<button>` elements** in `src/app/` or `src/components/` outside `src/components/ui/`. The cutover work is to make `variant` and `size` explicit at every existing `<Button>` call site (D-08), which is a focused diff, not a sweeping migration. Plan-phase should size this accordingly.

3. **The hex inventory has four flavors that need different treatment.** (a) Brand-color string literals like `#2D5A3D` in `page.tsx` — must move to tokens. (b) Tailwind arbitrary class values like `bg-[#2D5A3D]` — must move to tokens. (c) Google brand SVG fills (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`) inside `GoogleIcon` — these are **third-party brand colors that legitimately don't belong in the theme**; the rule must allow them, either via comment-disable, a per-file allowlist, or by checking that the hex appears in a recognized "brand-foreign" context. (d) recharts `stroke="#e7e5e4"` and similar in `analytics-dashboard.tsx` — these are vendor-driven and need either token mapping or an allowlist. The HTML entity `&#10003;` (a checkmark glyph) in `confirmation/page.tsx` is a regex false-positive — the rule must require a 3, 6, or 8-char hex (no semicolon followup) so HTML entities don't trip it.

**Primary recommendation:** Use `culori` for OKLCH math and ΔE76 verification, declare tokens in two CSS blocks (a raw scale block + a semantic-alias block in `@theme inline`), gate the gallery via `process.env.NODE_ENV !== "production"` with `notFound()`, and ship the no-raw-hex rule as an inline virtual plugin (two rules: one Literal AST check, one className-string regex check). Order PRs per D-10 strictly.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Color / typography / spacing / radius / shadow / motion tokens | Browser (CSS) | — | Tokens are CSS custom properties on `:root`; consumed via Tailwind utilities at render time |
| OKLCH lightness sweep + ΔE76 check | Build-time tooling (Node) | — | `scripts/derive-tokens.ts` runs locally to emit hex; no runtime cost |
| `@theme inline` directive | Build-time CSS pipeline (PostCSS / Tailwind) | — | Tailwind reads `@theme` at compile and generates utility classes |
| Component primitives (Button / Card / Input / Select / Badge / Stars / Icon) | Browser (React) | — | Standard React components; CVA produces className strings |
| `FadeIn` (IntersectionObserver) | Browser (React + DOM API) | — | Client-only — `"use client"` hook, observes element on scroll |
| `/dev/components` gallery route | Frontend Server (RSC, Next.js App Router) | Browser | Renders server-side; gating decision happens in server context (`process.env.NODE_ENV`) |
| ESLint `no-raw-hex` rule | Build-time tooling (Node, ESLint engine) | — | Lint runs in CI / pre-commit; never ships to client |
| Brand spec markdown | Build-time / planning artifact | — | `.planning/brand/SPEC.md` consumed by future phases as planning input, not runtime code |

## Standard Stack

### Core (already installed — no additions for runtime)

| Library | Version (installed) | Purpose | Why Standard |
|---------|---------------------|---------|--------------|
| `tailwindcss` | ^4 | Token system + utility generation | Already core to project; v4's `@theme` is the chosen mechanism per SPEC `[VERIFIED: package.json]` |
| `class-variance-authority` | ^0.7.1 | Component variant management | Already used by `button.tsx`, `badge.tsx`; D-09 Stars/Icon adopt the same pattern `[VERIFIED: codebase grep]` |
| `clsx` + `tailwind-merge` | ^2.1.1 / ^3.5.0 | className composition + conflict resolution | Already exposed via `src/lib/utils.ts` `cn()` `[VERIFIED: src/lib/utils.ts]` |
| `@base-ui/react` | ^1.3.0 | Headless component primitives | `Button` already wraps `@base-ui/react/button`; keep primitives as-is `[VERIFIED: button.tsx]` |
| `lucide-react` | ^1.6.0 | Icon library | Wrap via Icon CVA per D-09 `[VERIFIED: package.json]` |

### Supporting (NEW — requires PROJECT.md "rationale" justification)

| Library | Version | Purpose | When to Use | Justification |
|---------|---------|---------|-------------|---------------|
| `culori` | ^4.x (latest 2026) | OKLCH parsing, lightness manipulation, ΔE76 (Euclidean in CIELAB) | One-shot script `scripts/derive-tokens.ts` only — NOT a runtime dependency | Used by Tailwind v4 itself for its default palette generation `[CITED: pkgpulse 2026 comparison]`; ESM-native, supports OKLCH and CIELAB conversion in one library; alternatives `chroma-js` (CommonJS legacy, smaller OKLCH support) and `colorjs.io` (heavier API) are inferior for this scope `[ASSUMED: Claude familiarity with library tradeoffs]` |

**Install (devDependency only):**

```bash
npm install --save-dev culori
npm install --save-dev @types/culori   # if user wants TS — culori has its own types in v4
```

**Version verification step for the planner:** Before committing the `derive-tokens.ts` script, run `npm view culori version` and document the exact version pinned in `package.json`. As of late 2025/early 2026, culori is at v4.x `[CITED: pkgpulse 2026]`.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `culori` | `colorjs.io` | Larger API surface, slightly more verbose; both support OKLCH + ΔE. Pick culori for ESM + smaller install. |
| `culori` | `chroma-js` | Legacy CommonJS, OKLCH support is newer / less native. Avoid. |
| Inline ESLint plugin | `eslint-plugin-tailwindcss` `no-arbitrary-value` rule | The plugin is general-purpose; we want a focused rule that lets us shape error messages around brand tokens, and the plugin doesn't catch raw string literals like `const x = "#FF0000"`. Use the inline plugin. |
| `lucide-react` Icon wrapper | Inline SVGs | Already adopted lucide-react; CONCERNS.md explicitly flags inline `GoogleIcon` duplication as anti-pattern to fix. |

### What NOT to Install

- **Storybook** — explicitly out of scope (D from CONTEXT.md, deferred); gallery is the `/dev/components` route.
- **Vitest / Playwright** — tests deferred per PROJECT.md.
- **`tailwindcss-animate`** — deprecated in favor of `tw-animate-css` which is already installed `[CITED: shadcn Tailwind v4 docs]`.
- **A separate ESLint plugin package** — keep the no-raw-hex rule as an inline virtual plugin in `eslint.config.mjs` per D-11 / SPEC constraint "no new lint runner".

## Architecture Patterns

### System Architecture Diagram (Phase 1 deliverables → consumers)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Brand Anchors (logo)                                                       │
│   cream #EFE7D2 · forest #2F5436 · orange #D9682E                          │
└──────────────────────────────────┬─────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Plan #1 (PR1): .planning/brand/SPEC.md                                      │
│   5 sections × 1 **Decision:** line each                                    │
│   Typography Decision ─────────────────┐                                    │
│   Motion Decision ───────────┐         │                                    │
└──────────────────────────────┼─────────┼────────────────────────────────────┘
                               │         │
                               │         │ feeds typography scale values
                               │ feeds duration/easing
                               ▼         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Plan #2 (PR2): scripts/derive-tokens.ts (Node, build-time)                  │
│   culori.oklch(anchor) → sweep L across [50..900] → ΔE76 verify @ 500 stop │
│   Emit hex literals → src/app/globals.css                                   │
│                                                                             │
│   globals.css after PR2:                                                    │
│   ┌────────────────────────────────┐ ┌─────────────────────────────────┐    │
│   │ :root { --brand-cream-50.. }   │ │ @theme inline {                 │    │
│   │ Raw scale block (hex literals) │ │   --color-brand-cream-500:      │    │
│   │   typography (--text-h1, etc)  │─│     var(--brand-cream-500);     │    │
│   │   spacing / radius / shadow    │ │   --color-primary: ...          │    │
│   │   motion (--duration-*, --ease)│ │   --text-h1: var(--text-h1);    │    │
│   └────────────────────────────────┘ └─────────────────────────────────┘    │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ utility classes generated:
                                   │   bg-brand-forest-500, text-h1,
                                   │   duration-base, ease-out, etc.
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Plan #3 (PR3): Component refactor                                           │
│   src/components/ui/{button,card,input,select,badge}.tsx                    │
│      ├── strip shadcn semantic refs (bg-primary, etc) OR remap              │
│      │   semantic tokens to brand colors in @theme block                    │
│      └── consume new tokens via existing CVA structures                     │
│   src/components/ui/stars.tsx          ◄── extracted from page.tsx          │
│   src/components/ui/icon.tsx           ◄── extracted from page.tsx          │
│      └── wraps lucide-react with CVA size + intent variants                 │
│   src/components/fade-in.tsx           ◄── refactored in place              │
│      └── consumes --duration-base, --ease-out (was 0.5s, ease-out)          │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Plan #4 (PR4): src/app/dev/components/page.tsx                              │
│   if (process.env.NODE_ENV === "production") return notFound();             │
│   Renders each component × variants × sizes                                 │
│   Each example has: live render + copy-paste code block                     │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Plan #5 (PR5): ESLint no-raw-hex inline plugin                              │
│   eslint.config.mjs:                                                        │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │ plugins: { local: { rules: {                                       │    │
│   │   "no-raw-hex": <Literal-string AST visitor>,                      │    │
│   │   "no-arbitrary-color-class": <JSX className regex visitor>        │    │
│   │ }}}                                                                │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│   First run on post-cutover codebase → exits zero (D-11)                    │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Plan #6 (PR6): DSY-07 Button cutover (verification + explicit props pass)   │
│   `grep -rE "<button[ >]" src/app src/components --include="*.tsx" |        │
│      grep -v src/components/ui/`  →  zero matches (already true)            │
│   Audit every <Button> call site → ensure explicit variant + size           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
.planning/brand/
└── SPEC.md                          # NEW — 5 pillars × 1 Decision each (PR1)

scripts/
└── derive-tokens.ts                 # NEW — culori-driven OKLCH sweep (PR2)

src/app/
├── globals.css                      # MODIFIED — hard-cutover token system (PR2)
└── dev/
    └── components/
        └── page.tsx                 # NEW — gallery, dev-only (PR4)

src/components/
├── ui/
│   ├── button.tsx                   # MODIFIED — token consumption (PR3)
│   ├── card.tsx                     # MODIFIED — token consumption (PR3)
│   ├── input.tsx                    # MODIFIED — token consumption (PR3)
│   ├── select.tsx                   # MODIFIED — token consumption (PR3)
│   ├── badge.tsx                    # MODIFIED — token consumption (PR3)
│   ├── stars.tsx                    # NEW — extracted, CVA-driven (PR3)
│   └── icon.tsx                     # NEW — lucide-react CVA wrapper (PR3)
└── fade-in.tsx                      # MODIFIED — consume motion tokens (PR3)

eslint.config.mjs                    # MODIFIED — inline plugin + 2 rules (PR5)
```

### Pattern 1: Tailwind v4 `@theme` — Two-Block CSS Structure

**What:** Define raw color scale variables on `:root` (so they exist as standalone CSS custom properties usable by anyone), then alias them inside `@theme inline { }` to expose Tailwind utility classes.

**When to use:** Always. The two-block pattern is the shadcn-recommended migration shape for Tailwind v4 `[CITED: ui.shadcn.com/docs/tailwind-v4]`.

**Example:**

```css
/* src/app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

/* ─── Raw token scale (committed hex output of derive-tokens.ts) ─────── */
/* ΔE76 verified 2026-04-XX via culori — anchors land at -500 within ≤ 2 */
:root {
  /* Brand color scales — anchors at -500 */
  --brand-cream-50:  #fefcf6;
  --brand-cream-100: #fbf6e8;
  /* ... 200, 300, 400 ... */
  --brand-cream-500: #efe7d2;   /* anchor — logo cream */
  /* ... 600, 700, 800, 900 ... */

  --brand-forest-50:  #f0f5f1;
  /* ... */
  --brand-forest-500: #2f5436;  /* anchor — logo forest */
  /* ... */

  --brand-orange-50:  #fdf3eb;
  /* ... */
  --brand-orange-500: #d9682e;  /* anchor — logo warm orange */
  /* ... */

  /* Semantic tokens — alias brand scales (replaces OKLCH theme) */
  --background: var(--brand-cream-50);
  --foreground: var(--brand-forest-900);
  --primary: var(--brand-forest-500);
  --primary-foreground: var(--brand-cream-50);
  --accent: var(--brand-orange-500);
  --accent-foreground: var(--brand-cream-50);
  --muted: var(--brand-cream-100);
  --muted-foreground: var(--brand-forest-700);
  --border: var(--brand-cream-200);
  --input: var(--brand-cream-200);
  --ring: var(--brand-forest-500);
  --destructive: oklch(0.577 0.245 27.325);   /* keep destructive as-is until brand spec rules */

  /* Typography — fed by Brand SPEC Typography Decision (PR1) */
  --text-display: 4rem;
  --text-display--line-height: 1;
  --text-display--font-weight: 600;
  --text-h1: 2.5rem;
  --text-h1--line-height: 1.1;
  --text-h1--font-weight: 600;
  /* ... h2, h3, body, caption, label ... */

  /* Spacing scale */
  --space-xs: 0.5rem;
  --space-sm: 1rem;
  --space-md: 1.5rem;
  --space-lg: 2rem;
  --space-xl: 3rem;

  /* Radius scale */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;

  /* Shadow scale */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

  /* Motion — fed by Brand SPEC Motion Decision (PR1) */
  --duration-fast: 150ms;
  --duration-base: 300ms;
  --duration-slow: 500ms;
  --ease-in:     cubic-bezier(0.4, 0, 1, 1);
  --ease-out:    cubic-bezier(0, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ─── @theme inline — exposes the above as Tailwind utilities ────────── */
@theme inline {
  /* Brand color utilities → bg-brand-cream-500, text-brand-forest-700, etc. */
  --color-brand-cream-50:  var(--brand-cream-50);
  --color-brand-cream-100: var(--brand-cream-100);
  /* ... all stops × 3 colors → 27 utility families ... */
  --color-brand-forest-500: var(--brand-forest-500);
  /* ... */
  --color-brand-orange-500: var(--brand-orange-500);
  /* ... */

  /* Semantic utilities → bg-background, text-primary, bg-primary, etc. */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-destructive: var(--destructive);

  /* Typography utilities → text-display, text-h1, text-body, etc. */
  --text-display: var(--text-display);
  --text-h1: var(--text-h1);
  /* ... h2, h3, body, caption, label ... */

  /* Font families (preserved from existing config) */
  --font-sans: "Geist", "Geist Fallback", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono", "Geist Mono Fallback", ui-monospace, monospace;
  --font-display: var(--font-display), "Georgia", "Times New Roman", serif;

  /* Radius (preserve existing alias chain since shadcn primitives reference it) */
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --radius-xl: var(--radius-xl);
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground; }
  html { @apply font-sans; }
}

/* Existing keyframes — NOW reference motion tokens */
@keyframes hero-fade-up {
  0% { opacity: 0; transform: translateY(16px); }
  100% { opacity: 1; transform: translateY(0); }
}

.hero-fade-in {
  opacity: 0;
  /* WAS: animation: hero-fade-up 0.5s ease-out forwards; */
  animation: hero-fade-up var(--duration-slow) var(--ease-out) forwards;
}
```

> **Source:** Tailwind v4 docs ([Theme variables](https://tailwindcss.com/docs/theme)), shadcn/ui Tailwind v4 docs ([ui.shadcn.com/docs/tailwind-v4](https://ui.shadcn.com/docs/tailwind-v4)). `[VERIFIED: web search 2026-04-29]`

**Why two blocks?** The raw `:root` block makes tokens usable in non-Tailwind contexts (CSS-in-JS, inline styles, animation `var()` calls). The `@theme inline` block tells Tailwind "expose these as utility classes." Wrapping `var(...)` inside `@theme inline` (instead of repeating raw values) means the utilities reference the live custom property — so a future swap of `--brand-forest-500` propagates automatically `[CITED: shadcn/ui Tailwind v4 docs]`.

### Pattern 2: Tailwind v4 `--text-*` Namespace Generates Typography Utilities

**What:** Define `--text-h1: 2.5rem` inside `@theme` and Tailwind generates a `text-h1` utility automatically. Pair with `--text-h1--line-height` and `--text-h1--font-weight` for full typographic control.

**When to use:** For DSY-02. The naming convention `--text-{name}--line-height` is Tailwind's documented mechanism for paired metrics `[CITED: tailwindcss.com/docs/font-size]`.

**Example:**

```css
@theme {
  --text-h1: 2.5rem;
  --text-h1--line-height: 1.1;
  --text-h1--font-weight: 600;
}
```

→ Generates `text-h1` utility that sets `font-size: 2.5rem; line-height: 1.1; font-weight: 600;` in one class.

**At call site:** `<h2 className="text-h1">…</h2>` instead of `<h2 className="text-4xl tracking-tight font-semibold">…</h2>`.

> **Source:** [Tailwind CSS — Font size](https://tailwindcss.com/docs/font-size). `[VERIFIED: web search 2026-04-29]`

### Pattern 3: CVA Component Shape (Stars + Icon)

**What:** Match the existing `button.tsx` / `badge.tsx` shape for the two new components. Both use `class-variance-authority` with named `variants` and `defaultVariants`.

**Example — `src/components/ui/stars.tsx`:**

```tsx
"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const starsVariants = cva(
  "inline-flex gap-0.5 text-brand-orange-500",
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
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={i < count ? "fill-current" : "fill-muted stroke-current opacity-30"}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.368-2.447a1 1 0 00-1.175 0l-3.368 2.447c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
        </svg>
      ))}
    </span>
  );
}
```

> Note the `text-brand-orange-500` class — Stars switches from generic `text-amber-500` to a brand-token color. The brand-spec Mascot or Voice decision may override this; if so the planner adjusts before PR3 lands.

**Example — `src/components/ui/icon.tsx`:**

```tsx
"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
        brand:   "text-primary",
      },
    },
    defaultVariants: { size: "md", intent: "default" },
  }
);

type Props = React.ComponentProps<"svg"> &
  VariantProps<typeof iconVariants> & {
    as: LucideIcon;       // pass the lucide icon component
  };

export function Icon({ as: Component, className, size, intent, ...props }: Props) {
  return <Component className={cn(iconVariants({ size, intent }), className)} {...props} />;
}
```

Call site: `<Icon as={Coffee} size="lg" intent="brand" />`

> **Source:** existing `src/components/ui/button.tsx` and `src/components/ui/badge.tsx` patterns. `[VERIFIED: codebase read]`

### Pattern 4: Dev-Only Route Gating in Next.js 16 App Router

**What:** Inside the route's `page.tsx`, check `process.env.NODE_ENV` at module top and call `notFound()` for production.

**Why:** Next.js 16 `next dev` sets `NODE_ENV=development`; `next build` and `next start` set it to `production` `[CITED: nextjs.org/docs/messages/non-standard-node-env]`. The check is evaluated at request time on the server (RSC), so the production bundle still includes the route — but visiting it returns 404. This satisfies the SPEC's acceptance criterion: "either omits the route from the production build OR returns 404 in production."

**Example — `src/app/dev/components/page.tsx`:**

```tsx
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
// ... other imports

export default function DevComponentsGalleryPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-h1">Component Gallery</h1>
      <p className="text-muted-foreground mt-2 text-body">Dev-only — not shipped to production.</p>

      {/* Section: Button */}
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

        {/* … all other variants × sizes … */}
      </section>

      {/* … Card, Input, Select, Badge, Stars, Icon, FadeIn … */}
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

> **Source:** [Next.js — Non-Standard NODE_ENV](https://nextjs.org/docs/messages/non-standard-node-env), [dennisokeeffe.com — Dev Only Next.js Routes](https://www.dennisokeeffe.com/blog/2021-07-25-dev-only-nextjs-routes). The pattern of calling `notFound()` early in a server component is App Router idiomatic. `[VERIFIED: web search 2026-04-29]`

**Alternative considered:** Excluding the route via `next.config` rewrites or `generateStaticParams` returning `[]`. Rejected — more complex for no benefit; the simple `NODE_ENV` check matches the SPEC acceptance criterion exactly and matches the convention noted in CONTEXT.md `<code_context>`.

### Pattern 5: ESLint 9 Inline Virtual Plugin (No Separate Package)

**What:** Define a "virtual plugin" inline in `eslint.config.mjs` with rules under `plugins.local.rules`. No npm install, no external file required (though one-file-per-rule is cleaner).

**Why:** SPEC says "no new lint runner" and CONTEXT.md notes "inline in `eslint.config.mjs` via `no-restricted-syntax`" as one option. The inline plugin form is more flexible than `no-restricted-syntax` for two reasons: (a) custom error messages with brand-specific wording, (b) ability to write a JSX-className-aware rule that `no-restricted-syntax` cannot express.

**Example — `eslint.config.mjs`:**

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ─── Inline rule: no raw hex string literals ────────────────────────────
// Catches: const x = "#FF0000";  fill="#4285F4";  style={{ color: "#2D5A3D" }}
const noRawHexLiteral = {
  meta: {
    type: "problem",
    docs: { description: "Disallow raw hex color literals; use brand tokens instead" },
    schema: [{
      type: "object",
      properties: {
        allowlist: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    }],
    messages: {
      rawHex: "Raw hex {{value}} is not a brand token. Use a token from globals.css (e.g. var(--brand-forest-500) or a Tailwind utility like bg-brand-forest-500).",
    },
  },
  create(context) {
    const opts = context.options[0] ?? {};
    const allowlist = new Set(opts.allowlist ?? []);
    // 3, 6, or 8-character hex; bounded to avoid HTML entities like &#10003;
    const hexRe = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
    return {
      Literal(node) {
        if (typeof node.value !== "string") return;
        if (!hexRe.test(node.value)) return;
        if (allowlist.has(node.value)) return;
        context.report({ node, messageId: "rawHex", data: { value: node.value } });
      },
      // Catches template literal heads/tails: `bg-[${'#'}…]` etc.
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

// ─── Inline rule: no Tailwind arbitrary color in className ──────────────
// Catches: className="bg-[#2D5A3D]"  className="text-[#f2ead5]"
const noArbitraryColorClass = {
  meta: {
    type: "problem",
    docs: { description: "Disallow Tailwind arbitrary color values; use brand tokens instead" },
    messages: {
      arbitrary: "Tailwind arbitrary color value '{{match}}' is not a brand token. Use a brand utility (e.g. bg-brand-forest-500).",
    },
  },
  create(context) {
    // matches: -[#abc], -[#abcdef], -[#abcdef12] inside any utility prefix
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
        if (v.type === "Literal" && typeof v.value === "string") {
          checkString(node, v.value);
        } else if (v.type === "JSXExpressionContainer") {
          // Walk literal/template children; deep cn() composition is a known limitation
          const expr = v.expression;
          if (expr?.type === "Literal" && typeof expr.value === "string") checkString(node, expr.value);
          if (expr?.type === "TemplateLiteral") {
            for (const q of expr.quasis) checkString(node, q.value?.cooked ?? "");
          }
        }
      },
    };
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),

  // Apply our two custom rules to customer + admin source only
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"],
    plugins: {
      local: { rules: { "no-raw-hex": noRawHexLiteral, "no-arbitrary-color-class": noArbitraryColorClass } },
    },
    rules: {
      "local/no-raw-hex": ["error", {
        // Google brand colors used in GoogleIcon — third-party brand, exempt
        // Plan-phase decides: keep here, OR move GoogleIcon SVG to <img src="/google.svg">
        allowlist: ["#4285F4", "#34A853", "#FBBC05", "#EA4335"],
      }],
      "local/no-arbitrary-color-class": "error",
    },
  },
]);

export default eslintConfig;
```

> **Source:** [ESLint — Configure Plugins](https://eslint.org/docs/latest/use/configure/plugins), [ESLint — Custom Rules](https://eslint.org/docs/latest/extend/custom-rules), [ESLint 9 Flat Config Tutorial](https://dev.to/aolyang/eslint-9-flat-config-tutorial-2bm5). `[VERIFIED: web search 2026-04-29]`

**Allowlist policy:** Google brand colors (4 hex literals) are third-party brand identity and should not be replaced with our tokens. Two options for the planner:
1. **Allowlist them in the rule** (shown above) — terse, but couples lint config to a specific external brand.
2. **Move `GoogleIcon` to a static SVG asset** at `/public/google.svg` and reference via `<Image>` — eliminates the hex literals, no allowlist needed. CONCERNS.md notes the icon is duplicated 7+ times; an external asset is also a cleaner refactor. **Recommended: option 2.**

The recharts `stroke="#e7e5e4"` and `fill="#78716c"` in `analytics-dashboard.tsx` are Tailwind stone-50/stone-500 hex values. Map them to our tokens (`var(--muted)`, `var(--muted-foreground)`) — no allowlist needed.

The `stickers.tsx` palette constants (`#2D5A3D`, `#3D7A52`, `#C85A3A`, etc.) are decorative SVG fills. CONCERNS.md tags this file as a "High" item; depending on whether stickers are kept in the redesign, the planner either: (a) replaces hex constants with `getComputedStyle(document.documentElement).getPropertyValue('--brand-forest-500')` runtime reads, or (b) accepts that decorative stickers may exit the codebase entirely. **Recommendation: keep in stickers.tsx in the allowlist for Phase 1, defer the decision to Phase 3 page rebuild.**

### Pattern 6: OKLCH Lightness Sweep with `culori`

**What:** Take a brand anchor hex, convert to OKLCH, hold chroma + hue, sweep lightness through 9 values for the 50/100/200/.../900 stops. Verify the 500-stop hex round-trips back to the anchor within ΔE76 ≤ 2.

**Example — `scripts/derive-tokens.ts`:**

```ts
// Run with: npx tsx scripts/derive-tokens.ts
// Or compile to JS first if tsx not available.

import { converter, formatHex, parse, differenceEuclidean } from "culori";

type Anchor = { name: string; hex: string };

// Logo anchors — locked per CONTEXT.md
const ANCHORS: Anchor[] = [
  { name: "cream",   hex: "#EFE7D2" },
  { name: "forest",  hex: "#2F5436" },
  { name: "orange",  hex: "#D9682E" },
];

// 9 lightness stops; the index of the anchor's intended stop is 4 (the -500 position).
// Lightness values chosen empirically for editorial cafe palettes; user may tune.
const LIGHTNESS = {
  50:  0.97,
  100: 0.93,
  200: 0.86,
  300: 0.78,
  400: 0.68,
  // 500 = anchor's own L (overwritten below)
  600: 0.50,
  700: 0.40,
  800: 0.28,
  900: 0.18,
};

const toOklch = converter("oklch");
const toLab   = converter("lab");
// ΔE76 = Euclidean distance in CIELAB
const deltaE76 = differenceEuclidean("lab");

for (const anchor of ANCHORS) {
  const oklchAnchor = toOklch(parse(anchor.hex));
  if (!oklchAnchor) throw new Error(`Failed to parse ${anchor.hex}`);

  console.log(`\n--brand-${anchor.name}-* (anchor ${anchor.hex} at -500)`);

  for (const [stop, L] of Object.entries(LIGHTNESS)) {
    const oklch = { ...oklchAnchor, l: L };
    const hex = formatHex(oklch);
    console.log(`  --brand-${anchor.name}-${stop}: ${hex};`);
  }

  // 500 = the anchor itself (re-emit at original hex, then verify round-trip)
  const fiveHundredHex = formatHex(oklchAnchor);
  const dE = deltaE76(parse(anchor.hex), parse(fiveHundredHex));
  console.log(`  --brand-${anchor.name}-500: ${fiveHundredHex};   /* ΔE76 vs anchor: ${dE.toFixed(3)} */`);

  if (dE > 2) {
    throw new Error(`Anchor ${anchor.name} round-trip ΔE76 = ${dE.toFixed(3)} > 2 (acceptance threshold)`);
  }
}
```

**Run output (illustrative — actual hex values determined by culori):**

```
--brand-cream-* (anchor #EFE7D2 at -500)
  --brand-cream-50: #fefcf6;
  --brand-cream-100: #fbf6e8;
  ...
  --brand-cream-500: #efe7d2;   /* ΔE76 vs anchor: 0.000 */
  ...
```

**Verification step (D-03 manual check):**
1. Run `npx tsx scripts/derive-tokens.ts` once.
2. Confirm all three anchors print ΔE76 ≤ 2.
3. Copy generated CSS into `globals.css`.
4. Add comment: `/* OKLCH lightness sweep verified 2026-MM-DD via culori v4.x — ΔE76 ≤ 2 at all anchors */`

> **Source:** [culorijs.org — Color Spaces](https://culorijs.org/color-spaces/), [Wikipedia — Color Difference (CIE76)](https://en.wikipedia.org/wiki/Color_difference). `[VERIFIED: web search 2026-04-29]`

> **Note on hex storage decision (D-01):** The user chose to store hex literals (not OKLCH) in `globals.css`. Rationale not made explicit in CONTEXT.md but most likely **simplicity over OKLCH-native browser support**: hex is universally readable and grep-able, while OKLCH requires understanding the color space to eyeball. Plan-phase will not revisit; this is a design decision, not a technical limitation. Modern browsers all support `oklch()` in CSS values per Baseline 2023 `[ASSUMED: Claude background knowledge — confirm if questioned]`.

### Anti-Patterns to Avoid

- **Defining the raw scale only inside `@theme`** — works for Tailwind utilities but breaks any code that needs the value via plain `var(--brand-forest-500)` in non-Tailwind CSS or inline style. Always declare on `:root` and alias in `@theme inline`.
- **Storing typography as `--font-size-h1`, `--line-height-h1`** — Tailwind v4 won't generate utility classes from arbitrary names; only `--text-*` namespace works. Use `--text-h1` and the documented `--text-h1--line-height` pair `[CITED: tailwindcss.com/docs/font-size]`.
- **Putting the `notFound()` check inside `useEffect` or a client component** — runs after hydration; production users see a flash of the gallery. Keep the check at server-component module top so production users get a 404 response immediately.
- **Using `no-restricted-syntax` alone for the lint rule** — it can match Literal nodes but cannot inspect JSX className strings for embedded `[#hex]` patterns. Two-rule split (Literal-AST + JSXAttribute) is necessary.
- **Letting the `<Button>` `defaultVariants` quietly cover call sites** — D-08 says explicit always. Lint can't enforce this directly without a third custom rule (overkill); enforce via PR review during DSY-07 cutover.
- **Refactoring vendored shadcn primitives' internals** — out of scope per SPEC. Only modify token-consumption inside CVA `variants` blocks; leave Radix/Base UI plumbing intact.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OKLCH math + ΔE76 | Custom converter from hex → OKLCH → hex with manual lightness math | `culori` v4.x | OKLCH ↔ Lab ↔ sRGB conversions are non-trivial; gamut mapping at high chroma needs care; ΔE76 must use CIELAB Euclidean distance (not OKLCH itself, which is "perceptually uniform" but defined differently) |
| Component variants | Hand-coded `if` chains for variant className composition | `class-variance-authority` (already installed) | Type-safe variants, default handling, intersection with className override — all built in |
| className conflict resolution | Manual string concatenation of Tailwind classes | `twMerge(clsx(...))` via `cn()` (already in `src/lib/utils.ts`) | Tailwind's class precedence rules are complex; `tailwind-merge` resolves them correctly |
| Headless button primitive | `<button>` with manual focus / aria handling | `@base-ui/react/button` (already used by `button.tsx`) | Base UI handles disabled / pressed / focus-visible / aria-* correctly across browsers |
| Icon library | Inline `<svg>` per icon | `lucide-react` wrapped via Icon CVA (D-09) | 1500+ icons; tree-shakable; consistent stroke/size; CONCERNS.md flags inline SVG as anti-pattern (`GoogleIcon` ×7) |
| Storybook-style gallery | Building a JSON-driven docs system, MDX, prop tables | Plain Next.js page with `<ComponentExample>` wrapper | Out of scope per SPEC + D-10; keep gallery deliberately simple. The shadcn project itself uses a similar plain-page pattern `[CITED: ui.shadcn.com]` |
| Animation library | Hand-rolled `requestAnimationFrame` for fade-ins | Existing `useFadeIn` IntersectionObserver hook (already in `src/hooks/use-fade-in.ts`) | Refactor in place per SPEC; just have it consume motion tokens instead of hard-coded thresholds |
| OKLCH palette generator UI | Building a tints.dev-style web tool | Just run the script; commit hex output | One-shot; no need for UI |

**Key insight:** Phase 1 is mostly "wire well-trodden libraries together correctly." Every novel-feeling problem (color math, lint rules, variant management) has a battle-tested library. The work is composition discipline, not invention.

## Common Pitfalls

### Pitfall 1: ΔE76 measured in the wrong color space
**What goes wrong:** Calling `differenceEuclidean('oklch')` and reading the result as ΔE76. Wrong — ΔE76 is by definition Euclidean distance in **CIELAB**.
**Why it happens:** culori's API surfaces multiple Euclidean distances; OKLCH-Euclidean and Lab-Euclidean give different numbers.
**How to avoid:** Use `differenceEuclidean('lab')`. Call it with parsed hex values: `dE = differenceEuclidean('lab')(parse('#EFE7D2'), parse(roundtripHex))`.
**Warning signs:** Reported ΔE looks weirdly small (< 0.1) at every stop — that's OKLCH-space measurement, not Lab.
**Source:** [culorijs.org/color-spaces](https://culorijs.org/color-spaces/), [Wikipedia — Color Difference](https://en.wikipedia.org/wiki/Color_difference). `[VERIFIED: web search 2026-04-29]`

### Pitfall 2: Tailwind v4 doesn't generate utilities from non-`--*` namespaces
**What goes wrong:** Defining `--my-h1-size: 2.5rem` and expecting `text-my-h1-size` to work. It won't — Tailwind only generates utilities for documented namespaces (`--color-*`, `--text-*`, `--font-*`, `--spacing`, `--radius-*`, `--shadow-*`, `--breakpoint-*`, `--container-*`, `--leading-*`, `--tracking-*`, `--animate-*`).
**Why it happens:** v4 docs are still spreading; the convention is implicit from "namespaced" examples.
**How to avoid:** Use the documented namespaces. For typography, `--text-h1`. For spacing, `--spacing` (single scale base) or `--space-*` mapped via `@theme`. For motion durations: `--animate-*` for animation utilities, OR keep durations as plain `--duration-*` and reference via `var()` in `@theme inline { --transition-duration: var(--duration-base); }` — both work but `--animate-*` is the v4 idiomatic path for keyframe-based animations.
**Warning signs:** Class doesn't generate; PostCSS build silently emits nothing; user sees unstyled text.
**Source:** [Tailwind CSS — Theme variables](https://tailwindcss.com/docs/theme). `[VERIFIED: web search 2026-04-29]`

### Pitfall 3: `notFound()` called from a client component
**What goes wrong:** Adding the `process.env.NODE_ENV` check inside a `"use client"` component or a `useEffect`. The route renders briefly before redirecting. In production, users see the gallery flash.
**Why it happens:** Habit of putting all logic inside the function body of a client component.
**How to avoid:** The page.tsx of `/dev/components` should be a Server Component (no `"use client"`). The check goes at the very top of the default export, and `notFound()` short-circuits server rendering.
**Warning signs:** Production users briefly see gallery before 404; lighthouse audit reveals shipped JSX in production HTML.

### Pitfall 4: ESLint rule fires on HTML entities
**What goes wrong:** Regex `/#[0-9a-fA-F]{3,8}/` matches `&#10003;` (HTML checkmark entity) in JSX text.
**Why it happens:** Naive regex doesn't anchor or check context.
**How to avoid:** Use `/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/` for full-string Literal matches. For embedded matches in template/className strings, use `\b` word boundary AND require non-digit-followup: `#[0-9a-fA-F]{3,8}\b`. The codebase has exactly one such case — `&#10003;` in `confirmation/page.tsx` — and the bounded regex skips it correctly. Verified by inspecting the file: the `;` immediately following `10003` is not in `[0-9a-fA-F]`, so `\b` triggers.
**Warning signs:** Lint reports a false positive on a string that doesn't contain a real color.

### Pitfall 5: Stickers / Doodles / Charts hex values block the lint cutover
**What goes wrong:** Trying to replace every hex in `stickers.tsx` (16 colors) and `analytics-dashboard.tsx` (recharts string props) with tokens, blocking PR5.
**Why it happens:** D-11 says lint turns on LAST after files are clean.
**How to avoid:** For each file, choose: (a) full token migration, (b) per-file `// eslint-disable-next-line` with a justifying comment, or (c) per-file overrides in `eslint.config.mjs`. SPEC acceptance allows "the file is on a documented allowlist" — file-level overrides via flat-config `files: [...]` blocks are the cleanest expression.
**Warning signs:** PR5 has 50+ disable comments scattered through the code. Better: 3 file-scoped overrides at the bottom of `eslint.config.mjs`.

### Pitfall 6: Brand-spec Decision lines fail the grep test
**What goes wrong:** Writing decisions as `**Decision**: …` (no colon inside the bold) or `**Decision:** …` on a wrapped line where the prefix is at the end of a paragraph.
**Why it happens:** Markdown habit; the spec accepts either `**Decision:**` or `**Decision**:` visually but the grep is `^\*\*Decision:\*\*`.
**How to avoid:** Each Decision line MUST start at column 0 (`^`) and match the literal pattern `**Decision:**` exactly. Use a `grep -E "^\\*\\*Decision:\\*\\*" .planning/brand/SPEC.md | wc -l` self-check during PR1 review — must equal 5.
**Warning signs:** The acceptance check from SPEC fails; grep returns 4 matches when 5 are expected.

## Code Examples

Verified patterns from official sources:

### `globals.css` — token-driven hero animation (DSY-03 acceptance)

```css
/* Source: built from existing globals.css + Tailwind v4 docs + brand-spec Motion */
@keyframes hero-fade-up {
  0% { opacity: 0; transform: translateY(16px); }
  100% { opacity: 1; transform: translateY(0); }
}

.hero-fade-in {
  opacity: 0;
  /* WAS: animation: hero-fade-up 0.5s ease-out forwards; */
  animation: hero-fade-up var(--duration-slow) var(--ease-out) forwards;
}
.hero-fade-in-1 { animation-delay: var(--duration-base); }
.hero-fade-in-2 { animation-delay: calc(var(--duration-base) * 1.5); }
.hero-fade-in-3 { animation-delay: calc(var(--duration-base) * 2); }
.hero-fade-in-4 { animation-delay: calc(var(--duration-base) * 2.5); }

@media (prefers-reduced-motion: reduce) {
  .logo-animate, .hero-fade-in {
    animation: none !important;
    opacity: 1 !important;
    clip-path: none !important;
    transform: none !important;
  }
}
```

> Acceptance grep: `grep -E "(0\\.[0-9]+s|ease-(out|in|in-out))" src/app/globals.css` returns zero matches in non-keyframe lines. The keyframes themselves use `0%` / `100%` — those are different patterns and won't trip the grep.

### `fade-in.tsx` — refactored to consume motion tokens

```tsx
// Source: built from existing fade-in.tsx + Tailwind v4 + brand-spec Motion
"use client";

import { useFadeIn } from "@/hooks/use-fade-in";
import { cn } from "@/lib/utils";

export function FadeIn({
  children,
  className,
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;     // milliseconds — kept as JS number for backwards compat with i*150 callsite
  direction?: "up" | "left" | "right" | "none";
}) {
  const { ref, isVisible } = useFadeIn(0.15);

  const translateClass = {
    up: "translate-y-8",
    left: "translate-x-8",
    right: "-translate-x-8",
    none: "",
  }[direction];

  return (
    <div
      ref={ref}
      className={cn(
        // WAS: transition-all duration-700 ease-out
        "transition-all",
        isVisible
          ? "opacity-100 translate-x-0 translate-y-0"
          : `opacity-0 ${translateClass}`,
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

> Pattern note: inline `style={{}}` references token CSS variables directly. This is the cleanest way to consume tokens for **dynamic** CSS values (the `delay` prop is per-instance). For static values, prefer Tailwind utility classes generated from `--text-*` etc.

### Button call site — explicit variant + size (D-08)

```tsx
// Source: built from src/app/[locale]/page.tsx existing usage
// BEFORE (relies on defaults):
<Button>Order for pickup</Button>

// AFTER (D-08 explicit):
<Button variant="default" size="lg">Order for pickup</Button>
```

### Replace inline `Stars` and `GoogleIcon` (DSY-04 + DSY-07)

```tsx
// BEFORE — src/app/[locale]/page.tsx (inline definitions)
function Stars({ count, size = "sm" }: { count: number; size?: "sm" | "md" }) { /* … */ }
function GoogleIcon({ className }: { className?: string }) { /* … */ }

// AFTER — extracted, page.tsx imports
import { Stars } from "@/components/ui/stars";
// GoogleIcon options:
//   (a) move SVG to /public/google.svg + use <Image>
//   (b) keep as a one-off Icon variant — but DSY-04 ships only Stars + Icon (lucide wrapper);
//       Google SVG is brand-specific and not a lucide icon, so /public/google.svg is recommended
import Image from "next/image";

// usage:
<Stars count={Math.round(place.rating)} size="md" />
<Image src="/google.svg" alt="" width={16} height={16} />
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` JS file | CSS-first `@theme` directive in globals.css | Tailwind v4 (Jan 2025) | All token authoring moves into CSS; no JS config file needed `[CITED: tailwindcss.com/blog/tailwindcss-v4]` |
| `tailwindcss-animate` plugin | `tw-animate-css` (already in this project) | shadcn deprecated tailwindcss-animate alongside Tailwind v4 migration | Different import path; existing project already migrated `[CITED: shadcn/ui Tailwind v4 docs]` |
| `colors: { brand: { 500: '#…' } }` JS object | `--color-brand-500: #…` in `@theme` | Tailwind v4 | Same utility output (`bg-brand-500`); flatter authoring |
| HSL-wrapped CSS variables (`hsl(var(--primary))`) | Direct color values (any format incl. OKLCH or hex) | Tailwind v4 | Drop the `hsl()` wrapper; cleaner; OKLCH-native `[CITED: shadcnblocks.com migration]` |
| `eslintrc.json` config | `eslint.config.mjs` flat config | ESLint 9 (April 2024) | Already migrated in this project; custom rules now go in flat config plugins.local namespace |
| Inline icons + bespoke SVGs | `lucide-react` + Icon CVA wrapper | Industry standard, esp. with shadcn | DRY; CONCERNS.md flags duplicated `GoogleIcon` |
| ΔE2000 (most accurate) | ΔE76 (acceptable for design tokens) | User chose ΔE76 in SPEC acceptance | ΔE2000 is more perceptually accurate but requires more compute and is overkill for ≤2 thresholds; ΔE76 is fine for this use `[CITED: Wikipedia color-difference]` |

**Deprecated/outdated:**
- **`tailwindcss-animate`** — replaced by `tw-animate-css` in shadcn ecosystem; project already on the new package.
- **OKLCH `hsl(var(--x))` wrapper convention from shadcn v0/v1** — replaced by direct value reference in v4.
- **`eslintrc` config** — flat config is the only supported form in ESLint 9.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The reason D-01 stores hex (not OKLCH) in globals.css is simplicity / grep-ability, not browser-coverage caution | Pattern 6 note | LOW — design choice, doesn't affect technical execution |
| A2 | culori v4.x is the current major version as of late 2025/early 2026 | Standard Stack | LOW — verifiable with `npm view culori version` before install; will be confirmed in PR2 |
| A3 | Plan-phase will choose option (b) (move GoogleIcon to /public/google.svg) over allowlisting Google brand colors | Pattern 5 | LOW — either choice satisfies SPEC; option (b) is cleaner per CONCERNS.md |
| A4 | `differenceEuclidean('lab')` from culori produces ΔE76 (CIE76 standard) | Pitfall 1 + Pattern 6 | MEDIUM — verify by spot-checking against an online ΔE76 calculator (e.g. rgbatohex.com/tools/delta-e-calculator) on PR2 first run |
| A5 | The DSY-04 acceptance "renders in at least 2 variant or size states" is satisfied by showing each Button variant and each size as separate examples, not requiring a Cartesian product | Pattern 4 | LOW — SPEC says "at least 2"; planner can choose how exhaustive |
| A6 | Stickers/Doodles `#…` constants and recharts string-prop hex values can be addressed via per-file ESLint overrides without violating SPEC's "documented allowlist" wording | Pitfall 5 | LOW — SPEC explicitly allows allowlist; per-file flat-config overrides are the documented form |
| A7 | The brand-spec Typography Decision can produce concrete font choices Claude can synthesize without user back-and-forth (per D-04) | Brand spec authoring | MEDIUM — D-04 says Claude synthesizes and user edits in place; if user disagrees with all proposed fonts the spec needs another round, briefly delaying PR1 |
| A8 | Modern browsers support CSS `oklch()` natively (Baseline 2023) | State of the Art / D-01 hex storage rationale | LOW — D-01 stores hex anyway, so browser OKLCH support is moot for runtime |

## Open Questions

1. **Google brand color handling — allowlist or static asset?**
   - What we know: `GoogleIcon` is duplicated 7+ times in `page.tsx`; contains 4 Google brand hex values that are third-party brand colors.
   - What's unclear: PR5 lint policy — allowlist or move-to-asset.
   - Recommendation: Move SVG to `/public/google.svg` and use `<Image>` — cleaner, no allowlist needed, matches CONCERNS.md DRY direction. Plan-phase decides in PR4 (gallery) or PR3 (component refactor).

2. **Stickers and Doodles future**
   - What we know: 16 hex constants in `stickers.tsx`; CONCERNS.md flags both `stickers.tsx` (16 hex) and `doodles.tsx` (310 lines, animated SVGs) as Phase 1 cleanup-relevant.
   - What's unclear: Are these components retained in the redesign? Mascot pillar in brand-spec may decide.
   - Recommendation: Per-file lint override for stickers.tsx (and doodles.tsx if hex hits emerge after a deeper grep). Defer "do these components survive" to Phase 3 page rebuild.

3. **`destructive` token color**
   - What we know: Existing globals.css uses `oklch(0.577 0.245 27.325)` for destructive (a red). No brand-anchored red exists in our 3-color palette.
   - What's unclear: Does the brand spec Voice or Mascot section dictate a destructive color? Likely no — destructive is a UI affordance, not a brand expression.
   - Recommendation: Keep `destructive` as a separate, non-brand token (a UI-system red); document in `globals.css` comment; do not require it to anchor to a brand color.

4. **`/dev/components` reachable in `next dev` after token cutover?**
   - What we know: Both PR2 (tokens) and PR4 (gallery) need to coexist; gallery references token utilities.
   - What's unclear: Order discipline — PR3 (components) lands between PR2 and PR4 per D-10. So gallery is built against already-token-clean components. No conflict.
   - Recommendation: Plan-phase enforces D-10 order strictly; CI shouldn't merge PR4 until PR3 is in.

5. **shadcn semantic-token mapping — direct alias or indirection?**
   - What we know: Existing primitives use `bg-primary`, `text-foreground`, `bg-muted`, etc. We can either: (a) point `--primary` directly at `--brand-forest-500`, or (b) keep `--primary` as a separate semantic alias that happens to currently equal `--brand-forest-500`.
   - What's unclear: Future flexibility vs. simplicity tradeoff.
   - Recommendation: **Option (b) — semantic indirection**. `:root { --primary: var(--brand-forest-500); }`. Means future token refactors (e.g., dark mode, theme variants) only swap the alias, not every component file. Matches shadcn's documented convention `[CITED: ui.shadcn.com/docs/theming]`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | derive-tokens.ts, ESLint, Next.js | ✓ | v25.9.0 | — |
| npm | Package manager | ✓ | 11.12.1 | — |
| `culori` | derive-tokens.ts | ✗ — must install | target v4.x | — (must install) |
| `tsx` (TS runtime for one-shot scripts) | derive-tokens.ts | unknown | — | Compile to JS first via `tsc`; or use `node --import tsx` if available |
| Tailwind v4 | Build pipeline | ✓ (via @tailwindcss/postcss) | ^4 | — |
| `eslint` | Lint | ✓ | ^9 | — |
| `lucide-react` | Icon component | ✓ | ^1.6.0 | — |
| `class-variance-authority` | All CVA components | ✓ | ^0.7.1 | — |
| `clsx`, `tailwind-merge` | `cn()` helper | ✓ | ^2.1.1, ^3.5.0 | — |
| `@base-ui/react` | Button, Badge primitives | ✓ | ^1.3.0 | — |
| `tw-animate-css` | Animation utilities | ✓ | ^1.4.0 | — |
| `next` App Router | `/dev/components` route | ✓ | 16.2.1 | — |

**Missing dependencies with no fallback:**
- `culori` — required for PR2 (token derivation). Plan-phase task: install as devDependency, add rationale comment per PROJECT.md "no new deps without rationale".

**Missing dependencies with fallback:**
- `tsx` (or alternative TS runner) — derive-tokens.ts can be authored in plain JS instead of TS to skip this requirement. Recommendation: write `scripts/derive-tokens.ts`, add `tsx` as devDep, document the run command. If tsx adoption is contested, fall back to plain JS file.

**Note on Next.js 16 docs:** AGENTS.md instructs reading `node_modules/next/dist/docs/` for breaking changes. `node_modules` does not exist in the workspace at research time (deps not installed). Plan-phase or implementer must `npm install` first and read the bundled docs directly. The web research above is best-effort but may miss Next.js 16-specific behaviors.

## Validation Architecture

> Skipped — `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`. Tests deferred per PROJECT.md.

## Security Domain

> `security_enforcement` is not explicitly set in `.planning/config.json`; default = enabled. However, Phase 1 is a design-system / tokens / lint-rule phase with **no auth, no input validation, no data flow, no cryptography, no session management**. Threat surface is approximately zero.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a — phase doesn't touch auth |
| V3 Session Management | no | n/a |
| V4 Access Control | no (gallery is dev-only via NODE_ENV) | The `/dev/components` route is gated by `process.env.NODE_ENV !== "production"` returning `notFound()` — verify this is server-side, not bleed-through to client |
| V5 Input Validation | no | n/a — gallery has no inputs; `derive-tokens.ts` is build-time |
| V6 Cryptography | no | n/a |
| V14 Configuration | yes (minimal) | The ESLint rule's allowlist (if used) is committed to git, not a secret. The `derive-tokens.ts` script reads no env vars and outputs deterministic hex |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Dev-only route exposed in production | Information Disclosure | `notFound()` at server-component module top, before any render — Pattern 4 |
| Gallery leaks unintended internal data | Information Disclosure | Gallery shows only example components and copy-paste code; no real customer data, no API calls — design constraint |
| Build-time script (derive-tokens.ts) in supply chain | Tampering | Script reads no network resources; uses `culori` (well-known package); output is committed and reviewable. Run locally only. |

The phase introduces **no new attack surface**. Auth, RLS, image uploads, and customer data flow are all addressed in Phase 2 per the roadmap.

## Project Constraints (from CLAUDE.md / AGENTS.md)

- **AGENTS.md:** "This is NOT the Next.js you know. Read node_modules/next/dist/docs/ before writing code." → Plan-phase / implementer MUST `npm install` first and consult bundled docs for Next.js 16-specific breaking changes (App Router conventions, route handling). Web research is supplemental, not primary.
- **CLAUDE.md skill routing:** "Design system, brand → invoke design-consultation". User has explicitly chosen NOT to delegate to `/design-consultation` (D-04 — Claude synthesizes brand-spec inline). Honor that override.
- **PROJECT.md:** "No new dependencies without rationale" — `culori` requires a documented rationale (added in PR2 commit message + package.json comment if convention permits).
- **PROJECT.md:** "Tests deferred — type-check + manual QA + Lighthouse only" — no Vitest, no Playwright. Manual verification is acceptable for ΔE76 ≤ 2 (D-03).
- **CONVENTIONS.md:** Files use kebab-case (`button.tsx`, `stars.tsx`, `icon.tsx`, `derive-tokens.ts`); components use PascalCase exports; double-quoted strings; 2-space indent; `@/` path alias for src imports.

## Sources

### Primary (HIGH confidence)
- [Tailwind CSS — Theme variables](https://tailwindcss.com/docs/theme) — `@theme` directive, namespaced CSS variables generate utilities
- [Tailwind CSS — Functions and directives](https://tailwindcss.com/docs/functions-and-directives) — `@theme inline` semantics
- [Tailwind CSS — Font size](https://tailwindcss.com/docs/font-size) — `--text-*` namespace + `--text-{name}--line-height` pairing
- [Tailwind CSS v4.0 announcement](https://tailwindcss.com/blog/tailwindcss-v4) — CSS-first migration overview
- [shadcn/ui — Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) — semantic token mapping under `@theme inline`
- [shadcn/ui — Theming](https://ui.shadcn.com/docs/theming) — semantic indirection pattern
- [ESLint — Configure Plugins](https://eslint.org/docs/latest/use/configure/plugins) — flat config virtual plugin
- [ESLint — Custom rule tutorial](https://eslint.org/docs/latest/extend/custom-rule-tutorial) — rule meta + create
- [ESLint — no-restricted-syntax](https://eslint.org/docs/latest/rules/no-restricted-syntax) — alternative path; rejected for this use
- [Next.js — Non-standard NODE_ENV](https://nextjs.org/docs/messages/non-standard-node-env) — NODE_ENV semantics in build vs dev
- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16) — Breaking changes context
- [culori — Color spaces](https://culorijs.org/color-spaces/) — OKLCH parsing, formatting, deltaE
- [Wikipedia — Color difference](https://en.wikipedia.org/wiki/Color_difference) — ΔE76 = Euclidean in CIELAB

### Secondary (MEDIUM confidence — multiple-source corroboration)
- [shadcnblocks — Tailwind v4 + shadcn migration](https://www.shadcnblocks.com/blog/tailwind4-shadcn-themeing/) — practical token migration walkthrough
- [Evil Martians — OKLCH color magic in Tailwind](https://evilmartians.com/chronicles/better-dynamic-themes-in-tailwind-with-oklch-color-magic) — OKLCH lightness sweep idea + ΔE2000 considerations
- [PkgPulse 2026 — culori vs chroma-js](https://www.pkgpulse.com/blog/culori-vs-chroma-js-vs-tinycolor2-color-manipulation-javascript-2026) — culori v4.x is current; ESM-native
- [dennisokeeffe.com — Dev-only Next.js routes](https://www.dennisokeeffe.com/blog/2021-07-25-dev-only-nextjs-routes) — NODE_ENV gating pattern (older but still applicable to App Router; verified against Next 16 NODE_ENV semantics)
- [ESLint 9 Flat Config Tutorial](https://dev.to/aolyang/eslint-9-flat-config-tutorial-2bm5) — flat config plugins.rules pattern
- [Medium — eslint-plugin-local-rules](https://medium.com/@ignatovich.dm/creating-and-using-custom-local-eslint-rules-with-eslint-plugin-local-rules-428d510db78f) — local-rule plugin shape

### Tertiary (LOW confidence — single source, retained for context)
- [Tailwind v4 Design Tokens 2026](https://www.oneminutebranding.com/blog/tailwind-v4-design-tokens) — single-source perspective on token migration
- [Joseph Goins Medium — shadcn + Tailwind v4 + CSS variables](https://medium.com/@joseph.goins/theming-shadcn-with-tailwind-v4-and-css-variables-d602f6b3c258) — community walkthrough
- [Codebase grep evidence] — file inventory of hex literals (page.tsx, stickers.tsx, analytics-dashboard.tsx, confirmation/page.tsx) `[VERIFIED: codebase scan 2026-04-29]`

## Metadata

**Confidence breakdown:**
- Standard stack (culori, CVA, Tailwind, ESLint): HIGH — all are mainstream, current, and verified against multiple sources
- Tailwind v4 `@theme` mechanics: HIGH — cited from official Tailwind docs + corroborated by shadcn migration docs
- ESLint 9 inline plugin shape: HIGH — official ESLint docs + community tutorials agree
- Next.js 16 dev-only route gating: MEDIUM — `NODE_ENV` semantics are well-understood, but Next.js 16 is recent (released ~Q4 2025) and AGENTS.md flags potential breaking changes Claude doesn't know. Implementer SHOULD read `node_modules/next/dist/docs/` before writing the gallery route.
- OKLCH lightness sweep math: HIGH — standard color science; culori's API is documented
- ΔE76 calculation: MEDIUM — culori supports it but the exact API call (`differenceEuclidean('lab')`) needs PR2 spot-check against an external calculator
- Hex inventory: HIGH — verified by direct grep of the codebase
- Brand-spec authoring inputs: MEDIUM — Graza, Monte Cafe, Craft, Superr cited in PROJECT.md, but specific font choices are subjective and need user review per D-04

**Research date:** 2026-04-29
**Valid until:** ~2026-06-01 for Tailwind v4 / shadcn / ESLint specifics; ~2026-05-15 for culori (faster-moving); ~2026-05-30 for Next.js 16 (recent release).

---

*Phase: 01-design-system-foundation-brand-expression*
*Researched: 2026-04-29 — Auto-mode active per session directive*
