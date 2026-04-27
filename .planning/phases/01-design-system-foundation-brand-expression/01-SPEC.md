# Phase 1: Design System Foundation + Brand Expression — Specification

**Created:** 2026-04-27
**Ambiguity score:** 0.07 (gate: ≤ 0.20)
**Requirements:** 7 locked

## Goal

Replace the existing OKLCH "warm cafe theme" with a logo-anchored, fully enumerated token system; ship a token-driven component library (Button, Card, Input, Select, Badge, Stars, Icon, FadeIn) browsable at a `/dev/components` route; commit a falsifiable brand-expression spec at `.planning/brand/SPEC.md`; and enforce token usage via an ESLint rule that fails CI on raw hex or off-token utilities — so every page rebuilt in Phases 3 and 4 composes from one source of truth.

## Background

`src/app/globals.css` defines an OKLCH "warm cafe theme" with shadcn-style semantic tokens (`--primary`, `--background`, `--accent`, etc.) but is **not** explicitly anchored to the established logo palette (cream `#EFE7D2`, forest green `#2F5436`, warm orange `#D9682E`) and exposes no documented 50–900 shade scale per brand color. shadcn primitives already exist in `src/components/ui/` (Button, Card, Input, Select, Badge, Switch, Dialog, Sheet, Tabs, Table, Sonner, Skeleton, Scroll-Area, Separator, Dropdown-Menu, Textarea, Label) but **Stars** and **Icon** wrappers do not exist as components — Stars is inline in `src/app/[locale]/page.tsx` (lines 85–99) and `GoogleIcon` is duplicated inline across the same file (lines 103–112, 183, 311, 351, 371, 428, 441). `FadeIn` exists at `src/components/fade-in.tsx` with hard-coded thresholds and no token-driven motion values. Hardcoded hex values still leak through `src/app/[locale]/page.tsx`, `src/app/[locale]/order/confirmation/page.tsx`, `src/components/stickers.tsx`, and `src/components/admin/analytics-dashboard.tsx` (per `.planning/codebase/CONCERNS.md` — `#2D5A3D` in 5+ places, `#f2ead5` in 3+ places, mixed spacing scales). No lint rule prevents this. No design-consultation output exists — typography, photography, voice, motion personality, and watermelon-mascot rules have not been decided. `next-themes` is installed and `globals.css` carries `@custom-variant dark`, but no dark theme is in the v1 REQUIREMENTS scope.

## Requirements

1. **Logo-anchored color tokens (DSY-01)**: CSS variables in `src/app/globals.css` define the brand palette and 50–900 shade scales derived from the logo hex values, replacing the existing OKLCH theme in a single commit (hard cutover).
   - Current: `globals.css` exposes OKLCH `--primary` / `--background` / `--accent` / etc. with no documented anchor to logo hex; no 50–900 scales per brand color
   - Target: `globals.css` defines `--brand-cream-{50..900}` anchored at `#EFE7D2`, `--brand-forest-{50..900}` anchored at `#2F5436`, `--brand-orange-{50..900}` anchored at `#D9682E`, and remaps shadcn semantic tokens (`--background`, `--primary`, `--accent`, etc.) to brand-color references — with the OKLCH "warm cafe theme" block deleted in the same commit
   - Acceptance: `grep -E "oklch\\(" src/app/globals.css` returns zero matches in non-comment lines; `grep -E "(--brand-cream-|--brand-forest-|--brand-orange-)" src/app/globals.css` returns ≥ 27 matches (3 colors × 9 stops each); each anchor stop (`-500`) resolves to its source logo hex within ΔE76 ≤ 2

2. **Typography tokens (DSY-02)**: A complete, named typography scale exists as a single source of truth.
   - Current: `globals.css` declares only `--font-sans`, `--font-mono`, `--font-display`, `--font-heading` — no size, line-height, or weight scale tokens
   - Target: `globals.css` defines named tokens for **display**, **h1**, **h2**, **h3**, **body**, **caption**, and **label** — each with explicit `font-size`, `line-height`, and `font-weight` values; consumed via Tailwind `@theme` extension so utilities like `text-h1` / `text-body` work in JSX
   - Acceptance: `grep -E "(--text-display|--text-h1|--text-h2|--text-h3|--text-body|--text-caption|--text-label)" src/app/globals.css` shows all 7 names present; rendering each typography token in the `/dev/components` gallery shows distinct, hierarchical sizes (display > h1 > h2 > h3 > body > caption ≈ label)

3. **Foundation tokens — spacing, radius, shadow, motion (DSY-03)**: Spacing, radius, shadow, and motion scales are fully enumerated in `globals.css` (no reliance on Tailwind defaults).
   - Current: `globals.css` defines `--radius` plus calc-derived `--radius-sm/md/lg/xl/2xl/3xl/4xl`; no spacing scale, no shadow scale, no motion tokens
   - Target: Spacing scale (`--space-xs` through `--space-xl`) with explicit rem values; radius scale (`--radius-sm/md/lg/xl`); shadow scale (`--shadow-sm/md/lg`); motion tokens (`--duration-fast`, `--duration-base`, `--duration-slow`, `--ease-in`, `--ease-out`, `--ease-spring`) — all exposed through `@theme` extension
   - Acceptance: `grep -E "(--space-|--shadow-|--duration-|--ease-)" src/app/globals.css` shows scales present; the existing hero animation in `globals.css` consumes `--duration-*` and `--ease-*` instead of literal `0.5s` / `ease-out` (verified by `grep -E "(0\\.[0-9]+s|ease-(out|in|in-out))" src/app/globals.css` returning zero matches in non-keyframe lines)

4. **Token-driven component library + gallery route (DSY-04)**: Eight components live in `src/components/ui/` (or its FadeIn neighbor), all consume tokens, and a non-production `/dev/components` route renders each with prop variations and copy-paste snippets.
   - Current: Button, Card, Input, Select, Badge exist in `src/components/ui/` but reference shadcn defaults; Stars + Icon do not exist as components (inline in page.tsx); `FadeIn` exists at `src/components/fade-in.tsx` with hard-coded thresholds; no gallery route
   - Target: `src/components/ui/{button,card,input,select,badge,stars,icon}.tsx` all exist and consume the new tokens; `src/components/fade-in.tsx` is refactored in place to consume `--duration-*` and `--ease-*` motion tokens; `src/app/dev/components/page.tsx` exists, renders every component with size/variant prop variations, shows a copy-paste code block per example, and is reachable in dev only (gated by `process.env.NODE_ENV !== "production"` or excluded from production build)
   - Acceptance: All 8 component files exist; visiting `/dev/components` in `next dev` renders each component in at least 2 variant or size states; running `next build` either omits the route from the production build or returns 404 in production; no component file imports raw hex literals (verified by lint rule from REQ 5)

5. **ESLint enforcement of token usage (DSY-05)**: A custom ESLint rule rejects raw hex literals and off-token color/spacing utilities in customer + admin source files; `npm run lint` fails CI on a deliberate violation.
   - Current: No ESLint rule restricts raw hex; `eslint.config` ships `eslint-config-next` defaults only
   - Target: An ESLint rule (custom `no-restricted-syntax` or a small local plugin) flags `/#[0-9a-fA-F]{3,8}\b/` literals in `*.tsx` / `*.ts` under `src/app/` and `src/components/`; Tailwind theme is configured so off-scale color/spacing utilities (e.g., `text-[#2D5A3D]`, `mt-[37px]`) either don't resolve or are flagged by the same rule
   - Acceptance: Adding `const x = "#FF0000"` to any `src/app/[locale]/*.tsx` causes `npm run lint` to exit non-zero with a token-violation message; running `npm run lint` on the post-cutover codebase exits zero (i.e., all existing hex violations from `.planning/codebase/CONCERNS.md` are resolved as part of this phase or the file is on a documented allowlist)

6. **Brand-expression spec, falsifiable (DSY-06)**: A markdown spec at `.planning/brand/SPEC.md` covers five named pillars and locks a concrete decision per pillar.
   - Current: No brand-expression spec exists; typography choice, photography style, voice, motion personality, and watermelon-mascot usage are undecided
   - Target: `.planning/brand/SPEC.md` exists and contains five `##` sections — **Typography**, **Photography**, **Voice**, **Motion**, **Mascot** — each ending with a single line in the form `**Decision:** <concrete choice>` (e.g., `**Decision:** Display face — Editorial Old, 56–64px, weight 500`); each section also includes ≥ 1 reference image link or external example
   - Acceptance: `grep -E "^## (Typography|Photography|Voice|Motion|Mascot)$" .planning/brand/SPEC.md` returns exactly 5 matches; for each of those 5 sections, a `grep` between the section header and the next `^## ` finds a line matching `^\\*\\*Decision:\\*\\*` — i.e., 5 `Decision:` lines total

7. **Button cutover (DSY-07)**: Every native `<button>` and inline button-shaped trigger in `src/app/` and `src/components/` (customer + admin) is replaced with the `<Button>` component using size + variant props; vendored shadcn/Radix primitives that internally render `<button>` are exempt provided they remain token-styled.
   - Current: Native `<button>` elements, inline class-styled buttons, and ad-hoc CTAs exist across `src/app/[locale]/page.tsx`, the order flow, the cart sheet, and admin pages (CONCERNS.md notes hero CTA, "View Full Menu", reviews badge, etc., all styled inline with mismatched sizes)
   - Target: All non-vendored native `<button>` elements in `src/app/` and `src/components/` (excluding `src/components/ui/` primitives themselves and any code path internal to a Radix/shadcn primitive) compose `<Button>` from `src/components/ui/button.tsx` with explicit `size` and `variant` props
   - Acceptance: `grep -rE "<button[ >]" src/app/ src/components/ --include="*.tsx" | grep -v "src/components/ui/"` returns zero matches; every remaining `<Button>` usage in customer + admin pages includes both `variant` and `size` props (or relies on documented `defaultVariants`); the `/dev/components` gallery shows the Button component in every variant + size combination

## Boundaries

**In scope:**
- Logo-anchored color tokens with 50–900 scales for cream / forest / orange — replacing the OKLCH theme in a single commit
- Typography, spacing, radius, shadow, and motion token scales fully enumerated in `globals.css`
- Eight components in `src/components/ui/` (Button, Card, Input, Select, Badge, Stars, Icon) plus `src/components/fade-in.tsx` refactored in place — all consuming the new tokens
- Dev-only gallery route at `/dev/components` showing variants + copy-paste snippets
- Custom ESLint rule + Tailwind theme that rejects raw hex / off-token utilities and fails CI on violation
- `.planning/brand/SPEC.md` with 5 named sections each ending in a `**Decision:**` line
- Cutover of every non-vendored native `<button>` in `src/app/` + `src/components/` to the new `<Button>` component (customer + admin)
- Inline `Stars` and `GoogleIcon` extraction from `src/app/[locale]/page.tsx` into `src/components/ui/stars.tsx` and `src/components/ui/icon.tsx`

**Out of scope:**
- Dark mode tokens, dark theme, or any UI dark/light toggle — not in v1 REQUIREMENTS; brand is light-anchored; revisit in a future milestone if needed
- Customer or admin **page** rebuilds (homepage / menu / order / cart / confirmation / admin dashboard / admin menu / admin orders) — that is Phases 3 and 4
- Removing Sanity, image-pipeline migration, RLS hardening — that is Phase 2
- Lighthouse / WCAG / motion-safety verification gates — that is Phase 5
- Test infrastructure (Vitest, Playwright, Storybook) — explicitly deferred per PROJECT.md "Tests deferred"
- New token semantic categories beyond color / typography / spacing / radius / shadow / motion — no z-index scale, no opacity scale, no breakpoint tokens beyond Tailwind defaults
- Compatibility shim for the OKLCH theme — hard cutover only; mid-refactor visual regressions on Phase 3/4 surfaces are accepted because those pages will be rebuilt
- Refactor of any vendored shadcn primitive's internals (Dialog close `<button>`, DropdownMenu trigger, etc.) — these are exempt from the DSY-07 cutover provided they remain token-styled
- Component additions beyond the eight named (Button, Card, Input, Select, Badge, Stars, Icon, FadeIn) — anything new gets added in the phase that needs it
- Logo redesign or palette change — the logo is the brand truth; tokens serve it

## Constraints

- **Stack**: Tailwind v4 + shadcn baseline + Next.js 16 App Router stay. Tokens are exposed via `@theme` extension in `globals.css`. No new framework, no Storybook, no CSS-in-JS library.
- **Token format**: CSS custom properties anchored to logo hex values; OKLCH is removed entirely from the post-cutover `globals.css` non-comment lines.
- **Color anchors**: cream `#EFE7D2` (cream-500), forest green `#2F5436` (forest-500), warm orange `#D9682E` (orange-500). The 50–900 scale derives from each anchor; the `-500` stop must equal its anchor within ΔE76 ≤ 2.
- **Lint tooling**: ESLint (already installed via `eslint-config-next`). No new lint runner — extend the existing flat config with a custom `no-restricted-syntax` rule or a tiny local plugin in `eslint/` or `tools/`.
- **Gallery route**: dev-only — must not ship to production. Either gated by `process.env.NODE_ENV !== "production"` (returning `notFound()` in prod) or excluded from the production build.
- **Brand spec location**: `.planning/brand/SPEC.md` — created in this phase; consumed by Phases 3 and 4 as a planning artifact, not as runtime code.
- **No new runtime dependencies** without rationale. Existing `class-variance-authority`, `clsx`, `tailwind-merge`, `@base-ui/react`, `lucide-react` are available; new packages must be justified per PROJECT.md "No new dependencies without rationale."

## Acceptance Criteria

- [ ] `grep -E "oklch\\(" src/app/globals.css` returns zero matches outside comments
- [ ] `grep -E "(--brand-cream-|--brand-forest-|--brand-orange-)" src/app/globals.css` returns ≥ 27 matches and each `-500` stop matches its source logo hex within ΔE76 ≤ 2
- [ ] All seven typography tokens (`--text-display|h1|h2|h3|body|caption|label`) are defined in `globals.css` and rendered distinctly in `/dev/components`
- [ ] Spacing, radius, shadow, and motion scales are present in `globals.css`; existing hero animation references `--duration-*` and `--ease-*` instead of literal seconds / easing names
- [ ] Files `src/components/ui/{button,card,input,select,badge,stars,icon}.tsx` and `src/components/fade-in.tsx` exist, consume tokens (no hex literals inside), and render in `/dev/components`
- [ ] `/dev/components` is reachable in `next dev` and either returns 404 or is excluded from `next build` output
- [ ] `npm run lint` exits zero on the post-cutover codebase
- [ ] Adding `const x = "#FF0000"` to any `src/app/[locale]/*.tsx` causes `npm run lint` to exit non-zero with a token-violation message
- [ ] `.planning/brand/SPEC.md` exists with exactly 5 sections (`Typography`, `Photography`, `Voice`, `Motion`, `Mascot`), each containing at least one `**Decision:**` line
- [ ] `grep -rE "<button[ >]" src/app/ src/components/ --include="*.tsx" | grep -v "src/components/ui/"` returns zero matches
- [ ] Every `<Button>` usage in `src/app/` and `src/components/` (excluding `src/components/ui/`) supplies `variant` and `size` props or documents reliance on `defaultVariants`

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                                          |
|--------------------|-------|------|--------|----------------------------------------------------------------|
| Goal Clarity       | 0.95  | 0.75 | ✓      | 7 deliverables enumerated with exact file paths and grep tests |
| Boundary Clarity   | 0.95  | 0.70 | ✓      | Hard cutover, dark mode out, vendored Radix exempt — explicit  |
| Constraint Clarity | 0.90  | 0.65 | ✓      | ESLint chosen, OKLCH removed, no new deps                      |
| Acceptance Criteria| 0.92  | 0.70 | ✓      | All criteria are grep / build / lint checks                    |
| **Ambiguity**      | 0.07  | ≤0.20| ✓      |                                                                |

## Interview Log

| Round | Perspective    | Question summary                                            | Decision locked                                                                                          |
|-------|----------------|-------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|
| 1     | Researcher     | OKLCH theme — keep, document, or rewrite anchored to logo?  | Rewrite anchored to logo hex with 50–900 scales per brand color                                          |
| 1     | Researcher     | What format does "documented gallery" take?                 | Dedicated dev-only route at `/dev/components` with variants + copy-paste snippets                        |
| 1     | Researcher     | Where does the brand-expression spec live?                  | Markdown at `.planning/brand/SPEC.md` (consumed as planning artifact, not runtime)                       |
| 2     | Researcher     | What lint tooling enforces no raw hex / off-token?          | Custom ESLint rule + Tailwind safelist that fails CI on violation                                        |
| 2     | Researcher     | How explicit should non-color token scales be?              | Full enumeration in `globals.css` (typography, spacing, radius, shadow, motion all named)                |
| 2     | Researcher     | Is dark mode part of Phase 1?                               | Out of scope — light only; revisit in a future milestone                                                 |
| 2     | Simplifier     | If Phase 1 had to be cut by 50%, what's the irreducible core? | No cut — full component refresh stays in scope (Tokens + all 8 components)                              |
| 3     | Boundary Keeper| Precise scope of "every Button" in DSY-07?                  | All native `<button>` + inline triggers in `src/app/` + `src/components/`; vendored Radix exempt          |
| 3     | Boundary Keeper| Falsifiable bar for "spec is done"?                         | 5 named sections each ending in a `**Decision:**` line — verifiable by `grep`                            |
| 3     | Boundary Keeper| What happens to the OKLCH theme when new tokens land?       | Hard cutover in one commit; mid-refactor visual regression on Phase 3/4 surfaces is accepted             |
| 3     | Boundary Keeper| Stars / Icon / FadeIn — refactor in place or net-new?       | Refactor in place: extract `Stars` + `Icon` into `src/components/ui/`; update `fade-in.tsx` to use tokens |

---

*Phase: 01-design-system-foundation-brand-expression*
*Spec created: 2026-04-27*
*Next step: /gsd-discuss-phase 1 — implementation decisions (token derivation method, ESLint rule shape, gallery route gating, etc.)*
