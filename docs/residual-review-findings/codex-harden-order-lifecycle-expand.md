# Residual Review Findings

Source review: `.context/compound-engineering/ce-code-review/20260824-105712-olh/`

- P1 `src/lib/supabase/queries.ts:124` — [Ordering pause leaves customer checkout enabled](https://github.com/wondopamine/leden-website/issues/7)
- P1 `src/components/admin/orders-dashboard.tsx:227` — [Admin refresh races can stall the order board](https://github.com/wondopamine/leden-website/issues/8)
- P1 `src/components/order/order-content.tsx:244` — [Stale checkout completion can clear a newer cart](https://github.com/wondopamine/leden-website/issues/9)
- P1 `src/components/order/order-status.tsx:185` — [Hung status poll blocks every later refresh](https://github.com/wondopamine/leden-website/issues/10)
- P1 `src/lib/orders/checkout-attempt.ts:573` — [Checkout requests need ambiguity-safe deadlines](https://github.com/wondopamine/leden-website/issues/11)
- P1 `src/lib/orders/contracts.ts:149` — [Loaded clients need an order endpoint cutover](https://github.com/wondopamine/leden-website/issues/12)
- P1 `src/lib/orders/repository.server.ts:216` — [Supabase operations need bounded request deadlines](https://github.com/wondopamine/leden-website/issues/13)
- P1 `src/lib/sample-data.ts:267` — [Sample fixtures must fail closed outside preview](https://github.com/wondopamine/leden-website/issues/14)
- P1 `supabase/migrations/006_atomic_order_creation_expand.sql:59` — [Modifier backfill makes paid add-ons mandatory](https://github.com/wondopamine/leden-website/issues/15)
- P1 `supabase/migrations/006_atomic_order_creation_expand.sql:361` — [Raw hosted migration leaves ordering configuration unusable](https://github.com/wondopamine/leden-website/issues/16)
- P1 `supabase/migrations/006_atomic_order_creation_expand.sql:728` — [Modifier snapshots break the old admin contract](https://github.com/wondopamine/leden-website/issues/17)
- P1 `supabase/migrations/006_atomic_order_creation_expand.sql:969` — [Expired rate buckets require bounded pruning](https://github.com/wondopamine/leden-website/issues/18)

These findings were independently validated during aggregate review. Three separate `safe_auto` findings were fixed and re-reviewed in commit `530fb76`; the items above require downstream implementation or an explicit deployment-contract decision. Hosted canary actions remain owner-gated.
