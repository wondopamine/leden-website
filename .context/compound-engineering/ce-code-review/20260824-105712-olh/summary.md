## Code Review Results

**Scope:** `17e7623` to the U1-U7 working tree at dispatch (`9ae9ffc` plus staged U7)
**Intent:** Harden the customer and staff order lifecycle with authoritative pricing, private recovery, least-privilege administration, deterministic local proof, and an owner-gated hosted canary without paid infrastructure
**Mode:** autofix

**Reviewers:** correctness, testing, maintainability, project-standards, security, performance, api-contract, data-migrations, reliability, adversarial, cli-readiness, kieran-typescript, julik-frontend-races, agent-native, learnings, schema-drift, deployment-verification

- security — public credential, privacy, rate-limit, Auth, and RLS boundaries
- performance — polling, realtime refresh, and durable bucket growth
- api-contract — new create, recovery, status, admin, and migration compatibility shapes
- data-migrations — expand safety, raw hosted defaults, backfills, and rollback constraints
- reliability — ambiguous creates, dependency hangs, replay, polling, and admin recovery
- adversarial — cross-surface pause, cleanup, timing, and retention failures
- cli-readiness — aggregate verifier discovery and automation safety
- kieran-typescript — runtime validators, persisted state, and type-boundary duplication
- julik-frontend-races — stale async completions, removal, checkout, and dashboard refreshes

### P1 -- High

| # | File | Issue | Reviewer | Confidence | Route |
|---|------|-------|----------|------------|-------|
| 1 | `scripts/verify-order-lifecycle-local.mjs:508` | Cleanup-control failure strands synthetic lifecycle data | adversarial | 100 | `safe_auto -> review-fixer` |
| 2 | `src/components/order/order-status.tsx:256` | Pending poll undoes private-order removal | julik-frontend-races | 100 | `safe_auto -> review-fixer` |
| 3 | `src/lib/orders/checkout-attempt.ts:537` | Persisted recovery sends an undeclared field | api-contract, kieran-typescript | 100 | `safe_auto -> review-fixer` |
| 4 | `src/lib/supabase/queries.ts:124` | Ordering pause leaves customer checkout enabled | adversarial, correctness, testing | 100 | `gated_auto -> downstream-resolver` |
| 5 | `src/components/admin/orders-dashboard.tsx:227` | Admin refresh races can stall the order board | julik-frontend-races, performance, reliability | 75 | `gated_auto -> downstream-resolver` |
| 6 | `src/components/order/order-content.tsx:244` | Stale checkout completion can clear a newer cart | julik-frontend-races | 75 | `gated_auto -> downstream-resolver` |
| 7 | `src/components/order/order-status.tsx:185` | Hung status poll blocks every later refresh | reliability | 100 | `gated_auto -> downstream-resolver` |
| 8 | `src/lib/orders/checkout-attempt.ts:573` | Checkout requests need ambiguity-safe deadlines | reliability | 100 | `gated_auto -> downstream-resolver` |
| 9 | `src/lib/orders/contracts.ts:149` | Loaded clients need an order endpoint cutover | api-contract | 100 | `manual -> downstream-resolver` |
| 10 | `src/lib/orders/repository.server.ts:216` | Supabase operations need bounded request deadlines | reliability | 100 | `gated_auto -> downstream-resolver` |
| 11 | `src/lib/sample-data.ts:267` | Sample fixtures must fail closed outside preview | correctness | 100 | `gated_auto -> downstream-resolver` |
| 12 | `supabase/migrations/006_atomic_order_creation_expand.sql:59` | Modifier backfill makes paid add-ons mandatory | data-migrations | 100 | `manual -> downstream-resolver` |
| 13 | `supabase/migrations/006_atomic_order_creation_expand.sql:361` | Raw hosted migration leaves ordering configuration unusable | data-migrations | 100 | `gated_auto -> downstream-resolver` |
| 14 | `supabase/migrations/006_atomic_order_creation_expand.sql:728` | Modifier snapshots break the old admin contract | api-contract | 100 | `gated_auto -> downstream-resolver` |
| 15 | `supabase/migrations/006_atomic_order_creation_expand.sql:969` | Expired rate buckets require bounded pruning | adversarial, performance, security | 100 | `manual -> downstream-resolver` |

### Applied Fixes

- Made exact manifest cleanup unconditional when the foreign-control setup or verification fails, preserving independent failures.
- Added abort/generation invalidation so a pending 200/404 cannot undo explicit private-order removal, session change, or unmount.
- Serialized persisted recovery through the exact `{ attemptId, trackingSecret }` DTO.
- Focused Vitest passed 17 tests; TypeScript, ESLint, diff checks, and three independent bounded re-reviews passed for the assigned fixes.

### Residual Actionable Work

| # | File | Issue | Route | Next Step |
|---|------|-------|-------|-----------|
| 1 | `src/lib/supabase/queries.ts:124` | Ordering pause leaves customer checkout enabled | `gated_auto -> downstream-resolver` | [Issue #7](https://github.com/wondopamine/leden-website/issues/7) |
| 2 | `src/components/admin/orders-dashboard.tsx:227` | Admin refresh races can stall the order board | `gated_auto -> downstream-resolver` | [Issue #8](https://github.com/wondopamine/leden-website/issues/8) |
| 3 | `src/components/order/order-content.tsx:244` | Stale checkout completion can clear a newer cart | `gated_auto -> downstream-resolver` | [Issue #9](https://github.com/wondopamine/leden-website/issues/9) |
| 4 | `src/components/order/order-status.tsx:185` | Hung status poll blocks every later refresh | `gated_auto -> downstream-resolver` | [Issue #10](https://github.com/wondopamine/leden-website/issues/10) |
| 5 | `src/lib/orders/checkout-attempt.ts:573` | Checkout requests need ambiguity-safe deadlines | `gated_auto -> downstream-resolver` | [Issue #11](https://github.com/wondopamine/leden-website/issues/11) |
| 6 | `src/lib/orders/contracts.ts:149` | Loaded clients need an order endpoint cutover | `manual -> downstream-resolver` | [Issue #12](https://github.com/wondopamine/leden-website/issues/12) |
| 7 | `src/lib/orders/repository.server.ts:216` | Supabase operations need bounded request deadlines | `gated_auto -> downstream-resolver` | [Issue #13](https://github.com/wondopamine/leden-website/issues/13) |
| 8 | `src/lib/sample-data.ts:267` | Sample fixtures must fail closed outside preview | `gated_auto -> downstream-resolver` | [Issue #14](https://github.com/wondopamine/leden-website/issues/14) |
| 9 | `supabase/migrations/006_atomic_order_creation_expand.sql:59` | Modifier backfill makes paid add-ons mandatory | `manual -> downstream-resolver` | [Issue #15](https://github.com/wondopamine/leden-website/issues/15) |
| 10 | `supabase/migrations/006_atomic_order_creation_expand.sql:361` | Raw hosted migration leaves ordering configuration unusable | `gated_auto -> downstream-resolver` | [Issue #16](https://github.com/wondopamine/leden-website/issues/16) |
| 11 | `supabase/migrations/006_atomic_order_creation_expand.sql:728` | Modifier snapshots break the old admin contract | `gated_auto -> downstream-resolver` | [Issue #17](https://github.com/wondopamine/leden-website/issues/17) |
| 12 | `supabase/migrations/006_atomic_order_creation_expand.sql:969` | Expired rate buckets require bounded pruning | `manual -> downstream-resolver` | [Issue #18](https://github.com/wondopamine/leden-website/issues/18) |

### Learnings & Past Solutions

- No `docs/solutions/` directory or applicable stored solution was found.

### Agent-Native Gaps

- Runtime agent integration is not part of this product. If it is added later, current DAL/RPC operations provide programmatic seams, but customer/admin parity must be designed explicitly rather than assumed.

### Schema Drift Check

- Clean: generated database types align with migrations in scope; no unrelated drift was found.

### Deployment Notes

- NO-GO for a hosted migration or cutover while local P1s remain and target, backup, key, test-staff, hostname, cleanup, and café-rehearsal owners are undefined.
- U8 remains blocked until the hosted canary succeeds and the owner-approved observation window closes.

### Coverage

- Thirteen structured reviewer artifacts passed schema validation; no reviewer failed.
- Validators: 15 dispatched, 15 accepted, 0 rejected, 0 failed.
- Fourteen deduplicated lower-priority candidates exceeded the 15-finding validation cap and were dropped from this review pass; they remain discoverable in persona artifacts.
- One bounded autofix round cleared all three assigned `safe_auto` findings. Re-review reconfirmed the separately tracked hung-poll residual without finding a regression in the removal fix.
- Requirements: U1 and U2 complete; U3-U6 partial; U7 local complete; U7 hosted and U8 owner-gated.

---

> **Verdict:** Not ready
>
> **Reasoning:** Local U1-U7 proof is strong and the deterministic autofixes are applied, but twelve validated high-impact compatibility, availability, race, deadline, and retention findings must be resolved or explicitly gated before launch.
>
> **Fix order:** Migration compatibility and retention -> customer availability and cart races -> request/admin deadlines -> loaded-client cutover -> full local proof -> hosted owner gate
