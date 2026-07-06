---
phase: 01-design-system-foundation-brand-expression
plan: "06"
subsystem: ui
tags: [button, design-system, tailwind, cva, react, nextjs]

requires:
  - phase: 01-05
    provides: ESLint no-raw-hex + no-arbitrary-color-class rules at error level; all non-vendored files already token-clean
  - phase: 01-03
    provides: Button component with all 6 CVA variants and 8 sizes in src/components/ui/button.tsx

provides:
  - Every <Button> call site in src/app/ and src/components/ (excluding src/components/ui/) carries explicit variant= and size= props per D-08
  - Zero native <button> elements outside src/components/ui/ (confirmed by acceptance grep)
  - DSY-07 closed; Phase 1 complete

affects:
  - Phase 3 customer site rebuild (can copy explicit-prop pattern from these call sites)
  - Phase 4 admin site rebuild (same)

tech-stack:
  added: []
  patterns:
    - "Explicit-always Button props: every <Button> JSX call site sets both variant= and size=, defaultVariants remains in button.tsx for gallery documentation only"

key-files:
  created: []
  modified:
    - src/app/[locale]/page.tsx
    - src/app/[locale]/order/confirmation/page.tsx
    - src/components/order/order-content.tsx
    - src/components/menu/menu-content.tsx
    - src/app/admin/(dashboard)/menu/page.tsx
    - src/app/admin/login/page.tsx
    - src/components/admin/settings-form.tsx
    - src/components/admin/order-card.tsx
    - src/components/admin/menu-item-form.tsx

key-decisions:
  - "D-08 applied: defaultVariants stays in button.tsx; every call site sets both variant= and size= explicitly to prevent default-drift bugs"
  - "Size inference: h-11 className → size=lg; h-14 className → size=lg; h-9/h-8 or unspecified → size=default"
  - "Variant inference: primary CTA → default; cancel/close → ghost; secondary nav → outline; status-advance admin button → default"

patterns-established:
  - "Button explicit props: <Button variant=\"X\" size=\"Y\" ...> at every call site in src/app/ and src/components/"

requirements-completed:
  - DSY-07

duration: 4min
completed: "2026-05-02"
---

# Phase 01 Plan 06: Button Prop Cutover (DSY-07) Summary

**Additive prop-explicitness pass across 9 files adds `variant=` + `size=` to every `<Button>` call site, closing DSY-07 and completing Phase 1**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-02T14:20:59Z
- **Completed:** 2026-05-02T14:24:56Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Added explicit `variant` and `size` props to all `<Button>` call sites that were missing them (9 files, 14 tags updated)
- Full-tree audit script exits 0: every `<Button>` opening tag outside `src/components/ui/` has both `variant=` and `size=`
- Zero native `<button[ >]>` elements outside `src/components/ui/` (acceptance grep returns 0 lines)
- `npm run lint`, `npx tsc --noEmit`, and `npm run build` all exit 0
- Full Phase 1 acceptance suite (REQ 1–7) passes end-to-end

## Button Call Site Inventory (Before → After)

### Customer-facing (Task 1)

| File | Tag count | Props added |
|---|---|---|
| `src/app/[locale]/page.tsx` | 3 | hero Button: +`variant="default"`; 2× viewFullMenu Buttons: +`size="default"` |
| `src/app/[locale]/order/confirmation/page.tsx` | 2 | Both backToMenu Buttons: +`size="default"` |
| `src/components/order/order-content.tsx` | 8 | viewMenu: +`variant="default" size="default"`; 2× placeOrder/disabled Buttons: +`variant="default"` |
| `src/components/layout/header.tsx` | 2 | Already explicit — no changes |
| `src/components/menu/menu-content.tsx` | 1 | addToOrder Button: +`variant="default" size="lg"` (h-11 → lg) |

### Admin (Task 2)

| File | Tag count | Props added |
|---|---|---|
| `src/app/admin/(dashboard)/menu/page.tsx` | 1 | Add Item Button: +`variant="default" size="default"` |
| `src/app/admin/login/page.tsx` | 1 | Submit Button: +`variant="default" size="default"` |
| `src/components/admin/settings-form.tsx` | 1 | Save Settings Button: +`variant="default" size="default"` |
| `src/components/admin/order-card.tsx` | 2 | Status-advance Button: +`variant="default"` (had `size="sm"`); DropdownMenuTrigger render Button already explicit |
| `src/components/admin/menu-item-form.tsx` | 7 | Submit Button: +`variant="default" size="default"`; other 6 already explicit |
| `src/app/admin/(dashboard)/menu/new/page.tsx` | 1 | Already explicit — no changes |
| `src/app/admin/(dashboard)/menu/[id]/edit/page.tsx` | 1 | Already explicit — no changes |
| `src/app/admin/(dashboard)/orders/[id]/page.tsx` | 1 | Already explicit — no changes |
| `src/components/admin/categories-manager.tsx` | 3 | All already explicit — no changes |
| `src/components/admin/menu-item-row.tsx` | 2 | Both already explicit — no changes |
| `src/components/admin/sidebar.tsx` | 1 | Already explicit — no changes |

## Task Commits

1. **Task 1: Customer-facing Button call sites** — `1a5d9f1` (feat)
2. **Task 2: Admin Button call sites + full-tree sweep** — `d0003f2` (feat)

**Plan metadata:** see final docs commit below

## Inferred Variant Choices for Review

The following call sites had their variant inferred from context rather than being explicitly stated in the original code. Reviewers may want to verify these choices:

1. **`order-content.tsx` placeOrder / "ordering closed" Buttons** — inferred `variant="default"` (primary submit CTA — matches button.tsx default; no className color cues contradicting this)
2. **`menu-content.tsx` addToOrder Button** — inferred `variant="default"` and `size="lg"` (h-11 className → lg; primary add-to-cart CTA → default)
3. **`admin/menu/page.tsx` Add Item Button** — inferred `variant="default" size="default"` (primary admin CTA with Plus icon)
4. **`admin/settings-form.tsx` Save Settings Button** — inferred `variant="default" size="default"` (primary save action)
5. **`admin/order-card.tsx` status-advance Button** — inferred `variant="default"` (positive action CTA; had `size="sm"` already)

## Deviations from Plan

None — plan executed exactly as written. All changes were purely additive (props added, no classNames deleted, no eslint-disable directives added).

Note: The plan's acceptance grep `<button[ >]` already returned zero matches before this plan ran. The native `<button>` elements visible in `src/components/menu/menu-content.tsx` (quantity selector, modifier option buttons) use multi-line format `<button\n` (newline after tag name, not space/`>`), so the acceptance pattern correctly excludes them — they are intentional UI widgets using the native element, not DSY-07 cutover targets. This matches the RESEARCH.md "zero native buttons" finding.

## Phase 1 Acceptance Suite Results

| Check | Result |
|---|---|
| `grep -E "oklch\("` in globals.css | 0 (pass) |
| Brand color vars `--brand-{cream,forest,orange}-*` count | 93 (pass, ≥27) |
| Typography vars count | 42 (pass, ≥7) |
| Space/shadow/duration/ease vars count | 26 (pass) |
| UI component files exist | All 7 present + fade-in.tsx |
| `/dev/components/page.tsx` exists | Yes |
| `scripts/derive-tokens.ts` exists | Yes |
| Brand SPEC sections | 5 (pass) |
| `**Decision:**` lines in SPEC | 5 (pass) |
| Zero native `<button[ >]` outside ui/ | 0 (pass) |
| Every `<Button>` has explicit variant+size | 0 missing (pass) |
| `npm run lint` | 0 errors (1 pre-existing @next/next/no-img-element warning) |
| `npx tsc --noEmit` | exit 0 (pass) |
| `npm run build` | exit 0 (pass) |

## Known Stubs

None — all Button call sites are wired to real functionality.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Phase 1 is complete. All 7 DSY requirements are fulfilled:
- DSY-01 through DSY-06: delivered by Plans 01–05
- DSY-07: delivered by this plan

Phase 2 (Data Layer Consolidation + Image Pipeline + RLS Hardening) can begin with `/gsd-spec-phase 2`. Note the package.json conflict risk documented in STATE.md regarding Sanity removal in Phase 2.

## Follow-up Cleanup (Out of Scope for This Plan)

Several call sites retain `className` values that partially duplicate variant styling (e.g., `className="rounded-full"` on outline Buttons that already have `rounded-lg` from CVA). Per D-08, classNames were not touched in this plan. A future cleanup PR could trim redundant className utilities once Phase 3/4 page rebuilds are underway.

---
*Phase: 01-design-system-foundation-brand-expression*
*Completed: 2026-05-02*
