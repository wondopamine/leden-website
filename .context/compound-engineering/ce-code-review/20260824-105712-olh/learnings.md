## Institutional Learnings Search Results

### Search Context

- **Feature/Task**: Review the order-lifecycle hardening branch covering guest checkout, idempotent creation and recovery, staff authorization and compare-and-swap transitions, realtime with polling fallback, Supabase expand migrations, and the safe local/hosted lifecycle harness.
- **Keywords Used**: order lifecycle, guest checkout, idempotency, recovery, ambiguous response, admin authentication, staff allowlist, CAS, optimistic concurrency, realtime, polling, Supabase, expand migration, backward compatibility, RLS, canary, test harness, target safety
- **Files Scanned**: 0 total files (`docs/solutions/` is not present in this repository)
- **Relevant Matches**: 0 files

### Relevant Learnings

No repository-local institutional learnings were available to apply. The expected `docs/solutions/` knowledge base does not exist in this checkout, so there are no prior documented decisions, bug patterns, or conventions to cite for this review.

### Recommendations

- Treat the absence of `docs/solutions/` as a documentation gap rather than evidence that no relevant lessons exist.
- After the hardening work and hosted canary land, capture the durable lessons with `/ce-compound`, especially the expand/app/contract rollout sequence, exact request-DTO serialization at strict boundaries, persisted-data validation, idempotent recovery after ambiguous responses, staff CAS/reconciliation behavior, and lifecycle target-safety controls.
- Record hosted-canary discoveries separately from local-proof results so future rollouts can distinguish database/PostgREST behavior from application-only assumptions.
