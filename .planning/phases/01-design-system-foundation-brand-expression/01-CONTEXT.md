# Phase 1: Design System Foundation + Brand Expression — Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the existing OKLCH "warm cafe theme" with a logo-anchored, fully enumerated token system; ship a token-driven component library (Button, Card, Input, Select, Badge, Stars, Icon, FadeIn) browsable at `/dev/components`; commit a falsifiable brand-expression spec at `.planning/brand/SPEC.md`; and enforce token usage via an ESLint rule that fails CI on raw hex or off-token utilities.

This phase delivers **the foundation** that Phases 3 and 4 compose against. It does NOT rebuild any customer or admin pages, does NOT touch Sanity/RLS/data layer (Phase 2), and does NOT introduce dark mode.
</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**7 requirements are locked.** See `01-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `01-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- Logo-anchored color tokens with 50–900 scales for cream / forest / orange — replacing the OKLCH theme in a single commit
- Typography, spacing, radius, shadow, and motion token scales fully enumerated in `globals.css`
- Eight components in `src/components/ui/` (Button, Card, Input, Select, Badge, Stars, Icon) plus `src/components/fade-in.tsx` refactored in place — all consuming the new tokens
- Dev-only gallery route at `/dev/components` showing variants + copy-paste snippets
- Custom ESLint rule + Tailwind theme that rejects raw hex / off-token utilities and fails CI on violation
- `.planning/brand/SPEC.md` with 5 named sections each ending in a `**Decision:**` line
- Cutover of every non-vendored native `<button>` in `src/app/` + `src/components/` to the new `<Button>` component (customer + admin)
- Inline `Stars` and `GoogleIcon` extraction from `src/app/[locale]/page.tsx` into `src/components/ui/stars.tsx` and `src/components/ui/icon.tsx`

**Out of scope (from SPEC.md):**
- Dark mode tokens, dark theme, or any UI dark/light toggle
- Customer or admin page rebuilds (Phases 3 and 4)
- Removing Sanity, image-pipeline migration, RLS hardening (Phase 2)
- Lighthouse / WCAG / motion-safety verification gates (Phase 5)
- Test infrastructure (Vitest, Playwright, Storybook) — explicitly deferred per PROJECT.md
- New token semantic categories beyond color / typography / spacing / radius / shadow / motion
- Compatibility shim for the OKLCH theme — hard cutover only
- Refactor of any vendored shadcn primitive's internals
- Component additions beyond the eight named
- Logo redesign or palette change
</spec_lock>

<decisions>
## Implementation Decisions

### Token Derivation Method
- **D-01:** Generate 50–900 shade scales from each logo anchor via **OKLCH lightness sweep** — hold chroma + hue from the anchor, sweep lightness across the scale; final values stored as hex literals in `src/app/globals.css`. Rationale: perceptually uniform steps, anchors land cleanly at the `-500` stop.
- **D-02:** Derivation runs from a **checked-in Node script at `scripts/derive-tokens.ts`** — reproducible; can be re-run if the brand anchors ever change. Output is hex literals committed to `globals.css`; the script is not part of the build.
- **D-03:** SPEC's ΔE76 ≤ 2 acceptance is enforced by **manual verification once + a comment in `globals.css`** noting the verification date and tool. **No CI test** — tests are deferred this milestone per PROJECT.md.

### Brand-Spec Authorship
- **D-04:** **Claude synthesizes** `.planning/brand/SPEC.md` from the logo personality + Graza / Monte Cafe / Craft / Superr DNA refs in PROJECT.md. User reviews and edits each `**Decision:**` line in place. Not delegated to `/design-consultation` — this scope is small and PROJECT.md already has the inputs.
- **D-05:** **Brand spec lands FIRST** in Phase 1 — before tokens, before any component refactor. The Typography `Decision:` line feeds the typography token values; the Motion `Decision:` line feeds the motion token easing curves and durations. Locking design intent before code prevents a token rewrite mid-phase.
- **D-06:** Each of the 5 `Decision:` lines cites **PROJECT.md DNA references (Graza / Monte Cafe / Craft / Superr) plus 1 inline image link per pillar**. Evidence-based and short — no free-form rationale paragraphs.

### Component Variants Strategy
- **D-07:** Button ships with **all 6 shadcn variants** — `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`. The existing `src/components/ui/button.tsx` already supports them via CVA; keeping the full set means lowest churn at call sites during the DSY-07 cutover. Phase 3/4 page rebuilds may need any of them.
- **D-08:** **Explicit `variant` + `size` props at every call site.** `defaultVariants` stays in `button.tsx` (and is documented in the `/dev/components` gallery), but call sites in `src/app/` and `src/components/` MUST pass both props explicitly. Matches the SPEC's "one source of truth" goal and makes the DSY-07 cutover diff legible. (Claude's Discretion — user deferred to research.)
- **D-09:** **Stars + Icon use CVA** like Button/Card/Badge — Stars exposes `size` variants (`sm` / `md` / `lg`) and a `count` prop; Icon wraps `lucide-react` icons with `size` + `intent` (`default` / `muted` / `brand`) variants. Keeps the gallery uniform and consistent with the rest of the library.

### Cutover Sequencing
- **D-10:** **Multiple sequenced PRs, not one big phase PR.** Each plan in Phase 1 lands as its own PR, reviewable in isolation, in this order:
  1. Brand spec (`.planning/brand/SPEC.md`)
  2. Tokens — `scripts/derive-tokens.ts` + hard-cutover commit replacing OKLCH in `globals.css` with brand-anchored tokens + Tailwind `@theme` extension
  3. Component refactor — Button/Card/Input/Select/Badge consume tokens; Stars + Icon extracted from `page.tsx` into `src/components/ui/`; `fade-in.tsx` updated to use motion tokens
  4. `/dev/components` gallery route
  5. ESLint `no-raw-hex` rule + Tailwind off-token guard turned on
  6. Button cutover across all customer + admin pages (DSY-07)
- **D-11:** **ESLint rule turns on LAST** — after every file in `src/` is already token-clean. No allowlist artifact, no temporary `warn` level, no mid-phase exemptions. The rule's first run on the codebase exits zero. Rationale: simplest, matches the SPEC acceptance ("`npm run lint` exits zero on the post-cutover codebase").
- **D-12:** Token landing is a **single hard-cutover commit** (per SPEC) — no compatibility shim, no parallel theme. Mid-refactor visual regressions on Phase 3/4 surfaces are accepted because those pages will be rebuilt.

### Claude's Discretion
- Defaults policy (D-08) was Claude-decided — user deferred. Locked as "Explicit always" because it serves the SPEC's single-source-of-truth goal and avoids a class of "default drift" bugs at call sites. If the explicit-always rule produces noisy diffs in practice, Plan-phase may revisit.

### Folded Todos
None — no pending todos matched this phase.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Lock
- `.planning/phases/01-design-system-foundation-brand-expression/01-SPEC.md` — Locked requirements, boundaries, acceptance criteria. **MUST read before planning.**

### Project-Level
- `.planning/PROJECT.md` — Vision, brand DNA refs (Graza / Monte Cafe / Craft / Superr), key decisions, tests-deferred policy
- `.planning/REQUIREMENTS.md` — 49 v1 requirements; Phase 1 covers DSY-01..07
- `.planning/ROADMAP.md` — Phase 1 entry, dependency graph, canonical refs

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` — Current module layout
- `.planning/codebase/STRUCTURE.md` — File tree
- `.planning/codebase/STACK.md` — Tailwind v4 + shadcn baseline + Next.js 16 App Router; existing dependencies (`class-variance-authority`, `clsx`, `tailwind-merge`, `@base-ui/react`, `lucide-react`)
- `.planning/codebase/CONVENTIONS.md` — Component conventions, file naming
- `.planning/codebase/CONCERNS.md` — Known hex-literal hot spots (`#2D5A3D`, `#f2ead5`), inline Stars/GoogleIcon in `page.tsx`, mixed spacing scales — these are the cleanup surface for DSY-07
- `.planning/codebase/INTEGRATIONS.md` — External services (Sanity, Supabase, Stripe) — not touched in Phase 1 but referenced for cutover-conflict avoidance
- `.planning/codebase/TESTING.md` — Tests deferred this milestone

### Brand Spec (to be created in this phase)
- `.planning/brand/SPEC.md` — 5 sections (Typography / Photography / Voice / Motion / Mascot) each ending in `**Decision:**`. Locked design intent that Phases 3 and 4 reference. Created as the FIRST plan landing.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/button.tsx` — Already CVA-based with the 6 target variants and 8 sizes. Refactor target: replace shadcn token references (`bg-primary`, `bg-muted`, etc.) with brand-token references; otherwise structure is correct.
- `src/components/ui/{card,input,select,badge,dialog,sheet,tabs,table,sonner,skeleton,scroll-area,separator,dropdown-menu,textarea,label,switch}.tsx` — All exist as shadcn primitives consuming current OKLCH tokens. Refactor in place; don't recreate.
- `src/components/fade-in.tsx` — Exists with hard-coded thresholds. Refactor target: consume `--duration-*` and `--ease-*` motion tokens.
- `src/app/globals.css` — Current home of OKLCH theme + `@custom-variant dark` + calc-derived radius scale. Hard-cutover target.
- `scripts/` directory — Existing convention for one-off Node scripts; `derive-tokens.ts` lives here.

### Patterns to Honor
- **CVA + tailwind-merge + clsx** — All shadcn primitives use this trio via `src/lib/utils.ts` (`cn` helper). New components (Stars, Icon) follow the same pattern.
- **`@base-ui/react`** — Button uses `@base-ui/react/button` as the underlying primitive. Don't swap to native `<button>` in the component file itself.
- **Inline icon duplication is the anti-pattern being fixed** — `GoogleIcon` is duplicated 7+ times in `src/app/[locale]/page.tsx`; consolidating into `src/components/ui/icon.tsx` is part of DSY-04.
- **`process.env.NODE_ENV !== "production"` gate** — Convention for dev-only routes per Next.js 16 App Router; `/dev/components` follows this with a `notFound()` early-return in production.

### Integration Points
- `src/app/globals.css` is referenced by every page via the root layout. Hard cutover commit affects every rendered surface — this is intentional per SPEC.
- ESLint flat config lives at `eslint.config.mjs` (or `.js`) and currently extends `eslint-config-next`. The custom `no-raw-hex` rule extends this config — no new lint runner.
- Tailwind v4 `@theme` extension is the bridge from CSS variables to utility classes (`text-h1`, `bg-brand-cream-500`, etc.). Token names in `globals.css` MUST match the utilities downstream agents will reference.
- `src/app/dev/components/page.tsx` is a new route — must be reachable in `next dev`, must 404 or be excluded in `next build`.

### Net-New Files This Phase
- `.planning/brand/SPEC.md`
- `scripts/derive-tokens.ts`
- `src/components/ui/stars.tsx`
- `src/components/ui/icon.tsx`
- `src/app/dev/components/page.tsx`
- ESLint rule file (location TBD by planner — likely `eslint/rules/no-raw-hex.js` or inline in `eslint.config.mjs` via `no-restricted-syntax`)

</code_context>

<specifics>
## Specific Ideas

- **Brand DNA anchors:** Graza (warm/playful), Monte Cafe (editorial/cafe), Craft (artisan), Superr (modern/clean) — per PROJECT.md. Brand spec `Decision:` lines cite these by name.
- **Logo anchors:** cream `#EFE7D2` → `--brand-cream-500`; forest `#2F5436` → `--brand-forest-500`; warm orange `#D9682E` → `--brand-orange-500`. Each `-500` stop must equal its source hex within ΔE76 ≤ 2 (manually verified once).
- **Watermelon mascot** — referenced in PROJECT.md as part of brand identity; the Mascot pillar in `.planning/brand/SPEC.md` locks how/where it appears.
- **Existing animation in `globals.css`** uses literal `0.5s` / `ease-out` — these MUST migrate to `var(--duration-*)` and `var(--ease-*)` references as part of DSY-03 (verifiable by grep).

</specifics>

<deferred>
## Deferred Ideas

- **Dark mode tokens** — `next-themes` is installed and `@custom-variant dark` exists in `globals.css`, but dark mode is NOT in v1 REQUIREMENTS. Revisit in a future milestone.
- **CI test for ΔE76 ≤ 2 anchor accuracy** — D-03 enforces this manually; a unit test would harden it. Belongs in the test-infrastructure milestone (currently deferred per PROJECT.md).
- **z-index scale, opacity scale, breakpoint tokens** — explicitly out of scope per SPEC; reconsider only if Phase 3/4 page rebuilds expose a need.
- **Storybook** — gallery route is `/dev/components` instead. If a richer component documentation tool is wanted later, consider Storybook in a future milestone.
- **Trim Button variants to brand-needed only** — D-07 keeps all 6 shadcn variants; if post-Phase-3/4 review shows `secondary` or `destructive` are unused, prune in a follow-up.

</deferred>

---

*Phase: 01-design-system-foundation-brand-expression*
*Context gathered: 2026-04-29*
