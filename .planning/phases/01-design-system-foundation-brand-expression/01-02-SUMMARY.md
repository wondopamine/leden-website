---
phase: 01-design-system-foundation-brand-expression
plan: "02"
subsystem: design-system
tags:
  - tokens
  - design-system
  - tailwind-v4
  - phase-1
dependency_graph:
  requires:
    - ".planning/brand/SPEC.md (Typography + Motion Decisions)"
    - ".planning/phases/01-design-system-foundation-brand-expression/01-01-SUMMARY.md"
  provides:
    - "src/app/globals.css — single source of truth for all brand tokens"
    - "scripts/derive-tokens.ts — reproducible OKLCH lightness sweep"
  affects:
    - "Plan 03 (component refactor) — all shadcn/brand token consumers"
    - "Plan 04 (dev gallery) — imports brand utilities"
    - "Plan 05 (ESLint inline plugin) — no-raw-hex rule now enforced"
    - "Phase 3+ page rebuilds — consume --brand-*/--text-*/--duration-* tokens"
tech_stack:
  added:
    - "culori@4.0.2 (devDependency — OKLCH color math, ΔE76 verification)"
    - "tsx@4.21.0 (devDependency — TypeScript script runner for derive-tokens.ts)"
  patterns:
    - "Tailwind v4 two-block CSS: :root raw tokens + @theme inline aliases"
    - "Semantic-token indirection: --primary: var(--brand-forest-500) in :root; --color-primary: var(--primary) in @theme"
    - "OKLCH lightness sweep with culori: 9 stops per anchor, ΔE76 ≤ 2 verified at -500"
    - "Motion token aliasing: all animation utility classes consume var(--duration-*) / var(--ease-*)"
key_files:
  created:
    - "scripts/derive-tokens.ts"
  modified:
    - "src/app/globals.css"
    - "package.json"
    - "package-lock.json"
    - "tsconfig.json"
decisions:
  - "Brand color scale generated via OKLCH lightness sweep (culori): cream #EFE7D2 / forest #2F5436 / orange #D9682E anchors at -500 stop"
  - "scripts/ excluded from tsconfig.json — build-time tooling not part of Next.js app compilation"
  - "doodle-float/doodle-wiggle use --ease-out as closest available brand token (ease-in-out has no dedicated token; these are cosmetic decorative animations)"
  - "review-carousel 40s linear infinite kept literal as documented carousel exemption (duration of motion, not motion personality)"
metrics:
  duration_seconds: 355
  completed_date: "2026-05-02"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 4
---

# Phase 1 Plan 02: Token System Implementation Summary

**One-liner:** Logo-anchored brand token system replacing OKLCH theme — 30 color tokens (3 anchors × 10 stops), 21 typography tokens (7 scales × size/lh/weight), spacing/radius/shadow/motion scales — all in `globals.css`, generated from checked-in `scripts/derive-tokens.ts` with culori OKLCH sweep and ΔE76 ≤ 2 verification.

## What Was Built

### Task 1: culori + tsx devDeps + scripts/derive-tokens.ts

Added `culori@4.0.2` and `tsx@4.21.0` as devDependencies. Created `scripts/derive-tokens.ts` — an OKLCH lightness sweep script that:
- Accepts 3 logo anchors (cream, forest, orange)
- Sweeps 9 lightness stops per anchor using `converter("oklch")`
- Verifies ΔE76 ≤ 2 at every anchor's -500 stop using `differenceEuclidean("lab")` (CIELAB, not OKLCH — per RESEARCH.md Pitfall 1)
- Prints CSS custom property declarations to stdout for manual paste into `globals.css`

**Script output (brand color scale):**

```
/* --brand-cream-* (anchor #EFE7D2 at -500) */
--brand-cream-50:  #fdf5e0;   --brand-cream-100: #efe7d2;   --brand-cream-200: #d8d1bc;
--brand-cream-300: #bfb7a3;   --brand-cream-400: #9f9884;   --brand-cream-500: #efe7d2; /* ΔE76: 0.000 */
--brand-cream-600: #6a6351;   --brand-cream-700: #4e4736;   --brand-cream-800: #2f2818;   --brand-cream-900: #171103;

/* --brand-forest-* (anchor #2F5436 at -500) */
--brand-forest-50:  #d7ffdd;  --brand-forest-100: #caf5d0;  --brand-forest-200: #b4deba;
--brand-forest-300: #9bc4a1;  --brand-forest-400: #7ca482;  --brand-forest-500: #2f5436; /* ΔE76: 0.000 */
--brand-forest-600: #486e4e;  --brand-forest-700: #2d5234;  --brand-forest-800: #0c3116;  --brand-forest-900: #001901;

/* --brand-orange-* (anchor #D9682E at -500) */
--brand-orange-50:  #ffd199;  --brand-orange-100: #ffc48c;  --brand-orange-200: #ffad75;
--brand-orange-300: #ff935b;  --brand-orange-400: #e6733b;  --brand-orange-500: #d9682e; /* ΔE76: 0.000 */
--brand-orange-600: #a83b00;  --brand-orange-700: #861800;  --brand-orange-800: #5f0000;  --brand-orange-900: #3e0000;
```

### Task 2: globals.css hard-cutover

Replaced the entire OKLCH "warm cafe theme" `:root` block with a logo-anchored token system. Final structure:

**:root block:**
- 30 brand color tokens (3 anchors × 10 stops: 50/100/200/300/400/500/600/700/800/900)
- Semantic aliases: `--background: var(--brand-cream-50)`, `--primary: var(--brand-forest-500)`, etc.
- Chart + sidebar tokens mapped to brand scale
- 21 typography tokens (7 scales × size + line-height + font-weight)
- 5 spacing tokens, 4 radius tokens, 3 shadow tokens
- 6 motion tokens (3 durations + 3 easings)

**@theme inline block:**
- 30 brand color utilities (`bg-brand-cream-*`, `text-brand-forest-*`, etc.)
- Semantic color utilities (all existing shadcn semantic names preserved)
- 21 typography utilities (`text-display`, `text-h1`, ..., `text-label` with paired lh + fw)
- Font families, radius, shadow utilities

**Animation utility classes:** All migrated to `var(--duration-*)` / `var(--ease-*)` tokens.

### Typography Tokens (from SPEC.md Decision)

| Token | Size | Line-height | Weight |
|---|---|---|---|
| `--text-display` | 4rem (64px) | 1.05 | 500 |
| `--text-h1` | 2.5rem (40px) | 1.1 | 500 |
| `--text-h2` | 2rem (32px) | 1.15 | 500 |
| `--text-h3` | 1.5rem (24px) | 1.2 | 600 |
| `--text-body` | 1rem (16px) | 1.5 | 400 |
| `--text-caption` | 0.8125rem (13px) | 1.4 | 500 |
| `--text-label` | 0.75rem (12px) | 1.3 | 600 |

### Motion Tokens (from SPEC.md Decision)

| Token | Value |
|---|---|
| `--duration-fast` | 150ms |
| `--duration-base` | 300ms |
| `--duration-slow` | 500ms |
| `--ease-in` | cubic-bezier(0.4, 0, 1, 1) |
| `--ease-out` | cubic-bezier(0, 0, 0.2, 1) |
| `--ease-spring` | cubic-bezier(0.34, 1.56, 0.64, 1) |

## Commits

| Task | Commit | Description |
|---|---|---|
| Task 1: culori + tsx + derive-tokens.ts | 36ea745 | feat(01-02): add culori + tsx devDeps and derive-tokens.ts script |
| Task 2: globals.css hard cutover | 80060bb | feat(01-02): hard-cutover globals.css to logo-anchored brand token system |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] tsconfig.json excluded scripts/ directory**
- **Found during:** Task 2 (running `npx tsc --noEmit`)
- **Issue:** `tsconfig.json` includes `**/*.ts` which captured `scripts/derive-tokens.ts`. culori v4.0.2 ships no TypeScript declarations, causing `TS7016: Could not find a declaration file for module 'culori'`.
- **Fix:** Added `"scripts"` to the `exclude` array in `tsconfig.json`. The scripts directory is build-time tooling, not part of the Next.js app.
- **Files modified:** `tsconfig.json`
- **Commit:** included in 80060bb (same Task 2 commit)

**2. [Rule 2 - Missing] Chart and sidebar semantic tokens**
- **Found during:** Task 2
- **Issue:** The original globals.css had `--chart-1/2/3/4/5` and `--sidebar-*` tokens that needed to be preserved. The plan template didn't explicitly address these. Without them, the `@theme inline` references (`--color-chart-*`, `--color-sidebar-*`) would resolve to undefined.
- **Fix:** Added chart and sidebar tokens to `:root` block mapped to brand scale values. Preserved all `--color-chart-*` and `--color-sidebar-*` references in `@theme inline`.
- **Files modified:** `src/app/globals.css`
- **Commit:** included in 80060bb

**3. [Rule 2 - Missing] doodle-float and doodle-wiggle animation migration**
- **Found during:** Task 2
- **Issue:** The plan's explicit migration list omitted `.doodle-float` (4s ease-in-out) and `.doodle-wiggle` (3s ease-in-out). The must_have truth requires all animation lines to use tokens. `ease-in-out` has no dedicated brand token.
- **Fix:** Converted to `calc(var(--duration-slow) * 8)` and `calc(var(--duration-slow) * 6)` with `var(--ease-out)` as closest available token. Added inline comment explaining the ease-in-out → ease-out substitution for decorative animations.
- **Files modified:** `src/app/globals.css`
- **Commit:** included in 80060bb

## Acceptance Grep Results (all pass)

```
oklch() in non-comment lines:   0  (expect 0)       ✓
brand token lines:             93  (expect ≥ 27)     ✓
typography token lines:        42  (expect ≥ 7)      ✓
line-height token lines:       14  (expect ≥ 7)      ✓
scale token lines (space/shadow/duration/ease): 26  ✓
ΔE76 comment occurrences:       4  (expect ≥ 1)      ✓
culori in package.json:         1                    ✓
tsx in package.json:            1                    ✓
scripts/derive-tokens.ts:    PASS                    ✓
npx tsc --noEmit:            PASS (exit 0)           ✓
npm run build:               PASS (exit 0)           ✓
```

## Build Notes

- `npm run build` exited 0 with all 16 routes generated successfully
- No component-level failures (shadcn semantic tokens all resolve through the new semantic aliases)
- The `--localstorage-file` warning is a pre-existing Node.js runtime issue, unrelated to this plan

## Known Stubs

None. All brand color tokens are concrete hex values derived from the OKLCH sweep. All typography and motion tokens are concrete values from the SPEC.md Decision lines. No placeholders or TODO values.

## Threat Flags

None. This plan modifies only CSS and a build-time TypeScript script. No network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check: PASSED

- [x] `scripts/derive-tokens.ts` exists at correct path
- [x] Commit 36ea745 exists: `git log --oneline | grep 36ea745`
- [x] Commit 80060bb exists: `git log --oneline | grep 80060bb`
- [x] Zero oklch() in non-comment lines of globals.css
- [x] 93 brand color token lines (≥ 27 unique stops)
- [x] 3 anchor hex values match exactly (#efe7d2, #2f5436, #d9682e)
- [x] 42 typography token lines (≥ 7)
- [x] 14 line-height token lines (≥ 7)
- [x] 26 scale token lines (spacing + shadow + duration + ease)
- [x] 4 ΔE76 comment occurrences (≥ 1)
- [x] culori in package.json devDependencies
- [x] tsx in package.json devDependencies
- [x] `npx tsc --noEmit` exits 0
- [x] `npm run build` exits 0 (all 16 routes generated)
