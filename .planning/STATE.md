---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Order lifecycle hardening active — U1-U5 complete; U6 admin reconciliation next
last_updated: "2026-08-24T16:30:00+08:00"
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 6
  completed_plans: 6
  percent: 100
---

# Project State: Café Le Den — Website Refactor

**Initialized:** 2026-04-26
**Last updated:** 2026-08-24

## Project Reference

**Core Value:** A customer who lands on the homepage on their phone walks away thinking "this place is real, I want to go here" — and is able to place a pickup order without friction.

**Milestone:** Comprehensive refactor — same features, rebuilt on a coherent design system + consolidated data layer + major visual lift.

**Current focus:** Order Lifecycle Hardening — U6 admin reconciliation after U5 added identity-safe checkout, ambiguous-response recovery, and private bilingual customer tracking.

## Current Position

Phase: 01 (design-system-foundation-brand-expression) — COMPLETE (verified 7/7)
Next: Phase 02 — Data Layer Consolidation + Image Pipeline + RLS Hardening
| Field | Value |
|---|---|
| Phase | 1 — Design System Foundation + Brand Expression (complete) |
| Plan | 6 of 6 plans complete |
| Status | Verified 7/7 — Phase 2 ready (`/gsd-spec-phase 2`) |
| Mode | yolo |
| Granularity | coarse |
| Parallelization | enabled |

**Progress:**

[██░░░░░░░░] 1/5 phases complete

| Phase | Status |
|---|---|
| 1. Design System Foundation + Brand Expression | Complete (6/6 plans, verified 7/7) |
| 2. Data Layer Consolidation + Image Pipeline + RLS Hardening | Not started |
| 3. Customer Site Rebuild | Not started |
| 4. Admin Site Rebuild | Not started |
| 5. Performance, Accessibility, Done-Gate Verification | Not started |

## Performance Metrics

| Metric | Value |
|---|---|
| Phases planned | 5 |
| Plans planned | TBD (per phase) |
| v1 requirements | 49 |
| Coverage | 49/49 (100%) |
| Phases complete | 1 |
| Plans complete | 6 |

## Accumulated Context

### Decisions Logged

(See PROJECT.md "Key Decisions" table for the canonical list. Mirrored here for quick reference.)

- Strict refactor — no new customer features in this milestone.
- Balanced strategy: architecture + visual co-evolve.
- Consolidate to Supabase only; remove Sanity entirely.
- Brand palette anchored by existing logo (cream `#EFE7D2`, forest green `#2F5436`, warm orange `#D9682E`, watermelon mascot).
- Typography, photography, voice, motion deferred to design-consultation.
- Admin remains "single role, any authenticated user," gated by an `admin_users` allowlist (no full role/audit milestone yet).
- Tests deferred — type-check + manual QA + Lighthouse only.
- Caching deferred — keep `force-dynamic`; reintroduce post-data-consolidation.
- EN/FR i18n stays on customer site; admin remains EN-only.
- Done = subjective polish + Figma fidelity ≥ 95% + Lighthouse ≥ 90 + critical CONCERNS.md items resolved.

### Decisions Logged (Phase 1 Plan 01)

- Typography: Editorial New serif display (500, 56–64px) + Inter body (400, 16px/1.5) + caption (500, 13px/1.4) + label (600, 12px/1.3 uppercase) — locked in .planning/brand/SPEC.md
- Photography: Warm-tone product on cream/forest backdrops, 4:5 or 16:9 aspect, no human-face hero shots in v1 — locked in .planning/brand/SPEC.md
- Voice: Friendly-direct first-person plural, 8–14 word sentences, food-forward nouns, no exclamation marks, FR ≤ 1.15× EN — locked in .planning/brand/SPEC.md
- Motion: 150ms/300ms/500ms; cubic-bezier in(0.4,0,1,1) / out(0,0,0.2,1) / spring(0.34,1.56,0.64,1); prefers-reduced-motion respected — locked in .planning/brand/SPEC.md
- Mascot: Watermelon accent only, max 64px, hero corner / footer / confirmation; never buttons, logo replacement, or > --duration-slow — locked in .planning/brand/SPEC.md

### Decisions Logged (Phase 1 Plan 02)

- Brand color scale generated via OKLCH lightness sweep (culori@4.0.2): cream #EFE7D2 / forest #2F5436 / orange #D9682E anchored at -500 stop; ΔE76 = 0.000 for all anchors
- scripts/ excluded from tsconfig.json — build-time tooling not part of Next.js app compilation
- doodle-float/doodle-wiggle use --ease-out as closest available brand token (ease-in-out has no dedicated motion token)
- review-carousel 40s linear infinite kept literal as documented carousel exemption (duration of motion, not motion personality budget)

### Decisions Logged (Phase 1 Plan 03)

- Stars uses text-brand-orange-500 (not text-amber-500) — brand-tokenized per RESEARCH.md Pattern 3
- All 4 Stars call sites in page.tsx use size=sm to preserve pre-refactor visual (inline Stars defaulted sm; new CVA component defaults md)
- GoogleIcon moved to /public/google.svg — 4 Google brand hex fills exit src/ lint surface; ESLint no-raw-hex rule does not scan /public/
- fade-in.tsx adopts cn() + explicit React import; motion tokens via inline style (transitionDuration + transitionTimingFunction)
- Icon component uses `as` prop (LucideIcon) pattern — consistent with lucide-react render model

### Decisions Logged (Phase 1 Plan 04)

- Client boundary wrapper for RSC-incompatible props: icon-demos.tsx wraps Icon+LucideIcon compositions to prevent RSC serialization errors (LucideIcon functions cannot cross RSC boundary as `as` prop)
- src/proxy.ts patched: /dev prefix bypasses i18n middleware (same pattern as /admin) — next-intl was redirecting /dev/components to /en/dev/components causing 404 in all environments
- Gallery page.tsx is a Server Component with zero client markers; notFound() runs server-side before any HTML ships in production

### Decisions Logged (Phase 1 Plan 05)

- stickers.tsx: file-scoped lint override — 16-color decorative SVG palette not mapped to brand tokens; Phase 3 page rebuild may retire stickers entirely
- analytics-dashboard.tsx: file-scoped lint override — recharts string props (stroke/fill) do not accept CSS var(...) as SVG attribute values; runtime getComputedStyle refactor deferred to Phase 4 admin rebuild
- D-11 honored: no brand-internal allowlist, no warn level, first run on post-cutover codebase exits 0 (pre-existing hooks violations fixed as part of plan)
- ESLint 9 inline virtual plugin pattern used (no external package) — two error-level rules: local/no-raw-hex and local/no-arbitrary-color-class

### Decisions Logged (Phase 1 Plan 06)

- D-08 applied at all call sites: every `<Button>` JSX call site in `src/app/` and `src/components/` sets explicit `variant=` and `size=` props; `defaultVariants` preserved in `button.tsx` for gallery documentation only (no default-drift bugs)
- DSY-07 closed; Phase 1 complete — all 7 DSY requirements fulfilled

### Decisions Logged (Phase 1 Verification)

- DSY-07 native `<button>` widget gap (13 multi-line elements: header language picker, dismiss banner, sidebar Sign Out, period filter, qty stepper, modifier pills) accepted as-is; will be replaced when Phase 3 (Customer rebuild) and Phase 4 (Admin rebuild) rewrite their containing files. ESLint guardrails enforce token discipline on every file those phases touch.
- DSY-03 acceptance regex was overbroad — all 9 `(0\.[0-9]+s|ease-(out|in|in-out))` matches in globals.css are token definitions or `var(--ease-*)` references; intent (no bare easing keyword as literal CSS timing value) confirmed met.

### Decisions Logged (Order Lifecycle Hardening)

- The reviewed plan at `docs/plans/2026-08-24-001-feat-order-lifecycle-hardening-plan.md` supersedes the old lifecycle deferrals while preserving guest pay-at-pickup, EN/FR, one café, and the current status vocabulary.
- U1 establishes a pinned local Supabase stack, deterministic synthetic fixtures, a protected checksum-pinned environment sentinel, production-denying target validation, and exact per-run cleanup manifests.
- No remote mutation is allowed during U1. Hosted work remains blocked until the U7 owner-approved sentinel bootstrap and the full independent staging handshake.
- U7, not U1, owns the final aggregate local lifecycle verifier after database, unit, race, browser, and cleanup suites exist.
- U2 adds one protected `admin_users` capability, revokes anonymous direct order writes, and treats Proxy only as an optimistic session refresh. The dashboard, every Server Action, and the upload handler independently reauthorize live membership.
- Synthetic local staff is provisioned only through the Admin API behind the U1 target handshake, stored in ignored `0600` credential/manifest files, and removed by exact membership/user ID cleanup.
- U3 adds versioned lifecycle rows and atomic Postgres routines for authoritative menu snapshots, modifier cardinality, Montréal-local pickup promises, order-level GST/QST rounding, idempotent replay, private tracking, durable rate windows, and optimistic staff transitions with immutable events.
- U3 keeps legacy null-contract rows compatible during expand, while v1 rows can only be created through the atomic routine. Direct application writes cannot forge totals, items, versions, events, or transitions.
- U3 cleanup protects the 72-hour receipt/tracking window. Direct deletion of recoverable v1 orders is blocked; exact test cleanup is service-only, sentinel-gated to local/staging, revokes tracking, and deletes through a scoped guard.
- U3 concurrency proof uses independent PostgreSQL sessions and observed lock waits for identical checkout, price/checkout, modifier-graph/checkout, and advance/cancel races. Generated public database types are now drift-checked.
- U4 replaces the legacy price-bearing request with a strict IDs-only contract, bounded streamed JSON, canonical PostgreSQL-compatible fingerprints, stable safe error codes, and allowlisted PII-free response DTOs.
- U4 requires same-origin requests, a trusted deployment identity, versioned HMAC rate keys, independent create/status/recovery buckets, and exact Turnstile action/hostname verification. Committed replay is resolved before a fresh challenge.
- U4 isolates its non-cookie privileged Supabase client in a server-only module. The three Route Handlers only orchestrate validation, abuse controls, repository calls, and no-store/no-referrer responses; Resend is no longer part of order acceptance.
- Real local service-role proof now covers create, identical replay, one-order persistence, recovery, and status through the public RPC chain. This exposed and fixed missing invoker read/lock privileges without granting direct café/menu updates.
- U5 persists cart identity by canonical menu and modifier IDs only; customer PII is excluded from durable browser storage, and accepted or ambiguous attempts remain non-resubmittable across reloads until authoritative recovery resolves them.
- U5 uses a fresh Turnstile challenge for each bounded submission, consumes private tracking secrets from URL fragments into session-scoped state, removes them from URL/history/referrers, and fails closed for malformed, unknown, or revoked status responses.
- Customer status polling is visibility-aware, monotonic by order version, explicitly stale-safe, and terminal-state bounded. English/French locale switching, reload, Back/Forward, and copied private links preserve the privacy boundary.
- U5 browser verification now waits for the language control's real expanded state, avoiding pre-hydration clicks under parallel production-build load without weakening the accessibility assertions.

### Open Todos

- Execute U6-U8 in dependency order from the reviewed order-lifecycle plan.
- Resume the legacy Phase 2 roadmap only where it does not conflict with the active lifecycle-hardening units.

### Blockers

- Hosted non-production proof requires an owner-confirmed free project, exact production denylist ref, and later U7 bootstrap authority. No hosted operation is authorized before U7.

### Risks Surfaced During Roadmapping

- REQUIREMENTS.md prose claims "47 v1 requirements" but the enumerated REQ-IDs total 49. Roadmap maps all 49. Update the prose total during the next roadmap edit if desired.
- Parallel execution of Phases 1 and 2 is possible but requires careful coordination of `package.json` edits (Sanity removal in Phase 2, potential token-related dev dep additions in Phase 1) to avoid merge conflicts.
- Phase 5 done-gate depends on a Figma file existing (GAT-01); if the user does not produce one, this becomes "or equivalent design spec" — clarify before Phase 5 begins.

## Session Continuity

**Last session:** U5 completed. Correctness and security reviews passed; 133 unit tests, typecheck, lint, the webpack production build, DX token/type/accessibility/contrast checks, and all 24 intercepted Chromium scenarios passed. The hydration-sensitive language-menu assertion also passed three repeated isolated runs. The default Turbopack build remains environment-blocked by its internal PostCSS worker port binding, with no code diagnostic.

**Next session entry point:** Execute U6 authorized admin order listing, mutation conflict recovery, realtime-as-hint reconciliation, freshness health, and stale-safe transitions. Do not touch a hosted target until U7's owner-approved sentinel bootstrap and full target handshake are available.

**Files of record:**

- `/Users/jeongwondo/Developer/leden-website/.planning/PROJECT.md`
- `/Users/jeongwondo/Developer/leden-website/.planning/REQUIREMENTS.md`
- `/Users/jeongwondo/Developer/leden-website/.planning/ROADMAP.md`
- `/Users/jeongwondo/Developer/leden-website/.planning/STATE.md`
- `/Users/jeongwondo/Developer/leden-website/.planning/config.json`
- `/Users/jeongwondo/Developer/leden-website/.planning/codebase/ARCHITECTURE.md`
- `/Users/jeongwondo/Developer/leden-website/.planning/codebase/CONCERNS.md`
- `/Users/jeongwondo/Developer/leden-website/.planning/phases/01-design-system-foundation-brand-expression/01-SPEC.md`
- `/Users/jeongwondo/Developer/leden-website/.planning/phases/01-design-system-foundation-brand-expression/01-CONTEXT.md`
- `/Users/jeongwondo/Developer/leden-website/.planning/phases/01-design-system-foundation-brand-expression/01-DISCUSSION-LOG.md`
- `/Users/jeongwondo/Developer/leden-website/.planning/phases/01-design-system-foundation-brand-expression/01-RESEARCH.md`
- `/Users/jeongwondo/Developer/leden-website/.planning/phases/01-design-system-foundation-brand-expression/01-PATTERNS.md`
- `/Users/jeongwondo/Developer/leden-website/.planning/phases/01-design-system-foundation-brand-expression/01-01-PLAN.md` … `01-06-PLAN.md`

---

*State initialized: 2026-04-26*

**Planned Phase:** 01 (Design System Foundation + Brand Expression) — 6 plans — 2026-05-02T04:18:04.979Z
