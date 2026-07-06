# Requirements: Café Le Den — Website Refactor

**Defined:** 2026-04-26
**Core Value:** A customer who lands on the homepage on their phone walks away thinking "this place is real, I want to go here" — and is able to place a pickup order without friction.

## v1 Requirements

Strict-refactor scope. Same features as today, rebuilt on a coherent design system + consolidated data layer + major visual lift. Each requirement is user-centric and verifiable.

### Design System (DSY)

- [x] **DSY-01**: Design tokens for color exist as CSS variables / Tailwind theme extension, derived from the existing logo palette (cream `#EFE7D2`, forest green `#2F5436`, warm orange `#D9682E`), with consistent shade scale (50–900) for each
- [x] **DSY-02**: Design tokens for typography exist (font family, size scale, line-height scale, weight scale), with distinct treatments for display, h1, h2, h3, body, caption, label
- [x] **DSY-03**: Design tokens for spacing, radius, shadow, and motion (duration, easing) exist as a single source of truth
- [x] **DSY-04**: A reusable component library exists (Button with size+variant tokens, Card, Input, Select, Badge, Stars, Icon wrapper, FadeIn) and is documented with usage examples in code
- [x] **DSY-05**: A lint rule or convention prevents committing raw hex values, raw color/spacing Tailwind utilities outside the token scale, in customer + admin source files
- [x] **DSY-06**: A design-consultation phase has produced and committed a brand expression spec covering typography, photography style, voice, motion personality, and watermelon-mascot usage rules
- [x] **DSY-07**: All buttons across the site use the Button component with size + variant tokens (no inline button styling)

### Customer Site (CST)

- [ ] **CST-01**: Homepage is rebuilt against the design system — hero, featured items, reviews, hours, about — with `src/app/[locale]/page.tsx` reduced from 576 lines to a composition of focused section components
- [ ] **CST-02**: Homepage uses real photography slots wired to the new image pipeline (no Unsplash fallbacks)
- [ ] **CST-03**: Menu page is rebuilt against the design system, with category navigation and item cards using token-based spacing/typography
- [ ] **CST-04**: Item detail / modifier selection UX is rebuilt against the design system (cleaner state management, validated form flow)
- [ ] **CST-05**: Cart sheet / checkout / confirmation pages are rebuilt against the design system; cart state remains Zustand-backed
- [ ] **CST-06**: All customer pages render identically and correctly in EN and FR (no missing translations, no overflow from longer FR strings)
- [ ] **CST-07**: Order confirmation page shows full order details (items, modifiers, total, pickup time) — preserves behavior from commit `0725623`

### Admin Site (ADM)

- [ ] **ADM-01**: Admin shell (sidebar, header, layout, toasts, empty states) is rebuilt against the design system
- [ ] **ADM-02**: Admin menu list shows thumbnails + 3-state status (available / sold_out / hidden), token-based styling, polished status dropdown
- [ ] **ADM-03**: Admin menu edit form is rebuilt with field-level inline validation messages, cleaner state management (extracted from 427-line `menu-item-form.tsx`), and polished image upload
- [ ] **ADM-04**: Admin orders dashboard supports pagination and filters (date range, status) sized for >100 orders/day
- [ ] **ADM-05**: Admin order status updates continue to work via existing server actions; no behavior regression
- [ ] **ADM-06**: Admin remains EN-only (no FR i18n routing), confirming existing scope

### Data Layer (DAT)

- [ ] **DAT-01**: Sanity CMS is removed entirely from `package.json`, source code, and runtime — zero `@sanity/*` imports remain
- [ ] **DAT-02**: Menu items, categories, and cafe_info are stored exclusively in Supabase Postgres
- [ ] **DAT-03**: Any Sanity-only fields used by the existing UI are migrated to Supabase columns and populated via a one-shot migration script
- [ ] **DAT-04**: The data abstraction layer (`src/lib/data.ts`) is simplified: single Supabase fetch path, no fallback chain, no `try Supabase → try Sanity → return sample` logic
- [ ] **DAT-05**: All `@typescript-eslint/no-explicit-any` suppressions in `src/app/api/order/route.ts` and `src/app/admin/(dashboard)/menu/actions.ts` are removed by typing Supabase responses correctly

### Security (SEC)

- [ ] **SEC-01**: An `admin_users` table exists in Supabase storing user-id allowlist for admin access
- [ ] **SEC-02**: All admin-table RLS policies (menu_items, categories, cafe_info, orders mutations) check `auth.uid() IN (SELECT user_id FROM admin_users)` instead of `auth.role() = 'authenticated'`
- [ ] **SEC-03**: `requireAuth()` is updated to verify both an authenticated session AND admin_users membership; non-admin authenticated users get 403 on admin routes
- [ ] **SEC-04**: `/api/upload-menu-image` endpoint is verified to exist, enforce `requireAuth()`, validate MIME type + file size, and store to Supabase Storage with appropriate RLS

### Image Strategy (IMG)

- [ ] **IMG-01**: All raw `<img>` tags in customer-facing components are replaced with Next.js `<Image>`; `eslint-disable-next-line @next/next/no-img-element` count drops to zero in `src/app/[locale]/`, `src/components/menu/`, `src/components/layout/header.tsx`
- [ ] **IMG-02**: Admin thumbnails use Next.js `<Image>` with explicit width/height
- [ ] **IMG-03**: Unsplash dependency is removed; category fallback images and the watermelon mascot are stored in Supabase Storage (or `public/`) with stable URLs
- [ ] **IMG-04**: A typed `getItemImageUrl()` helper produces a single canonical URL for any menu item, with a documented fallback contract
- [ ] **IMG-05**: `next.config` `images.remotePatterns` includes only the domains actually used; unused entries removed

### Mobile + Accessibility (MOB)

- [ ] **MOB-01**: Every customer page renders without horizontal overflow at 320px viewport width
- [ ] **MOB-02**: Review carousel cards adapt to viewport width (no fixed `w-[360px]` overflow at <360px)
- [ ] **MOB-03**: Hours / footer cards do not overflow on narrow phones (responsive padding + font sizing)
- [ ] **MOB-04**: All staggered animations (hero fade-ins, scroll-triggered fades) respect `prefers-reduced-motion: reduce`
- [ ] **MOB-05**: All interactive elements are keyboard-navigable with visible focus states
- [ ] **MOB-06**: All text meets WCAG AA color contrast against its background

### Performance (PRF)

- [ ] **PRF-01**: Homepage Lighthouse mobile scores ≥ 90 for performance, accessibility, best-practices
- [ ] **PRF-02**: Menu page Lighthouse mobile scores ≥ 90 for performance, accessibility, best-practices
- [ ] **PRF-03**: Order page Lighthouse mobile scores ≥ 90 for performance, accessibility, best-practices
- [ ] **PRF-04**: Order confirmation page Lighthouse mobile scores ≥ 90 for performance, accessibility, best-practices
- [ ] **PRF-05**: Admin dashboard and admin menu list Lighthouse desktop scores ≥ 90 for performance, accessibility, best-practices
- [ ] **PRF-06**: Featured-section query filters at the data source (Supabase query), not client-side after fetch

### Done Gate (GAT)

- [ ] **GAT-01**: A Figma file (or equivalent design spec) exists with key page layouts (homepage, menu, order, confirmation, admin dashboard, admin menu list, admin menu edit) and the implementation matches at ≥ 95% visual fidelity
- [ ] **GAT-02**: All "High" priority items in `.planning/codebase/CONCERNS.md` (Tech Debt + Visual & Design Quality Issues sections) are resolved or explicitly migrated to a future milestone with rationale
- [ ] **GAT-03**: User has reviewed the deployed result on a real phone and confirms it meets the "I'd show it to a friend without apology" subjective bar

## v2 Requirements

Acknowledged but deferred. Not in this milestone's roadmap. Promotion to v1 requires explicit milestone update.

### Customer Features

- **NXT-01**: Real-time order status updates for customers (Supabase Realtime, polling fallback)
- **NXT-02**: Customer-facing order lookup by order number + email
- **NXT-03**: Optional customer accounts (Supabase Auth) with order history
- **NXT-04**: PWA manifest + offline menu caching

### Admin Maturity

- **AMT-01**: Admin audit log table + UI (who changed what, when)
- **AMT-02**: Multi-role admin (owner / manager / staff) with row-level role gating
- **AMT-03**: Drag-to-reorder for menu modifiers and options
- **AMT-04**: Admin analytics expansion beyond the current dashboard widget

### Reliability

- **REL-01**: Caching strategy reintroduction (Next.js `unstable_cache`, ISR, Redis or Supabase-backed cache)
- **REL-02**: Vitest unit tests for order validation, menu status transitions, image upload
- **REL-03**: Playwright E2E tests for the order flow
- **REL-04**: Error boundaries with retry UI on customer pages
- **REL-05**: Rate limiting on `/api/order` (per-IP throttle)

### Schema

- **SCH-01**: Order total `CHECK` constraint validating total = subtotal + GST + QST
- **SCH-02**: `created_by` / `updated_by` audit columns on menu_items, categories, cafe_info
- **SCH-03**: Discount / promotion fields on menu_items

## Out of Scope

| Feature | Reason |
|---|---|
| New customer features (real-time, accounts, lookup, PWA) | Strict refactor scope locked; defer to a future milestone once design system + data layer are stable |
| Admin audit log + multi-role | Closing the RLS hole via `admin_users` allowlist is in scope; full role/audit work is a separate milestone |
| Backend tests / CI test suite | Adding test infrastructure during refactor doubles surface area; settle architecture first, then add tests |
| Caching strategy / ISR / Redis | Caching layers were just removed for consistency reasons; reintroduce as a separate post-data-consolidation phase |
| Multi-location / multi-tenant | Single café only; do not generalize schema or admin |
| Customer authentication | Guests only; no signup, no login, no email-magic-link order lookup |
| CMS for editorial content | Sanity is being removed; do not replace it with another CMS |
| Payment processing (Stripe etc.) | Pickup orders only, paid in person |
| Framework swap (Next → other) | Next.js 16 App Router stays; refactor is in-place |
| Native mobile app | Web-only |

## Traceability

Populated by roadmapper on 2026-04-26. Each REQ-ID maps to exactly one phase.

| Requirement | Phase | Status |
|---|---|---|
| DSY-01 | Phase 1: Design System Foundation + Brand Expression | Complete (01-02) |
| DSY-02 | Phase 1: Design System Foundation + Brand Expression | Complete (01-02) |
| DSY-03 | Phase 1: Design System Foundation + Brand Expression | Complete (01-02) |
| DSY-04 | Phase 1: Design System Foundation + Brand Expression | Complete (01-03 components + 01-04 gallery) |
| DSY-05 | Phase 1: Design System Foundation + Brand Expression | Complete (01-05) |
| DSY-06 | Phase 1: Design System Foundation + Brand Expression | Complete (01-01) |
| DSY-07 | Phase 1: Design System Foundation + Brand Expression | Complete |
| DAT-01 | Phase 2: Data Layer Consolidation + Image Pipeline + RLS Hardening | Pending |
| DAT-02 | Phase 2: Data Layer Consolidation + Image Pipeline + RLS Hardening | Pending |
| DAT-03 | Phase 2: Data Layer Consolidation + Image Pipeline + RLS Hardening | Pending |
| DAT-04 | Phase 2: Data Layer Consolidation + Image Pipeline + RLS Hardening | Pending |
| DAT-05 | Phase 2: Data Layer Consolidation + Image Pipeline + RLS Hardening | Pending |
| SEC-01 | Phase 2: Data Layer Consolidation + Image Pipeline + RLS Hardening | Pending |
| SEC-02 | Phase 2: Data Layer Consolidation + Image Pipeline + RLS Hardening | Pending |
| SEC-03 | Phase 2: Data Layer Consolidation + Image Pipeline + RLS Hardening | Pending |
| SEC-04 | Phase 2: Data Layer Consolidation + Image Pipeline + RLS Hardening | Pending |
| IMG-01 | Phase 2: Data Layer Consolidation + Image Pipeline + RLS Hardening | Pending |
| IMG-02 | Phase 2: Data Layer Consolidation + Image Pipeline + RLS Hardening | Pending |
| IMG-03 | Phase 2: Data Layer Consolidation + Image Pipeline + RLS Hardening | Pending |
| IMG-04 | Phase 2: Data Layer Consolidation + Image Pipeline + RLS Hardening | Pending |
| IMG-05 | Phase 2: Data Layer Consolidation + Image Pipeline + RLS Hardening | Pending |
| CST-01 | Phase 3: Customer Site Rebuild | Pending |
| CST-02 | Phase 3: Customer Site Rebuild | Pending |
| CST-03 | Phase 3: Customer Site Rebuild | Pending |
| CST-04 | Phase 3: Customer Site Rebuild | Pending |
| CST-05 | Phase 3: Customer Site Rebuild | Pending |
| CST-06 | Phase 3: Customer Site Rebuild | Pending |
| CST-07 | Phase 3: Customer Site Rebuild | Pending |
| MOB-01 | Phase 3: Customer Site Rebuild | Pending |
| MOB-02 | Phase 3: Customer Site Rebuild | Pending |
| MOB-03 | Phase 3: Customer Site Rebuild | Pending |
| ADM-01 | Phase 4: Admin Site Rebuild | Pending |
| ADM-02 | Phase 4: Admin Site Rebuild | Pending |
| ADM-03 | Phase 4: Admin Site Rebuild | Pending |
| ADM-04 | Phase 4: Admin Site Rebuild | Pending |
| ADM-05 | Phase 4: Admin Site Rebuild | Pending |
| ADM-06 | Phase 4: Admin Site Rebuild | Pending |
| MOB-04 | Phase 5: Performance, Accessibility, Done-Gate Verification | Pending |
| MOB-05 | Phase 5: Performance, Accessibility, Done-Gate Verification | Pending |
| MOB-06 | Phase 5: Performance, Accessibility, Done-Gate Verification | Pending |
| PRF-01 | Phase 5: Performance, Accessibility, Done-Gate Verification | Pending |
| PRF-02 | Phase 5: Performance, Accessibility, Done-Gate Verification | Pending |
| PRF-03 | Phase 5: Performance, Accessibility, Done-Gate Verification | Pending |
| PRF-04 | Phase 5: Performance, Accessibility, Done-Gate Verification | Pending |
| PRF-05 | Phase 5: Performance, Accessibility, Done-Gate Verification | Pending |
| PRF-06 | Phase 5: Performance, Accessibility, Done-Gate Verification | Pending |
| GAT-01 | Phase 5: Performance, Accessibility, Done-Gate Verification | Pending |
| GAT-02 | Phase 5: Performance, Accessibility, Done-Gate Verification | Pending |
| GAT-03 | Phase 5: Performance, Accessibility, Done-Gate Verification | Pending |

**Coverage:**
- v1 requirements: 49 total (DSY 7 + CST 7 + ADM 6 + DAT 5 + SEC 4 + IMG 5 + MOB 6 + PRF 6 + GAT 3)
- Mapped to phases: 49 ✓
- Unmapped: 0
- Duplicates across phases: 0

> Note: PROJECT.md prose currently states "47 v1 requirements" — the enumerated REQ-IDs above total 49. The roadmap maps all 49; update the PROJECT.md prose count on the next edit if desired.

---

*Requirements defined: 2026-04-26*
*Last updated: 2026-04-26 — traceability section populated by roadmapper*
