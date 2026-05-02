---
phase: 01-design-system-foundation-brand-expression
plan: "05"
subsystem: design-system
tags:
  - lint
  - eslint
  - design-system
  - token-enforcement
  - phase-1

dependency_graph:
  requires:
    - "01-04-SUMMARY.md (component gallery, all source files token-clean pre-cutover)"
    - "01-03-SUMMARY.md (GoogleIcon moved to /public, hex literals removed from component tree)"
    - "01-02-SUMMARY.md (globals.css brand tokens, @theme inline utilities)"
  provides:
    - "eslint.config.mjs — inline virtual plugin with two error-level rules (no-raw-hex, no-arbitrary-color-class)"
    - "src/app/[locale]/page.tsx — hex-clean (10 occurrences migrated to brand tokens)"
    - "src/app/[locale]/order/confirmation/page.tsx — hex-clean; &#10003; HTML entity preserved"
    - "src/hooks/use-fade-in.ts — prefers-reduced-motion check moved to useState initializer"
    - "src/components/admin/analytics-dashboard.tsx — set-state-in-effect fixed with async IIFE"
  affects:
    - "src/components/stickers.tsx — file-scoped override applied (hex palette unchanged)"
    - "src/components/admin/analytics-dashboard.tsx — file-scoped override applied (recharts props)"

tech_stack:
  added: []
  patterns:
    - "ESLint 9 flat config inline virtual plugin (no external package)"
    - "Bounded (3|6|8) hex regex with \\b word boundary (prevents HTML entity false-positives)"
    - "File-scoped lint overrides in eslint.config.mjs (not scattered eslint-disable comments)"

key_files:
  created: []
  modified:
    - eslint.config.mjs
    - src/app/[locale]/page.tsx
    - src/app/[locale]/order/confirmation/page.tsx
    - src/hooks/use-fade-in.ts
    - src/components/admin/analytics-dashboard.tsx

decisions:
  - "stickers.tsx: file-scoped override — 16-color decorative SVG palette not mapped to brand tokens; Phase 3 page rebuild may retire stickers entirely (RESEARCH.md Pitfall 5)"
  - "analytics-dashboard.tsx: file-scoped override — recharts string props (stroke/fill) do not accept CSS var(...) as SVG attribute values; runtime getComputedStyle would require client refactor deferred to Phase 4 admin rebuild"
  - "Both overrides consolidated in a single trailing config block in eslint.config.mjs (not inline disable comments)"
  - "D-11 honored: no allowlist, no warn level, first run exits 0"

metrics:
  duration: "~35 minutes"
  completed: "2026-05-02"
  tasks_completed: 3
  files_modified: 5
---

# Phase 1 Plan 05: ESLint Token Enforcement (no-raw-hex + no-arbitrary-color-class) Summary

**One-liner:** Inline ESLint 9 virtual plugin with two error-level token-enforcement rules; bounded hex regex skips HTML entities; first run on post-cutover codebase exits 0.

## What Was Built

### Task 1: Migrate residual hex literals in customer pages

**`src/app/[locale]/page.tsx`** — 10 hex occurrences migrated:

| Location | From | To |
|---|---|---|
| line 98 (hero bg-gradient) | `from-[#f2ead5] via-[#f2ead5]/60` | `from-muted via-muted/60` |
| line 110 (hero subtitle text) | `text-[#2D5A3D]/70` | `text-primary/70` |
| line 220 (featured category label) | `text-[#2D5A3D]` | `text-primary` |
| line 262 (reviews section bg) | `bg-[#2D5A3D]` | `bg-primary` |
| line 295-296 (carousel fade gradients) | `from-[#2D5A3D]` (×2) | `from-primary` (×2) |
| line 366 (about section bg) | `bg-[#f2ead5]` | `bg-muted` |
| line 459 (hours card border-left) | `border-l-[#2D5A3D]` | `border-l-primary` |
| line 475 (today highlight bg) | `bg-[#2D5A3D]/10` | `bg-primary/10` |
| line 481 (today dot indicator) | `bg-[#2D5A3D]` | `bg-primary` |

**`src/app/[locale]/order/confirmation/page.tsx`** — zero hex literals found; `&#10003;` HTML entity preserved at line 64.

Token mapping used:
- `#2D5A3D` → `primary` (semantic alias of `--brand-forest-500`)
- `#f2ead5` → `muted` (semantic alias of `--brand-cream-100`, closest available token)

### Task 2: Decision — stickers.tsx and analytics-dashboard.tsx

**`src/components/stickers.tsx`**: 16 hex occurrences across a 5-constant decorative palette (`GREEN`, `GREEN_LIGHT`, `TERRA`, `TERRA_LIGHT`, `CREAM`). The palette covers croissant browns, highlights, and stems that do not map cleanly to the 3-scale brand token set. Phase 3 page rebuild may retire stickers entirely. **Decision: file-scoped override.**

**`src/components/admin/analytics-dashboard.tsx`**: 11 hex occurrences in recharts `stroke=`/`fill=`/`tick.fill=`/`border=` props. Recharts passes these as SVG attribute strings — `var(--muted)` is not resolved by SVG renderers at this level. Option 2 (runtime `getComputedStyle`) would require a `useEffect` refactor better suited to the Phase 4 admin rebuild. **Decision: file-scoped override.**

### Task 3: eslint.config.mjs inline plugin

Two rules added to a new config block targeting `src/app/**/*.{ts,tsx}`, `src/components/**/*.{ts,tsx}`, `src/lib/**/*.{ts,tsx}`:

**`local/no-raw-hex`** — Visits `Literal` nodes (JS/TS string values) and `TemplateElement` nodes. Matches against `HEX_LITERAL_RE` (`/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/`). Empty allowlist per D-11.

**`local/no-arbitrary-color-class`** — Visits `JSXAttribute` nodes where `name.name === "className"`. Scans string values and template literal quasis against `ARB_HEX_RE` (`/-\[(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8}))(?:\/[0-9.]+)?\]/g`).

Both rules at `"error"` level. File-scoped overrides in a trailing block turn both rules `"off"` for `stickers.tsx` and `analytics-dashboard.tsx`.

**Pre-existing lint errors fixed** (required for D-11 first-run-exits-0 guarantee):

- `confirmation/page.tsx`: `useTranslations` called in async Server Component → replaced with `await getTranslations()` from `next-intl/server`
- `analytics-dashboard.tsx`: `loadData(period)` in `useEffect` body (calls setState synchronously before await) → replaced with inline async IIFE + cancellation guard
- `use-fade-in.ts`: `setIsVisible(true)` in effect body (reduced-motion path) → moved to `useState` lazy initializer with SSR guard

## Smoke Test Results

**Smoke Test 1 — `local/no-raw-hex` Literal violation:**
```
// Appended: const __SMOKE = "#FF0000";
// Output:
//   error  Raw hex #FF0000 is not a brand token. Use a token from globals.css
//          (e.g. var(--brand-forest-500)) or a Tailwind utility (e.g. bg-brand-forest-500)
//          local/no-raw-hex
// Exit: 1  ✓
```

**Smoke Test 2 — `local/no-arbitrary-color-class` violation:**
```
// File: src/app/__smoke.tsx → export default function S() { return <div className="bg-[#FF0000]" />; }
// Output:
//   error  Tailwind arbitrary color value -[#FF0000] is not a brand token.
//          Use a brand utility (e.g. bg-brand-forest-500)  local/no-arbitrary-color-class
// Exit: 1  ✓
```

**Post-cutover clean run:**
```
// npm run lint → 0 errors, 1 pre-existing warning (menu-item-form.tsx no-img-element)
// Exit: 0  ✓
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Fixed pre-existing `react-hooks/rules-of-hooks` violation in confirmation/page.tsx**
- **Found during:** Task 3 (first `npm run lint` run)
- **Issue:** `useTranslations` called inside `async function ConfirmationContent` — ESLint hooks rule flags this as a hooks-in-async violation, even though next-intl supports it in async Server Components
- **Fix:** Replaced `useTranslations("confirmation")` with `await getTranslations("confirmation")` using the async-safe `next-intl/server` API
- **Files modified:** `src/app/[locale]/order/confirmation/page.tsx`
- **Commit:** b8e0956

**2. [Rule 2 - Missing] Fixed pre-existing `react-hooks/set-state-in-effect` in analytics-dashboard.tsx**
- **Found during:** Task 3 (first `npm run lint` run)
- **Issue:** `loadData(period)` called in `useEffect` body; the `useCallback`-wrapped function called `setLoading(true)` synchronously before any await
- **Fix:** Inlined async IIFE with cancellation guard (`let cancelled = false`) directly in the effect; removed `useCallback` dep
- **Files modified:** `src/components/admin/analytics-dashboard.tsx`
- **Commit:** b8e0956

**3. [Rule 2 - Missing] Fixed pre-existing `react-hooks/set-state-in-effect` in use-fade-in.ts**
- **Found during:** Task 3 (first `npm run lint` run)
- **Issue:** `setIsVisible(true)` called synchronously in `useEffect` body for the `prefers-reduced-motion` early-return path
- **Fix:** Moved the check to `useState` lazy initializer with `typeof window !== "undefined"` SSR guard; effect body no longer calls setState
- **Files modified:** `src/hooks/use-fade-in.ts`
- **Commit:** b8e0956

## Commits

| Hash | Message | Files |
|---|---|---|
| be0f741 | feat(01-05): migrate residual brand hex literals in customer pages to tokens | page.tsx |
| b8e0956 | feat(01-05): add inline ESLint plugin + lint exits 0 | eslint.config.mjs, confirmation/page.tsx, analytics-dashboard.tsx, use-fade-in.ts |

## Known Stubs

None — no hardcoded placeholder data or empty stubs introduced in this plan.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- `eslint.config.mjs` exists with `no-raw-hex` rule: confirmed
- `src/app/[locale]/page.tsx` has zero hex literals: confirmed
- `&#10003;` preserved in confirmation/page.tsx: confirmed
- `npm run lint` exits 0: confirmed (be0f741 + b8e0956)
- Smoke test 1 (`#FF0000` Literal): exits 1 with `local/no-raw-hex` message
- Smoke test 2 (`bg-[#FF0000]`): exits 1 with `local/no-arbitrary-color-class` message
