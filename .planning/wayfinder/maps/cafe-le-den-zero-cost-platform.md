---
title: Chart the zero-cost Café Le Den customer and admin platform
label: wayfinder:map
status: open
---

## Destination

A decision-complete product, visual, operational, and technical specification
that can be handed to implementation for a bilingual single-location Café Le Den
storefront, pickup-ordering flow, and staff admin, with no additional recurring
software spend.

## Notes

- Domain: independent Montréal café and sandwicherie; primary customer is a
  rushed phone user, secondary user is café staff operating at service speed.
- Preserve the established logo, cream/forest/orange palette, EN/FR customer
  surface, guest pickup ordering, and pay-in-person model unless a ticket decides
  otherwise.
- "No additional recurring software spend" is a hard operating constraint, not
  a temporary launch discount. Free-tier failure modes and commercial-use terms
  must be explicit.
- Visual work must benchmark shipped category leaders rather than generic
  restaurant templates. Public Mobbin references are allowed; Mobbin MCP requires
  a paid plan and is not assumed.
- Consult Wayfinder and the browser-audit workflow each session. Before future
  implementation, read the relevant Next.js 16 guides under `node_modules/next/dist/docs/`.
- The companion `/grilling` and `/domain-modeling` skills are not installed in
  this environment. HITL tickets must therefore use an explicit live user-decision
  exchange plus a written domain/state model rather than silently substituting the
  agent's preferences.
- Wayfinder is planning-only for this effort. Production implementation begins
  after the final acceptance-and-handoff decision closes.

## Decisions so far

- [Re-baseline the current product against its real user journeys](../tickets/rebaseline-current-product.md) — Preserve the coherent redesign as a functional prototype, but re-plan production around order integrity, admin security, operational recovery, owned content, and an honest live-data contract.
- [Choose the café-operations benchmark set](../tickets/choose-cafe-operations-benchmarks.md) — Benchmark Toast's control-tower IA, Square's service-speed and recovery interactions, Lightspeed's state/density stress cases, and lean Square reporting while rejecting enterprise POS scope.
- [Validate the zero-additional-cost operating envelope](../tickets/validate-zero-cost-envelope.md) — A static-first Cloudflare Workers Free plus Supabase Free stack can support a bounded best-effort pilot, but Vercel Hobby, per-order Resend, cached Google reviews, unprotected writes, and SLA/zero-loss claims are ruled out.
- [Choose the customer-facing benchmark set](../tickets/choose-customer-facing-benchmarks.md) — Use Lune, BOSSA Montréal, Blank Street, Chipotle, Starbucks Canada, and Uber Eats Pickup as distinct pattern owners for appetite, local trust, coffee ordering, modifiers, pickup promises, and recovery—not as visual identities to copy.

## Not yet specified

- The real-photography shot list and exact editorial content model, pending the
  storefront benchmark and visual-concept decision.
- Screen-level prototypes and responsive composition, pending the customer and
  staff workflow decisions.
- Offline, degraded-mode, notification, backup, and recovery behavior, pending
  the service-policy and platform-architecture decisions.
- Exact schema migration, retention, and launch-cutover work, pending the shared
  domain model and source-of-truth decision.
- Implementation phases, estimates, and rollout order, pending the final
  acceptance bar.

## Out of scope

- Paid SaaS add-ons or subscriptions introduced by this effort.
- Online card payment and its unavoidable transaction fees; pickup remains paid
  in person.
- Customer accounts, loyalty, delivery marketplace integration, and a native app.
- Multi-location or multi-tenant generalization.
- Production code changes inside the Wayfinder map itself.
