---
phase: 01-design-system-foundation-brand-expression
verified: 2026-05-02T15:30:00Z
status: human_needed
score: 6/7
overrides_applied: 0
human_verification:
  - test: "DSY-07: Confirm whether 13 remaining multiline-format native <button> elements are acceptable as-is for Phase 1 completion"
    expected: "Either (a) decision that these widget-pattern buttons are intentionally exempt and Phase 3/4 will replace them, OR (b) they must be converted to <Button variant size> before Phase 1 closes"
    why_human: "The spec-defined acceptance criterion (grep '<button[ >]') returns 0 because all remaining native buttons use multi-line format '<button\\n'. Goal says 'every native <button>' — these are real native buttons but in widget patterns (pills, close, +/- quantity, etc.) that Phase 3/4 will rebuild. Only the developer can decide if this is an acceptable scope interpretation."
  - test: "DSY-03 acceptance criterion wording vs reality — confirm intent is met"
    expected: "Confirm that var(--ease-out) references and --ease-out: token definitions matching the grep pattern 'ease-(out|in|in-out)' are acceptable, and the intent (no bare ease-out CSS keyword as literal timing value) is actually satisfied"
    why_human: "The spec acceptance criterion 'grep -E \"(0.[0-9]+s|ease-(out|in|in-out))\" returns zero' actually returns 9 matches — all are token definitions/references/comments, none are literal CSS timing values. The intent is met but the literal acceptance test does not pass. Developer needs to confirm this is satisfactory."
---

# Phase 1: Design System Foundation + Brand Expression — Verification Report

**Phase Goal:** Replace the existing OKLCH "warm cafe theme" with a logo-anchored, fully enumerated token system; ship a token-driven component library (Button, Card, Input, Select, Badge, Stars, Icon, FadeIn) browsable at a `/dev/components` route; commit a falsifiable brand-expression spec at `.planning/brand/SPEC.md`; and enforce token usage via an ESLint rule that fails CI on raw hex or off-token utilities.

**Verified:** 2026-05-02T15:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | DSY-01: Brand color tokens — `--brand-{cream,forest,orange}-{50..900}` exist with correct logo anchors at -500, OKLCH removed | VERIFIED | 93 brand token lines; -500 stops exactly match logo anchors (`#efe7d2`, `#2f5436`, `#d9682e`); `grep "oklch(" globals.css` → 0 non-comment matches |
| 2 | DSY-02: All 7 typography tokens (`--text-display/h1/h2/h3/body/caption/label`) with size + line-height + weight defined | VERIFIED | All 21 tokens (`7 × 3 properties`) present in `:root`; exposed via `@theme inline` |
| 3 | DSY-03: Spacing, radius, shadow, motion tokens in globals.css; hero animation uses token references not literal values | VERIFIED (with caveat — see note) | 26 scale token lines; hero-fade-up uses `var(--duration-slow) var(--ease-out)`; no bare `ease-out` keyword used as CSS value; animation-delay stagger offsets `1.2s–1.8s` are literal but not caught by spec criterion |
| 4 | DSY-04: 8 components exist, consume tokens, render in 2+ variant/size states in `/dev/components` gallery | VERIFIED | All 7 `src/components/ui/*.tsx` + `src/components/fade-in.tsx` exist; zero hex literals in any component file; gallery confirms Button×26, Card×8, Input×4, Select×4, Badge×18, Stars×12, Icon×12, FadeIn×4 |
| 5 | DSY-05: ESLint `no-raw-hex` + `no-arbitrary-color-class` rules active; `npm run lint` exits 0; adding `#FF0000` causes exit 1 | VERIFIED | `eslint.config.mjs` inline virtual plugin confirmed; `npm run lint` → exit 0 (1 pre-existing warning only); smoke test: adding `const __SMOKE = "#FF0000"` → exit 1 with `local/no-raw-hex` error |
| 6 | DSY-06: `.planning/brand/SPEC.md` with exactly 5 sections (Typography, Photography, Voice, Motion, Mascot), each with a `**Decision:**` line | VERIFIED | `grep -E "^## (Typography|Photography|Voice|Motion|Mascot)$"` → 5 matches; `grep "^\*\*Decision:\*\*"` → 5 matches; 5 inline image/URL references confirmed |
| 7 | DSY-07: Zero native `<button>` elements outside `src/components/ui/` in customer + admin code | PARTIAL — needs human | Spec acceptance grep `grep -rE "<button[ >]"` → 0 matches (PASSES). BUT: 13 native `<button>` elements found with multi-line format (newline after tag name). See Human Verification section. |

**Score:** 6/7 truths verified (1 human decision needed)

---

### DSY-03 Acceptance Criterion Note

The spec states: `grep -E "(0\.[0-9]+s|ease-(out|in|in-out))" src/app/globals.css` should return zero matches in non-keyframe lines. The actual count is **9 matches** — but all 9 are:

- Lines 145–146: token definitions (`--ease-in:`, `--ease-out:`) — these ARE the correct implementation
- Lines 341–342: comments explaining the ease-out substitution
- Lines 344, 348, 357, 377, 382: `var(--ease-out)` token references in animation shorthand — correct token usage

No bare `ease-out` CSS keyword is used as a literal animation timing value. The spirit of the criterion (no raw literal easing keywords) is met. The criterion's regex is too broad — it also matches token definitions and `var()` references. This needs developer acknowledgment (see Human Verification).

Additionally, animation-delay values `1.2s/1.4s/1.6s/1.8s` exist for hero stagger offsets but do NOT match the `0\.[0-9]+s` pattern (only sub-1s decimals match), so they do not trigger the criterion.

---

### DSY-07 Native Button Gap Detail

The spec acceptance grep (`grep -rE "<button[ >]"`) misses any `<button>` tag that has a newline before its first attribute. All 13 remaining native buttons use this multi-line format.

**Affected files and button types:**

| File | Button type | Count |
|------|------------|-------|
| `src/components/layout/announcement-banner.tsx:14` | Dismiss (X icon) | 1 |
| `src/components/layout/header.tsx:73,84,164` | Language dropdown toggle + language picker pills | 3 |
| `src/components/admin/period-selector.tsx:24` | Period filter pills (`Today/Week/Month/Year`) | 1 (in `.map()`) |
| `src/components/admin/sidebar.tsx:71` | Sign Out action | 1 |
| `src/components/admin/menu-item-form.tsx:176` | Remove image (X icon) | 1 |
| `src/components/menu/menu-content.tsx:49,60,149,313,348,357` | Category filters, item row, modifier options, +/- quantity | 6 |

None use raw hex literals (they use Tailwind named utilities like `bg-stone-900`, `bg-red-500`). They are functionally working buttons. Most are in components scheduled for Phase 3/4 rebuilds.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/globals.css` | Hard-cutover OKLCH → brand tokens | VERIFIED | 93 brand color lines; 21 typography tokens; 26 scale tokens; 0 oklch() in non-comment lines |
| `scripts/derive-tokens.ts` | Reproducible OKLCH sweep script | VERIFIED | Exists; added culori@4.0.2 + tsx@4.21.0 as devDeps |
| `src/components/ui/button.tsx` | CVA Button consuming brand tokens | VERIFIED | CVA with 6 variants, 8 sizes; uses semantic token utilities (bg-primary → brand-forest-500) |
| `src/components/ui/card.tsx` | Existing component, no hex literals | VERIFIED | 0 hex literals confirmed |
| `src/components/ui/input.tsx` | Existing component, no hex literals | VERIFIED | 0 hex literals confirmed |
| `src/components/ui/select.tsx` | Existing component, no hex literals | VERIFIED | 0 hex literals confirmed |
| `src/components/ui/badge.tsx` | Existing component, no hex literals | VERIFIED | 0 hex literals confirmed |
| `src/components/ui/stars.tsx` | NEW: CVA Stars (sm/md/lg, count/max) | VERIFIED | Substantive CVA with `starsVariants`; `text-brand-orange-500`; `data-slot="stars"` |
| `src/components/ui/icon.tsx` | NEW: CVA Icon (lucide wrapper, size+intent) | VERIFIED | Substantive CVA with `iconVariants`; `data-slot="icon"` |
| `src/components/fade-in.tsx` | Motion tokens via inline style | VERIFIED | `transitionDuration: "var(--duration-slow)"`, `transitionTimingFunction: "var(--ease-out)"` |
| `src/app/dev/components/page.tsx` | Dev-only gallery with notFound() gate | VERIFIED | `process.env.NODE_ENV === "production"` gate; notFound() at module top; 17 code blocks |
| `src/app/dev/components/icon-demos.tsx` | Client wrapper for Icon RSC boundary | VERIFIED | `"use client"` wrapper for LucideIcon props |
| `eslint.config.mjs` | Inline plugin with no-raw-hex + no-arbitrary-color-class | VERIFIED | Two error-level rules; file-scoped overrides for stickers.tsx + analytics-dashboard.tsx |
| `.planning/brand/SPEC.md` | 5 sections with Decision lines | VERIFIED | Exactly 5 sections; exactly 5 `**Decision:**` lines; 5 inline reference links |
| `public/google.svg` | Google brand SVG (hex literals out of src/) | VERIFIED | 4 Google brand hex fills moved from page.tsx to /public/google.svg |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `globals.css` `:root` tokens | `@theme inline` utilities | CSS variable aliasing | VERIFIED | `--color-brand-cream-500: var(--brand-cream-500)` pattern — 30 brand + 21 typography + shadow/radius aliases |
| `button.tsx` variants | Brand tokens | Semantic alias chain (`bg-primary` → `--primary` → `var(--brand-forest-500)`) | VERIFIED | CVA uses `bg-primary`, `--primary: var(--brand-forest-500)` in `:root` |
| `stars.tsx` | Brand orange token | `text-brand-orange-500` utility class | VERIFIED | Confirmed in CVA base class |
| `fade-in.tsx` | Motion tokens | `style={{ transitionDuration: "var(--duration-slow)" }}` inline style | VERIFIED | Confirmed at lines 39–40 |
| `page.tsx` gallery | All 8 components | Import + JSX render | VERIFIED | All 8 imported; Icon via client wrapper; all render in 2+ states |
| ESLint rule | `src/app/**/*.{ts,tsx}` scope | `files:` array in flat config | VERIFIED | Scope confirmed at lines 128–131 of eslint.config.mjs |
| `src/proxy.ts` | `/dev/components` route | `/dev` prefix bypass before `intlMiddleware` | VERIFIED | `if (pathname.startsWith("/dev")) return NextResponse.next()` added |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `npm run lint` exits 0 on clean codebase | `npm run lint; echo $?` | Exit 0, 1 warning (pre-existing `no-img-element`) | PASS |
| Adding `#FF0000` causes lint failure | Smoke test with `const __SMOKE = "#FF0000"` | Exit 1, `local/no-raw-hex` error at correct line | PASS |
| No oklch() in globals.css non-comment lines | `grep -E "oklch\(" globals.css \| grep -v "//"` | 0 matches | PASS |
| 27+ brand token lines | `grep -E "(--brand-cream-\|--brand-forest-\|--brand-orange-)" globals.css \| wc -l` | 93 | PASS |
| All 7 typography token names | `grep -E "(--text-display\|--text-h1\|--text-h2\|--text-h3\|--text-body\|--text-caption\|--text-label)" globals.css` | All 7 present (21 lines with size/lh/weight) | PASS |
| 5 brand spec sections | `grep -E "^## (Typography\|Photography\|Voice\|Motion\|Mascot)$" .planning/brand/SPEC.md` | 5 matches | PASS |
| 5 Decision lines in spec | `grep -c "^\*\*Decision:\*\*" .planning/brand/SPEC.md` | 5 | PASS |
| Zero native `<button[ >]` acceptance grep | `grep -rE "<button[ >]" src/app/ src/components/ --include="*.tsx" \| grep -v "src/components/ui/"` | 0 matches | PASS (but see DSY-07 note) |
| `npm run build` exits 0 | `npm run build` | Exit 0; 20 routes including `/dev/components` | PASS |
| Gallery production gate | `/dev/components` route in build output | Route appears as `○ (Static)` — notFound() gates it in prod | PASS |

### Requirements Coverage

| Requirement | Plans | Status | Evidence |
|-------------|-------|--------|----------|
| DSY-01: Logo-anchored color tokens (50–900 scales, ΔE76 ≤ 2) | 01-02 | SATISFIED | 93 brand token lines; -500 stops = exact logo hex; ΔE76: 0.000 per comment |
| DSY-02: Typography tokens (display/h1/h2/h3/body/caption/label, size+lh+weight) | 01-02 | SATISFIED | All 21 token properties present; @theme aliases confirmed |
| DSY-03: Spacing, radius, shadow, motion tokens as single source of truth | 01-02 | SATISFIED | 26 scale token lines; hero animation uses token vars |
| DSY-04: Component library (Button+Card+Input+Select+Badge+Stars+Icon+FadeIn) + gallery | 01-03, 01-04 | SATISFIED | All 8 files exist; gallery renders each in 2+ states with copy-paste snippets |
| DSY-05: ESLint rule rejects raw hex; `npm run lint` fails on violation | 01-05 | SATISFIED | Inline virtual plugin confirmed; smoke tests pass |
| DSY-06: Brand spec with 5 pillars each with Decision line | 01-01 | SATISFIED | `.planning/brand/SPEC.md` confirmed; 5/5 sections, 5/5 decisions |
| DSY-07: All <Button> with explicit variant+size; zero native `<button>` | 01-06 | PARTIAL | Acceptance grep passes; 13 multiline native buttons remain — needs human decision |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/admin/period-selector.tsx` | 29–30 | `bg-stone-900 text-white`, `bg-stone-100 text-stone-600` in native button | Warning | Off-brand Tailwind utilities (stone scale), not caught by no-arbitrary-color-class (not arbitrary) |
| `src/components/admin/menu-item-form.tsx` | 179 | `bg-red-500 text-white` in native button | Warning | Off-brand red, not caught by lint (not arbitrary hex) |
| `src/components/admin/sidebar.tsx` | 71 | Native button for Sign Out | Warning | Pattern violation per DSY-07 goal; functional but uncovered |
| `src/components/layout/header.tsx` | 73,84,164 | Native buttons for language toggle/picker | Warning | Pattern violation per DSY-07 goal; functional but uncovered |
| `.planning/REQUIREMENTS.md` | DSY-04/05/06 checkboxes | Checkboxes `[ ]` not updated to `[x]` despite plans being complete | Info | Documentation stale; not a code issue |

Note: `stickers.tsx` and `analytics-dashboard.tsx` hex literals are covered by documented file-scoped ESLint overrides in `eslint.config.mjs` — not anti-patterns.

### Human Verification Required

#### 1. DSY-07: Native Button Scope Decision

**Test:** Review the 13 native `<button>` elements that remain in customer + admin code (listed above). Decide which category applies:

- **(a) Intentionally exempt** — These widget patterns (language picker, dismiss button, modifier option pills, quantity stepper, period filter) are considered UI widgets that Phase 3/4 rebuilds will handle. Phase 1 DSY-07 scope only covered buttons that map cleanly to CTA/action `<Button>` semantics. Accept the current state and mark DSY-07 complete.

- **(b) Must be converted now** — DSY-07 requires ALL non-vendored native buttons regardless of widget type. These 13 buttons need `<Button>` conversion before Phase 1 can close.

**Why human:** The spec acceptance criterion (grep returning 0) literally passes. The goal text says "every native `<button>`". The planning team ran the same acceptance grep during research and found 0 — they believed zero native buttons existed. This is a gap in the acceptance criterion spec, not a fraudulent skip. Only the developer can decide if the remaining widget-pattern buttons are in scope for Phase 1 or acceptable to defer to Phase 3/4 rebuilds.

**Evidence path:** `/Users/jindo/Developer/leden-website/src/components/layout/header.tsx`, `src/components/layout/announcement-banner.tsx`, `src/components/admin/period-selector.tsx`, `src/components/admin/sidebar.tsx`, `src/components/admin/menu-item-form.tsx`, `src/components/menu/menu-content.tsx`

#### 2. DSY-03: Acceptance Criterion Wording Confirmation

**Test:** Confirm that the DSY-03 acceptance criterion intent is met:

- `grep -E "(0\.[0-9]+s|ease-(out|in|in-out))" src/app/globals.css` returns **9 matches**, not 0
- BUT all 9 matches are: token definitions (`--ease-in: cubic-bezier...`), `var(--ease-out)` references, or comments
- No bare `ease-out` keyword is used as a literal CSS animation timing function value
- Animation-delay stagger offsets (`1.2s/1.4s/1.6s/1.8s`) use literal seconds but are not caught by `0\.[0-9]+s` pattern (they don't start with `0.`)

**Expected:** Developer confirms the intent of DSY-03 is satisfied even though the literal acceptance grep returns 9 not 0.

**Why human:** The spec criterion says "returning zero matches" but the regex over-matches. Confirming this is correct requires the developer to judge whether the criterion was testing intent (no raw literal easing values) or the literal grep output.

---

## Gaps Summary

No blocking gaps found. Two items require human decision:

1. **DSY-07 scope** — 13 multiline-format native `<button>` elements not caught by acceptance grep. Functionally working. Most are in Phase 3/4 rebuild targets. The spec acceptance criterion passes; the goal text does not. Human must decide if Phase 1 can close.

2. **DSY-03 criterion wording** — The spec grep returns 9 not 0, but all matches are legitimate token infrastructure. Human must confirm the intent is met.

If the developer confirms both as acceptable (outcome (a) for DSY-07 + acknowledgment of DSY-03 criterion imprecision), Phase 1 can be marked complete and Phase 2 can begin.

---

## Deferred Items

None — all DSY-01 through DSY-07 work is in Phase 1. No items were deferred to later phases in the milestone.

---

_Verified: 2026-05-02T15:30:00Z_
_Verifier: Claude (gsd-verifier) — goal-backward analysis against 7 DSY requirements_
