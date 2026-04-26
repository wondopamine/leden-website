# Roadmap: Café Le Den — Website Refactor

**Created:** 2026-04-26
**Granularity:** coarse (target 3–5 phases)
**Mode:** yolo
**Parallelization:** enabled
**Total v1 requirements:** 49 (mapped to phases below — 100% coverage)

> Note: PROJECT.md's prose mentions "47 v1 requirements"; the actual REQ-ID list in REQUIREMENTS.md totals 49 once enumerated (DSY 7 + CST 7 + ADM 6 + DAT 5 + SEC 4 + IMG 5 + MOB 6 + PRF 6 + GAT 3). This roadmap maps all 49 to be safe.

## Core Value

A customer who lands on the homepage on their phone walks away thinking *"this place is real, I want to go here"* — and is able to place a pickup order without friction. Visual quality and order-flow reliability are the gates; everything else exists to serve them.

## Strategy

This is a **strict refactor** — no new customer features. The phasing follows the natural sequence of a refactor where visual and architectural lifts co-evolve:

1. **Foundation first** — design tokens, brand expression, component library. Pages cannot be rebuilt against a system that does not yet exist.
2. **Data + image + security in parallel where possible** — the data shape and image pipeline must be settled before customer/admin pages bind to them. RLS hardening rides along since it touches the same Supabase surface.
3. **Customer rebuild** — the highest-stakes surface (Core Value lives here). Mobile-first, EN/FR parity, real photography.
4. **Admin rebuild** — internal surface, EN-only, depends on the same design system + data layer.
5. **Hardening** — performance, accessibility, motion-safety final pass, and the done-gate (Lighthouse ≥ 90, ≥ 95% Figma fidelity, "I'd show it to a friend without apology").

Phases 1 and 2 have a parallel opportunity: design-consultation (Phase 1) runs largely independently of data/security/image work (Phase 2). Phases 3 and 4 can also run in parallel after Phases 1 + 2 complete, since the customer and admin surfaces share the design system + data layer but otherwise touch different files.

## Phases

- [ ] **Phase 1: Design System Foundation + Brand Expression** — Tokens, component library, and a design-consultation–driven brand spec that all subsequent UI work consumes
- [ ] **Phase 2: Data Layer Consolidation + Image Pipeline + RLS Hardening** — Remove Sanity, single-source on Supabase, replace `<img>`/Unsplash with `<Image>`/self-hosted, lock admin RLS to an `admin_users` allowlist
- [ ] **Phase 3: Customer Site Rebuild** — Homepage, menu, item detail, cart/checkout/confirmation rebuilt on the design system with mobile parity at 320px and EN/FR fidelity
- [ ] **Phase 4: Admin Site Rebuild** — Shell, menu list/edit, orders dashboard with pagination + filters, all rebuilt on the design system (EN-only)
- [ ] **Phase 5: Performance, Accessibility, Done-Gate Verification** — Lighthouse ≥ 90 across customer + admin pages, motion-safe, contrast-clean, Figma fidelity ≥ 95%, real-phone subjective bar passed

## Phase Details

### Phase 1: Design System Foundation + Brand Expression

**Goal**: Lock the brand expression (typography, photography, voice, motion, mascot rules) and ship a token-first component library so every subsequent page rebuild composes from one source of truth.

**Depends on**: Nothing (first phase)

**Parallel opportunity**: Design-consultation (DSY-06) and token/component scaffolding (DSY-01..05, 07) can advance in parallel — token files are mechanical and can begin while moodboard work converges.

**Requirements**: DSY-01, DSY-02, DSY-03, DSY-04, DSY-05, DSY-06, DSY-07

**Success Criteria** (what must be TRUE):
  1. A developer can open `globals.css` / `tailwind.config` and see all brand colors (cream, forest green, warm orange + 50–900 shade scales), typography scale, spacing scale, radius, shadow, and motion tokens defined as the single source of truth — no hex values or off-scale spacing leak through.
  2. A documented component gallery exists in code (Button, Card, Input, Select, Badge, Stars, Icon, FadeIn) with usage examples; importing any of these by name yields a token-styled component without needing inline overrides.
  3. A committed brand-expression spec (from design-consultation) defines typography choices, photography style, voice, motion personality, and watermelon-mascot usage rules — and is referenced by Phase 3/4 page rebuilds.
  4. A lint rule or convention rejects raw hex values and off-token Tailwind utilities in customer + admin source files (validated by running the linter against a deliberate violation).
  5. Every Button instance currently in the codebase resolves through the new `<Button>` component with size + variant props — zero inline button styling remains.

**Plans**: TBD

**UI hint**: yes

---

### Phase 2: Data Layer Consolidation + Image Pipeline + RLS Hardening

**Goal**: Collapse the Supabase/Sanity dual-source into Supabase-only, replace fragile raw `<img>`/Unsplash usage with Next.js `<Image>` over self-hosted assets, and close the RLS hole so only allowlisted users hit admin tables.

**Depends on**: Nothing structurally (can run in parallel with Phase 1 design-consultation since this is mostly backend / infra). Customer + admin rebuilds (Phases 3, 4) consume the consolidated data shape and image pipeline produced here.

**Parallel opportunity**: Three workstreams — data consolidation (DAT), security hardening (SEC), and image strategy (IMG) — are largely independent and can run simultaneously. They converge in a single migration + verification pass.

**Requirements**: DAT-01, DAT-02, DAT-03, DAT-04, DAT-05, SEC-01, SEC-02, SEC-03, SEC-04, IMG-01, IMG-02, IMG-03, IMG-04, IMG-05

**Success Criteria** (what must be TRUE):
  1. `package.json` and the source tree contain zero `@sanity/*` imports or runtime usage; `src/lib/data.ts` performs a single Supabase fetch path with no fallback chain, and any Sanity-only fields used previously have been migrated into Supabase columns.
  2. A non-allowlisted authenticated Supabase user receives 403 on every admin route and cannot read or mutate `menu_items`, `categories`, `cafe_info`, or `orders` mutations — verified by attempting a query with a non-admin user; an `admin_users` table exists with the user-id allowlist powering both `requireAuth()` and the RLS policies.
  3. `/api/upload-menu-image` exists, requires auth, validates MIME type + file size, and writes to a Supabase Storage bucket protected by RLS; uploading from a non-admin session is rejected.
  4. Searching the customer-facing source tree (`src/app/[locale]/`, `src/components/menu/`, `src/components/layout/header.tsx`) for `<img` or `eslint-disable-next-line @next/next/no-img-element` returns zero results; admin thumbnails likewise use Next.js `<Image>` with explicit width/height.
  5. No external image URL the site depends on points at Unsplash; category fallbacks and the watermelon mascot resolve via `getItemImageUrl()` (or equivalent typed helper) backed by Supabase Storage / `public/`, and `next.config` `images.remotePatterns` lists only the domains actually in use.
  6. `src/app/api/order/route.ts` and `src/app/admin/(dashboard)/menu/actions.ts` contain zero `@typescript-eslint/no-explicit-any` suppressions — Supabase responses are typed end-to-end.

**Plans**: TBD

**UI hint**: no

---

### Phase 3: Customer Site Rebuild

**Goal**: Rebuild every customer-facing page (homepage, menu, item detail/modifiers, cart sheet, checkout, confirmation) against the Phase 1 design system and the Phase 2 data + image pipeline so that the Core Value — "this place is real, I want to go here, and I can order without friction" — is observably true on a 320 px phone in both EN and FR.

**Depends on**: Phase 1 (design system + brand spec) and Phase 2 (Supabase-only data shape + `<Image>` pipeline). Can run in parallel with Phase 4 once Phases 1 and 2 are complete.

**Parallel opportunity**: Within this phase, homepage rebuild (CST-01, CST-02), menu + item detail rebuild (CST-03, CST-04), and cart/checkout/confirmation rebuild (CST-05, CST-07) can be split as parallel plans since they touch disjoint route segments. EN/FR parity (CST-06) and mobile/responsive correctness (MOB-01..03) are cross-cutting checks applied to each.

**Requirements**: CST-01, CST-02, CST-03, CST-04, CST-05, CST-06, CST-07, MOB-01, MOB-02, MOB-03

**Success Criteria** (what must be TRUE):
  1. A user lands on `/` (or `/fr/`) on a 320 px viewport and sees a token-driven hero, featured items, reviews, hours, and about — with `src/app/[locale]/page.tsx` reduced from 576 lines to a composition of focused section components, and zero horizontal overflow at 320 px.
  2. A user browses `/menu`, opens an item, configures modifiers, and adds it to cart — every surface uses tokens + the Phase 1 component library (no hardcoded `#2D5A3D`, no off-scale spacing), and the modifier flow uses cleaner state management with field-level validation.
  3. A user completes the order flow (cart sheet → checkout → confirmation) end-to-end on mobile, and the confirmation page shows full order details (items, modifiers, total, pickup time) — preserving the behavior introduced in commit `0725623`.
  4. Switching locale between `/en/...` and `/fr/...` on every customer page produces fully translated UI with no missing strings and no overflow caused by longer FR copy (verified by walking each customer page in both locales).
  5. The review carousel renders correctly at <360 px (no fixed `w-[360px]` overflow), and hours / footer cards render without overflow on narrow phones — replacing the known mobile bugs called out in CONCERNS.md.
  6. Every customer-facing image is optimized through Next.js `<Image>` and resolves through the Phase 2 pipeline — no Unsplash fallbacks survive on any rebuilt page.

**Plans**: TBD

**UI hint**: yes

---

### Phase 4: Admin Site Rebuild

**Goal**: Rebuild the admin shell, menu management (list + edit), and orders dashboard against the design system so admins can manage menu state and run a >100 orders/day operation without UI friction or behavior regressions.

**Depends on**: Phase 1 (design system) and Phase 2 (Supabase-only data shape + RLS hardening + image pipeline). Can run in parallel with Phase 3.

**Parallel opportunity**: Shell + menu list (ADM-01, ADM-02), menu edit form refactor (ADM-03), and orders dashboard pagination/filters (ADM-04, ADM-05) are largely independent surfaces and can be split into parallel plans.

**Requirements**: ADM-01, ADM-02, ADM-03, ADM-04, ADM-05, ADM-06

**Success Criteria** (what must be TRUE):
  1. An admin navigating `/admin/dashboard`, `/admin/menu`, `/admin/orders` sees a coherent token-driven shell (sidebar, header, layout, toasts, empty states) — visually consistent with the customer site's design language but tailored for density.
  2. The menu list shows thumbnails (Next.js `<Image>`) plus a polished 3-state status control (available / sold_out / hidden); changing status surfaces a clear loading state and persists via existing server actions with no behavior regression.
  3. The menu edit form (replacing the 427-line `menu-item-form.tsx`) shows field-level inline validation messages, manages state cleanly (no scattered `useState` jungle), and uploads images through the Phase 2 endpoint with success/error feedback.
  4. The orders dashboard handles >100 orders/day usefully — pagination works, and filters by date range and status correctly narrow the result set; existing order status update server actions continue to work without behavior regression.
  5. The admin remains EN-only — no FR routing, no missing translation fallbacks — confirming the existing scope.

**Plans**: TBD

**UI hint**: yes

---

### Phase 5: Performance, Accessibility, Done-Gate Verification

**Goal**: Pass the combined done-gate — Lighthouse ≥ 90 (perf, a11y, best-practices) on customer + admin key pages, motion-safe and contrast-clean, Figma fidelity ≥ 95%, and the user's subjective "I'd show it to a friend without apology" bar on a real phone.

**Depends on**: Phases 1–4 complete. This is the verification + tuning pass.

**Parallel opportunity**: Lighthouse tuning (PRF), motion / keyboard / contrast cleanup (MOB-04..06), and done-gate review (GAT) can run as parallel plans, each finishing with a hard pass/fail gate.

**Requirements**: PRF-01, PRF-02, PRF-03, PRF-04, PRF-05, PRF-06, MOB-04, MOB-05, MOB-06, GAT-01, GAT-02, GAT-03

**Success Criteria** (what must be TRUE):
  1. Running Lighthouse on mobile against `/`, `/menu`, `/order`, `/order/confirmation` each scores ≥ 90 on performance, accessibility, and best-practices; running Lighthouse on desktop against `/admin/dashboard` and `/admin/menu` scores ≥ 90 on the same three categories.
  2. With `prefers-reduced-motion: reduce` enabled, every staggered animation (hero fade-ins, scroll fades) reduces or removes its motion — no users with motion sensitivity see staggered timings on the hero.
  3. Every interactive element on every customer + admin page is reachable via keyboard with a visible focus state, and every text/background pairing meets WCAG AA contrast (verified by automated audit + spot-check on the bilingual + admin surfaces).
  4. The featured-section query filters `status = 'available'` at the Supabase query, not after fetch, so the homepage no longer ships hidden items over the wire.
  5. A Figma file (or equivalent design spec) covers homepage, menu, order, confirmation, admin dashboard, admin menu list, admin menu edit; a side-by-side comparison shows ≥ 95% visual fidelity, and every "High" priority item in `.planning/codebase/CONCERNS.md` (Tech Debt + Visual & Design Quality Issues sections) is either resolved or explicitly logged as deferred with rationale.
  6. The user has reviewed the deployed result on a real phone and confirms it meets the "I'd show it to a friend without apology" subjective bar.

**Plans**: TBD

**UI hint**: no

---

## Phase Dependency Graph

```
Phase 1 (Design System) ──┐
                          ├──> Phase 3 (Customer Rebuild) ──┐
Phase 2 (Data + Image    ─┤                                 ├──> Phase 5 (Done Gate)
         + Security)      │                                 │
                          └──> Phase 4 (Admin Rebuild)   ───┘
```

- Phases 1 and 2 may run in parallel (design-consultation overlaps cleanly with backend/infra work).
- Phases 3 and 4 may run in parallel once Phases 1 and 2 are both complete.
- Phase 5 is strictly serial after Phases 3 and 4.

## Progress

| Phase | Plans Complete | Status | Completed |
|---|---|---|---|
| 1. Design System Foundation + Brand Expression | 0/TBD | Not started | — |
| 2. Data Layer Consolidation + Image Pipeline + RLS Hardening | 0/TBD | Not started | — |
| 3. Customer Site Rebuild | 0/TBD | Not started | — |
| 4. Admin Site Rebuild | 0/TBD | Not started | — |
| 5. Performance, Accessibility, Done-Gate Verification | 0/TBD | Not started | — |

## Coverage

- v1 requirements: 49 total (DSY 7 + CST 7 + ADM 6 + DAT 5 + SEC 4 + IMG 5 + MOB 6 + PRF 6 + GAT 3)
- Mapped: 49/49 ✓
- Unmapped: 0
- Duplicates across phases: 0

See `REQUIREMENTS.md` Traceability section for the per-REQ-ID phase mapping.

---

*Roadmap created: 2026-04-26*
*Last updated: 2026-04-26 after initial creation*
