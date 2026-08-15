# Current product re-baseline

**Audited:** 2026-08-15
**Scope:** repository at `849e789`, rendered customer pages at phone/desktop sizes,
the dev-only admin preview, pickup-order source, Supabase migrations, lint, and a
production build.

## Decision

Treat the current repository as a polished functional prototype, not as either a
blank-slate redesign or a production-ready ordering system. Preserve the brand
tokens, bilingual routing, customer page composition, menu/item/cart interaction
model, and lean admin direction. Re-open the production decisions around real
content, service policy, order integrity, staff operations, security, reliability,
and zero-cost hosting before implementation continues.

The old phase roadmap is not an accurate progress tracker: the customer and admin
rebuilds and Supabase-only data path have shipped, while security hardening, stable
image ownership, pagination, reliability work, and production acceptance have not.

## What works now

- EN/FR customer routing, homepage, categorized menu, item-modifier dialog, cart,
  closed-store checkout state, tax display, confirmation route, and pay-in-person
  model are present.
- The mobile surface is coherent and recognizably Café Le Den: logo-derived
  palette, large tap targets, direct order CTA, readable type hierarchy, reviews,
  hours, and a persistent cart/order bar.
- Supabase is the only runtime content/transaction data source; Sanity has been
  removed.
- Admin components cover a live New → Preparing → Ready board, terminal states,
  menu status control, order history filters, settings, and lightweight analytics.
- `npm run lint` completes with one image warning. The production build compiles,
  type-checks, and generates every route when configured Google fonts are
  reachable.

## Production blockers

### Order and data integrity

- The order API verifies base item price and availability but trusts submitted
  modifier names and price adjustments. A caller can alter modifier pricing and
  therefore the server-computed total.
- Public RLS allows anonymous direct inserts into `orders` and `order_items`, which
  bypasses API validation and permits spam or fabricated order data.
- There is no idempotency or rate limiting. Repeated taps/retries can duplicate
  orders, and the public endpoint has no abuse control.
- Menu editing deletes all modifiers and reinserts them without a transaction;
  partial failure can leave an item with incomplete configuration.
- Editing an item derives status from a boolean and can overwrite a deliberate
  `sold_out` state.

### Admin access and service reliability

- Any authenticated Supabase user is treated as an admin in both application
  guards and database policies. The planned admin allowlist does not exist.
- Image upload also authorizes any authenticated user, then uses the service role
  to bypass storage RLS.
- The order-alert code points at `/sounds/notification.mp3`, but that asset is not
  present. If the admin is not visibly open, email is the only optional alert.
- The dev admin preview claims missing Supabase configuration degrades cleanly,
  but the analytics client produces an unhandled rejected promise and the orders
  board logs a client error when those variables are absent. Preview resilience
  is therefore not evidence of production error handling.
- The dashboard and order-history “today” ranges are derived from server runtime
  dates rather than an explicit Montréal timezone.
- The admin order history fetches an entire selected day and has no pagination,
  despite the stated >100-orders/day target.
- No durable offline/degraded workflow, retry queue, recall guarantee, or explicit
  missed-order recovery policy exists.

### Customer truth and content

- Failed or missing Supabase reads silently fall back to sample menu, price, hours,
  address, and phone data. A production outage can therefore show plausible but
  non-authoritative business information instead of an honest unavailable state.
- Most menu imagery is category-level Unsplash fallback content, repeated across
  distinct products. Only the story panel currently has a real café photograph.
- Google ratings/reviews also have a fallback path, so provenance and freshness
  need a visible policy.
- The checkout date conversion mixes café-local business-hour logic with UTC date
  construction for pickup timestamps; the exact stored pickup time needs a
  timezone decision and test.

## Visual and interaction judgment

- The direction is worth keeping: warm cream, forest structure, orange emphasis,
  oversized editorial type, and the watermelon mark give the site an owned voice.
- The homepage over-relies on the wordmark and copy before showing food or place;
  it does not yet produce the immediate “real and delicious” proof expected from
  a destination café.
- Repeated fallback photos make different products look identical. That is the
  largest credibility drag on both featured items and the menu.
- On phone, horizontal category chips clip without a strong scroll cue and dense
  menu rows compress name, price, image, description, and add action.
- The item dialog exposes a token-composition bug: a custom typography utility
  removes `text-primary-foreground` during class merging, producing dark text on a
  forest primary button (`rgb(14,35,18)` on `rgb(47,84,54)`). The same collision
  risk applies wherever custom `text-*` type tokens and color utilities share a
  component.
- The dev admin preview demonstrates component breadth, not a validated service
  workflow. Its visual density is promising, but timing, alerting, touch targets,
  glare, device placement, and recovery must be tested against real staff use.

## Roadmap reconciliation

- Already shipped in code: design tokens/component foundation, customer rebuild,
  admin rebuild direction, Supabase-only data layer, vector wordmark, one real
  story photograph, and storefront performance work.
- Still materially open: RLS/admin allowlist, authoritative outage behavior,
  owned menu photography, admin image optimization, order-history pagination,
  modifier integrity, idempotency/rate limiting, timezone correctness, missing
  alert audio, operational recovery, realistic end-to-end testing, and the final
  visual/content bar.
- Therefore the next implementation plan should be generated from this Wayfinder
  map, not by continuing the stale phase checkboxes in `.planning/ROADMAP.md`.
