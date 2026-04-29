# Phase 1: Design System Foundation + Brand Expression — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `01-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-29 (resumed from checkpoint dated 2026-04-27)
**Phase:** 01-design-system-foundation-brand-expression
**Areas discussed:** Token derivation method, Brand-spec authorship, Component variants strategy, Cutover sequencing

---

## Token derivation method

### Q1: How should the 50–900 shade scales be generated from each logo anchor?

| Option | Description | Selected |
|--------|-------------|----------|
| OKLCH lightness sweep | Hold chroma + hue, sweep lightness across 50–900; perceptually uniform steps | ✓ |
| Hand-tuned by eye | Designer picks each stop manually | |
| Tailwind-style HSL ramp | Fixed HSL lightness pattern across the scale | |
| Radix Colors algorithm | Borrow Radix's accessibility-anchored scale generation | |

**User's choice:** OKLCH lightness sweep — final hex literals stored in `globals.css`.

### Q2: Where does the derivation actually run — ad-hoc in dev, or a checked-in script?

| Option | Description | Selected |
|--------|-------------|----------|
| Checked-in Node script | `scripts/derive-tokens.ts` — reproducible, re-runs on anchor change | ✓ |
| One-shot online tool + paste | Run a web tool once, paste hex values into `globals.css` | |
| Tailwind v4 `@theme inline` / `color-mix` | Express derivation in CSS at build time | |

**User's choice:** Checked-in Node script.

### Q3: How is the SPEC ΔE76 ≤ 2 acceptance enforced?

| Option | Description | Selected |
|--------|-------------|----------|
| Manual verify + comment | Run the check once, note in `globals.css` comment, don't automate | ✓ |
| Unit test in CI | Add a test that fails if any `-500` stop drifts from its source hex | |
| Skip enforcement | Trust the script; don't verify | |

**User's choice:** Manual verify + comment. Tests deferred this milestone.

---

## Brand-spec authorship

### Q1: Who writes `.planning/brand/SPEC.md` (5 sections each ending in **Decision:**)?

| Option | Description | Selected |
|--------|-------------|----------|
| Claude synthesizes, user approves | Draft from PROJECT.md DNA refs; user edits Decision: lines in place | ✓ |
| `/design-consultation` skill drives it | Hand off to the dedicated design-consultation workflow | |
| User writes, Claude formats | User authors decisions; Claude assembles the markdown | |

**User's choice:** Claude synthesizes, user approves.

### Q2: When in Phase 1 does the brand spec land relative to token + component work?

| Option | Description | Selected |
|--------|-------------|----------|
| Brand spec FIRST | Typography Decision: feeds typography tokens; Motion Decision: feeds motion tokens | ✓ |
| Tokens first, brand spec parallel | Land tokens to unblock components, brand spec catches up | |
| All parallel; converge at end | Three streams of work merge late | |

**User's choice:** Brand spec FIRST.

### Q3: What anchors does each Decision: cite to stay grounded?

| Option | Description | Selected |
|--------|-------------|----------|
| PROJECT.md DNA refs + 1 image per pillar | Evidence-based and short | ✓ |
| Free-form rationale paragraph + Decision: | Longer prose, more context | |
| Decision: line only — no rationale | Minimum viable spec | |

**User's choice:** PROJECT.md DNA refs + 1 image per pillar.

---

## Component variants strategy

### Q1: Which Button variants do we ship in the post-cutover library?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep all 6 (shadcn) | default, outline, secondary, ghost, destructive, link — same as today's `button.tsx` | ✓ |
| Trim to brand-needed | Drop variants not currently used in customer/admin pages | |
| Rebrand the names | Replace shadcn vocab with brand-aligned names | |

**User's choice:** Keep all 6 (shadcn).

### Q2: How strict are we about explicit `variant` + `size` props at call sites?

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit always | Every call site passes both props; defaultVariants documented but not relied on | ✓ (Claude's Discretion) |
| Defaults allowed, documented | Keep defaultVariants; let call sites omit when default is correct | |
| Explicit for variant, default size | Hybrid — variant explicit, size defaults allowed | |

**User's choice:** "I don't understand this question. Take the best approach on this based on your research."
**Claude's resolution:** Locked as **Explicit always** — matches SPEC's "one source of truth" goal; makes the DSY-07 cutover diff legible at every call site; eliminates default drift.
**Notes:** Recorded as Claude's Discretion in CONTEXT.md (D-08). Plan-phase may revisit if explicit-always produces noisy diffs in practice.

### Q3: How structured should the new Stars + Icon components be?

| Option | Description | Selected |
|--------|-------------|----------|
| CVA, light surface | Stars: size variants + count prop; Icon: size + intent variants over lucide-react | ✓ |
| Plain props, no CVA | Functional components with literal size prop; no variant system | |
| Stars CVA, Icon plain | Hybrid — Stars gets variants, Icon stays plain | |

**User's choice:** CVA, light surface — consistent with Button/Card/Badge.

---

## Cutover sequencing

### Q1: How do we ship Phase 1 — one PR or multiple?

| Option | Description | Selected |
|--------|-------------|----------|
| Multiple PRs, sequenced | Each requirement (or small group) lands as its own PR | ✓ |
| One big phase PR | Land everything together at the end of Phase 1 | |
| Two PRs (foundation + cutover) | Foundation in one, button cutover in the second | |

**User's choice:** Multiple PRs, sequenced.

### Q2: When does the ESLint no-raw-hex rule turn on?

| Option | Description | Selected |
|--------|-------------|----------|
| Last — after files clean | Land tokens, refactor, sweep buttons, then enable rule. No allowlist. | ✓ |
| Early with allowlist | Enable early; files-yet-to-clean on a documented allowlist that shrinks to zero | |
| Early as warn, then error | Surface violations early without breaking CI; flip to error at end | |

**User's choice:** Last — after files clean.

### Q3: Within Phase 1, what's the work order after the brand spec lands?

| Option | Description | Selected |
|--------|-------------|----------|
| Tokens → components → gallery → lint → button cutover | Each step builds on the last | ✓ |
| Tokens → gallery → components → button cutover → lint | Build gallery scaffold early | |
| Tokens + components in parallel, then gallery + lint + cutover | Treat tokens + components as a single landing | |

**User's choice:** Tokens → components → gallery → lint → button cutover.

---

## Claude's Discretion

- **Defaults policy (Component variants strategy Q2)** — User deferred to Claude's research. Locked as "Explicit always" because it matches the SPEC's single-source-of-truth goal and avoids default drift at call sites. Plan-phase may revisit if the explicit-always rule produces noisy diffs in practice.

## Deferred Ideas

- Dark mode tokens — out of v1 scope; revisit in a future milestone.
- CI test for ΔE76 ≤ 2 anchor accuracy — belongs in the test-infrastructure milestone (currently deferred).
- z-index, opacity, breakpoint token scales — explicitly out of scope per SPEC.
- Storybook as an alternative to `/dev/components` — reconsider if richer component docs are wanted later.
- Trimming Button variants to brand-needed only — keep all 6 for now; prune in a follow-up if `secondary` / `destructive` go unused after Phase 3/4.
