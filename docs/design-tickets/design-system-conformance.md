# Design: customer storefront and café admin

## Run — 2026-08-15 — dx-design-language

- Approved plan: replace the legacy design prose with the canonical ten-section Café Le Den contract, then conform the existing customer and admin interfaces without changing product behaviour.
- Approval: explicit confirmations in the design-language walkthrough, followed by authority to continue with agent judgment.
- Benchmark set: Lune, BOSSA Montréal, Blank Street, Chipotle, Starbucks Canada, and Uber Eats Pickup for the customer journey; Toast Orders Hub, Square KDS/Order Manager/Sales Summary, and Lightspeed KDS 2.0 for operations.
- Waiver: Display and headings use Fraunces at 500/600; body and UI use Inter at 400/500/600; no third UI typeface — TYP-1, L1; reason: established local, appetite-led character with clear interface typography; approver: Jeongwon Do.
- Design review verdict: pass-with-findings; no blocking finding remains. Full verbatim verdict and verification ledger: `docs/design-reviews/2026-08-15-dx-conformance.md`.
- Review fixes: true navigation links, semantic 12-column spans, per-route metadata, cart removal Undo, single-channel error focus, orders transition/loading/error recovery, category draft protection, tokenised finite motion, 1.25×+ heading hierarchy, and restored pre-plan API/analytics behaviour.
- Deferred advisory: validate or replace the silent `sample-data.ts` fallback with named café-owner sign-off before public launch (CNT-4).
- Commit or PR: pending final LFG review and handoff.
