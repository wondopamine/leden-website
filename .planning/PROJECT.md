# Café Le Den — Website Refactor

> Repo folder is `leden-website`; the brand is **Café Le Den** (café · sandwicherie). This document uses "Café Le Den" for the brand and "Leden" only when referring to the codebase/folder.

## What This Is

Café Le Den is a Montreal café and sandwicherie. Its bilingual (EN/FR) website is a customer-facing storefront for menu browsing and pickup ordering plus an internal admin dashboard for menu, order, and cafe-info management. This milestone is a **comprehensive refactor**: same features, rebuilt on a coherent design system and a consolidated data layer, with a major lift in visual quality. The brand identity (logo, palette, watermelon motif) already exists; the website is what fails to live up to it.

## Core Value

A customer who lands on the homepage on their phone walks away thinking *"this place is real, I want to go here"* — and is able to place a pickup order without friction. Visual quality and order-flow reliability are the gates; everything else exists to serve them.

## Requirements

### Validated

<!-- Inferred from existing code (commit 8ddcefc and earlier). These ship today and are kept by this milestone. -->

- ✓ Customer homepage with hero, featured items, reviews, hours, about — existing
- ✓ Customer menu page with categories and item modifiers — existing
- ✓ Customer order flow: cart (Zustand) → checkout → server-validated order creation → confirmation — existing
- ✓ EN/FR routing via `next-intl` and `[locale]` segment — existing
- ✓ Admin login (Supabase Auth) and dashboard — existing
- ✓ Admin menu CRUD (3-state status: available / sold_out / hidden, image upload, modifiers) — existing
- ✓ Admin orders dashboard with status updates — existing
- ✓ Order email notifications via Resend — existing
- ✓ Server-side order validation: prices, availability, business hours, phone format — existing (commits de0b1c8, 0725623)
- ✓ GST/QST tax calculation in order totals — existing

### Active

<!-- This milestone's hypotheses. Locked into the roadmap; validated when shipped. -->

- [ ] **Design system foundation**: design tokens (color, typography, spacing, radius, shadow, motion), reusable component library (Button, Card, Input, Select, Badge, Stars, Icon), documented in code so all subsequent work uses tokens, never hex/raw classes
- [ ] **Brand expression locked via design-consultation**: palette is **already established by the existing logo** (cream `#EFE7D2`, forest green `#2F5436`, warm orange `#D9682E`, plus the watermelon mascot motif) — design-consultation decides typography, photography style, voice, motion, and how the watermelon mascot extends into the site; aesthetic DNA from refs (Graza, Monte Cafe, Craft, Superr) — confident, type-led, with personality, never sterile
- [ ] **Customer homepage rebuilt** against the design system: distinct hero, featured, reviews, hours, about — visual hierarchy, proper mobile, real photography slots
- [ ] **Customer menu page rebuilt** against the design system, including item detail / modifier UX
- [ ] **Customer order flow rebuilt** against the design system: cart sheet, checkout, confirmation
- [ ] **Admin shell rebuilt** against the design system: navigation, layout, toasts, empty states
- [ ] **Admin menu management rebuilt**: list with thumbnails + status, edit form with proper field validation messages, image upload polish
- [ ] **Admin orders dashboard rebuilt** with pagination + filters (date range, status) suited to >100 orders/day
- [ ] **Data layer consolidated to Supabase only**: remove Sanity entirely, migrate any Sanity-only fields to Supabase, single source of truth for menu / categories / cafe info
- [ ] **RLS hardened**: introduce `admin_users` table and replace `auth.role() = 'authenticated'` policies with admin-id checks
- [ ] **Image strategy fixed**: replace raw `<img>` + Unsplash fallbacks with Next.js `<Image>` + self-hosted fallback assets in Supabase Storage
- [ ] **Mobile parity**: every page works at 320px width, prefers-reduced-motion respected on all animations
- [ ] **Performance/a11y gates met**: Lighthouse ≥ 90 on perf, a11y, best-practices for homepage, menu, order, confirmation, admin dashboard, admin menu

### Out of Scope

<!-- Explicit exclusions, locked to prevent silent re-inclusion. -->

- **New customer features** — no real-time order status, no customer accounts, no order lookup, no PWA — strict refactor scope; defer to a future milestone once the design system + data layer are stable
- **Admin audit log and multi-user roles** — keep "any authenticated user is admin" model with the RLS hole closed by `admin_users` allowlist; full role/audit work is a future milestone
- **Backend tests / CI test suite** — no Vitest, no Playwright, no integration suites in this milestone; type-check + manual QA + Lighthouse only; tests come once the architecture has settled
- **Caching strategy / ISR / Redis** — leave `force-dynamic` on customer pages; revisit caching as a separate phase after the data layer is consolidated
- **Multi-location / multi-tenant** — single café only; do not generalize schema or admin for multiple locations
- **Customer authentication** — guests only; no signup, no login, no email-magic-link order lookup
- **Analytics product features** — keep the existing dashboard widget, do not expand
- **CMS for editorial content** — Sanity is being removed; do not replace it with another CMS in this milestone
- **Payment processing** — pickup orders only, paid in person; no Stripe/payment integration

## Context

**Existing codebase** — Next.js 16 App Router, Supabase (auth + Postgres + Storage), Sanity CMS (to be removed), Google Places API (live ratings + reviews), Resend (transactional email), Zustand (cart), Tailwind, shadcn/ui. See `.planning/codebase/` for full map.

**Real-world context** — Single café and sandwicherie in Montreal. Bilingual EN/FR is genuine operational requirement, not decoration. GST/QST tax structure is real. >100 orders/day target volume — admin pagination and order list responsiveness matter.

**Existing brand identity** — The Café Le Den logo establishes the brand palette: cream `#EFE7D2` (background), forest green `#2F5436` (primary, "Café"), warm orange `#D9682E` (accent, "Le Den"), with a hand-drawn watermelon mascot and small-caps tagline "café · sandwicherie". The wordmark is chunky, slightly handmade, friendly — not minimalist. Typography on the site, photography style, voice, and how the watermelon motif extends into the UI are still open and decided in design-consultation.

**Visual baseline** — User describes current visuals as "very bad" across brand identity, layout/rhythm/spacing, imagery/component polish, and mobile experience. Recent homepage redesign (commit 8ddcefc, "Monte Cafe inspired") is a step but doesn't address the underlying token/component-system absence.

**Key technical debt informing this work** (from `.planning/codebase/CONCERNS.md`):
- Hardcoded design values (5+ places use `#2D5A3D`, 3+ use `#f2ead5`, spacing inconsistent)
- Raw `<img>` tags with `eslint-disable` throughout — no image optimization
- Unsplash fallback URLs that have broken multiple times
- 576-line monolithic homepage in `src/app/[locale]/page.tsx`
- 427-line admin form in `src/components/admin/menu-item-form.tsx` with messy `useState`
- Review carousel breaks <360px (fixed `w-[360px]`)
- RLS allows any authenticated user into admin tables
- Sanity ↔ Supabase fallback chain is fragile and forces dual schemas
- No design system documentation, no token file, no component gallery

**Reference brand DNA** — Graza (graza.co), Monte Cafe (montecafe.com.au), Craft (craft.do), Superr (superr.ai). Common thread: confident sans grotesk typography, generous warm neutrals, restrained but personality-rich, real lifestyle photography, declarative voice ("Made for eating, never heating" energy), minimal purposeful motion, flat polished components.

## Constraints

- **Tech stack**: Next.js 16 App Router (existing). No framework swap. Tailwind for styling. shadcn/ui as the base component primitive layer. — Existing codebase, low-risk migration scope.
- **Languages**: EN + FR maintained throughout customer surface. Admin remains EN-only. — Bilingual is real operational requirement, not optional.
- **Single source of truth**: Supabase for all transactional and content data. Sanity removed entirely by end of milestone. — Eliminates the dual-source coupling that drove caching removal and admin/customer inconsistency bugs.
- **Mobile-first**: every customer page must work at 320px width minimum. — Current state breaks here; this is a hard gate.
- **Accessibility**: `prefers-reduced-motion` honored on all animations; WCAG AA color contrast on all text; keyboard navigable. — Required for the Lighthouse a11y ≥ 90 acceptance gate and basic ethical defaults.
- **Performance**: Lighthouse perf ≥ 90 on homepage, menu, order, confirmation. — Hard gate. Implies Next.js `<Image>`, no full-page client hydration, restrained motion, optimized fonts.
- **Brand palette anchored by existing logo**: cream `#EFE7D2`, forest green `#2F5436`, warm orange `#D9682E`, watermelon mascot. Tokens derive shades/tints from these. — The logo is the brand truth; the website must serve it, not invent a different palette.
- **Typography, photography, voice, motion deferred to design-consultation**: anchored by the logo's chunky/handmade personality + the reference DNA (Graza, Monte, Craft, Superr). — Palette is decided; the rest still warrants moodboard-driven exploration before commit.
- **No new dependencies without rationale**: every new package added in this refactor must be justified against an existing primitive (Tailwind, shadcn, Zustand, Supabase). — Prevents stack sprawl during a refactor.
- **Plan-mode bootstrap**: this initialization is plan-only. Code execution begins after PROJECT.md / REQUIREMENTS.md / ROADMAP.md are committed and a phase plan is approved.

## Key Decisions

| Decision | Rationale | Outcome |
|---|---|---|
| Strict refactor — no new customer features | User wants visual + architectural lift before adding capability; separates "what hurts now" from "what's missing" | — Pending |
| Balanced strategy: architecture + visual co-evolve | Visual without tokens reproduces the same chaos; tokens without visual misses the goal of "huge improvement"; co-evolution most coherent | — Pending |
| Consolidate to Supabase only, remove Sanity | Dual-source coupling drove caching removal + admin/customer inconsistency; one source of truth is the architectural unlock | — Pending |
| Brand palette anchored by existing logo (cream / forest green / warm orange / watermelon mascot) | Logo predates the refactor and is the established brand truth; site must serve it, not reinvent it | — Pending |
| Typography, photography style, voice, motion deferred to design-consultation | Logo personality + reference DNA give direction but warrant moodboard-driven exploration before commit | — Pending |
| Admin remains "single role, any authenticated user," but with `admin_users` allowlist | Full role model is a separate milestone; RLS hole closes with minimal schema change | — Pending |
| Tests deferred — type-check + manual QA + Lighthouse only | Adding test infrastructure during refactor doubles surface area; settle architecture first, then add tests | — Pending |
| Caching strategy deferred — keep `force-dynamic` | Caching layers were just removed for consistency reasons; reintroducing them is a separate, post-data-consolidation decision | — Pending |
| EN/FR i18n stays | Real Montreal operational requirement, not decoration | — Pending |
| Done = subjective polish + Figma fidelity ≥ 95% + Lighthouse ≥ 90 + critical CONCERNS.md items resolved | User explicitly chose all-three combined gate; subjective alone misses regressions, mechanical alone misses "feels generic" | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-26 after initialization*
