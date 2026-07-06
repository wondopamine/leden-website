---
phase: 01-design-system-foundation-brand-expression
plan: "01"
subsystem: brand
tags:
  - brand
  - design-system
  - phase-1
dependency_graph:
  requires: []
  provides:
    - ".planning/brand/SPEC.md"
  affects:
    - "Plan 02 globals.css typography tokens (--text-display/h1/h2/h3/body/caption/label)"
    - "Plan 02 globals.css motion tokens (--duration-* / --ease-*)"
    - "Phases 3+4 page rebuilds as locked brand intent"
tech_stack:
  added: []
  patterns:
    - "Markdown planning artifact with grep-verifiable acceptance"
key_files:
  created:
    - ".planning/brand/SPEC.md"
  modified: []
decisions:
  - "Typography: Editorial New serif display (500 weight, 56-64px) + Inter body sans (16px/1.5) + Inter caption (13px/1.4) + Inter label (12px/1.3 uppercase)"
  - "Photography: Warm-tone product on cream/forest backdrops, 4:5 or 16:9 aspect, no human-face hero shots in v1"
  - "Voice: Friendly-direct first-person plural, 8-14 word sentences, food-forward nouns, no exclamation marks, FR copy ≤ 1.15× EN"
  - "Motion: 150ms fast / 300ms base / 500ms slow; cubic-bezier in/out/spring; prefers-reduced-motion respected"
  - "Mascot: Watermelon accent only, max 64px, hero corner / footer / confirmation; never buttons, never logo replacement, never > --duration-slow"
metrics:
  duration_seconds: 50
  completed_date: "2026-05-02"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 1 Plan 01: Brand Expression Spec Summary

**One-liner:** Locked brand expression spec — Editorial New serif + Inter body typography scale, warm-tone photography, friendly-direct voice, 150/300/500ms motion budget, watermelon mascot accent rules — all expressed as grep-verifiable Decision lines in `.planning/brand/SPEC.md`.

## What Was Built

Created `.planning/brand/SPEC.md` — a planning artifact (not runtime code) containing five named brand pillars, each with a single concrete `**Decision:**` line consumable directly by downstream Phase 1 token plans.

The file satisfies all 8 acceptance criteria from the plan:

| Check | Result |
|---|---|
| Section count (`## Typography/Photography/Voice/Motion/Mascot`) | 5 |
| Decision count (`**Decision:**`) | 5 |
| DNA citation count (Graza/Monte Cafe/Craft/Superr) | 5 |
| Inline image link count | 5 |
| Section order (Typography first, Mascot last) | Correct |
| Typography Decision specifies px values | Yes |
| Motion Decision specifies ms values | Yes |
| File exists at `.planning/brand/SPEC.md` | Yes |

## Decision Lines (verbatim for Plan 02 consumption)

**Typography Decision:**
> Display — "Editorial New" serif, weight 500, 56–64px / 1.05; H1–H3 — Editorial New 40 / 32 / 24px, weights 500/500/600; body — Inter sans 16px / 1.5; caption — Inter 13px / 1.4 weight 500; label — Inter 12px / 1.3 weight 600 uppercase tracking 0.05em.

**Photography Decision:**
> Warm-tone product photography on cream/forest backdrops; natural daylight, mid-shadow, in-store ambient; aspect 4:5 portrait or 16:9 landscape; no human-face hero shots in v1.

**Voice Decision:**
> Friendly-direct, first-person plural ("we"), 8–14 word sentences, food-forward nouns, no exclamation marks, EN/FR parity (FR copy ≤ 1.15× EN length).

**Motion Decision:**
> Durations — fast 150ms, base 300ms, slow 500ms; eases — in cubic-bezier(0.4,0,1,1), out cubic-bezier(0,0,0.2,1), spring cubic-bezier(0.34,1.56,0.64,1); hero fade-up uses slow + out; respects `prefers-reduced-motion`.

**Mascot Decision:**
> Watermelon mascot — accent role only, max 64px square, allowed in hero corner / footer / confirmation success state; never inside buttons, never as logo replacement, never animated longer than `--duration-slow`.

## Token Derivation Mapping (for Plan 02)

From the Typography and Motion Decisions above, Plan 02 `globals.css` tokens should implement:

**Typography tokens (`--text-*`):**
- `--text-display`: Editorial New, 500, 56–64px / 1.05
- `--text-h1`: Editorial New, 500, 40px
- `--text-h2`: Editorial New, 500, 32px
- `--text-h3`: Editorial New, 600, 24px
- `--text-body`: Inter, 400, 16px / 1.5
- `--text-caption`: Inter, 500, 13px / 1.4
- `--text-label`: Inter, 600, 12px / 1.3, uppercase, tracking 0.05em

**Motion tokens (`--duration-*` / `--ease-*`):**
- `--duration-fast`: 150ms
- `--duration-base`: 300ms
- `--duration-slow`: 500ms
- `--ease-in`: cubic-bezier(0.4,0,1,1)
- `--ease-out`: cubic-bezier(0,0,0.2,1)
- `--ease-spring`: cubic-bezier(0.34,1.56,0.64,1)

## Commits

| Task | Commit | Description |
|---|---|---|
| Task 1: Author SPEC.md | f3c8dfc | feat(01-01): author brand expression spec with 5 pillars and Decision lines |

## Deviations from Plan

None — plan executed exactly as written. The skeleton provided in the plan action was used verbatim; all concrete values (typography sizes, motion durations, easing curves) match the example Decision lines specified in the plan.

## Known Stubs

None. This is a planning artifact; all Decision lines contain concrete, falsifiable values with no placeholders or hedging language.

## Threat Flags

None. This plan creates only a markdown planning artifact — no network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check: PASSED

- [x] `.planning/brand/SPEC.md` exists: FOUND
- [x] Commit f3c8dfc exists in git log
- [x] Section count = 5
- [x] Decision count = 5
- [x] DNA citation count ≥ 5
- [x] Image link count ≥ 5
- [x] Typography Decision contains px values
- [x] Motion Decision contains ms values
