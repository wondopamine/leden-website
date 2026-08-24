# Café Le Den Order Lifecycle Contract

Status: active hardening contract
Approved: 2026-08-24
Implementation plan: `docs/plans/2026-08-24-001-feat-order-lifecycle-hardening-plan.md`

## Product boundary

Café Le Den accepts guest pickup orders for one Montréal café. Customers use EN or FR, pay in person, choose ASAP or a same-day Montréal-local time, and do not create an account. The order vocabulary remains `new`, `preparing`, `ready`, `picked_up`, and `cancelled`.

This hardening milestone does not add online payment, delivery, loyalty, POS integration, future-day scheduling, multi-location support, a general role system, or a paid service dependency.

## Acceptance and authority

- A successful atomic database commit means the order is accepted into the café queue. `new` means accepted and awaiting preparation.
- Postgres is authoritative for menu and modifier identity, availability, tax, totals, hours, lead time, pickup promise, idempotency, and transitions.
- Browser names and prices are estimates/presentation only and never become persisted authority.
- Header, immutable line snapshots, initial event, idempotency identity, and tracking hash commit together or not at all.
- The café's owner-controlled ordering pause and approved lead time are the intentionally simple capacity gate for this phase.

## State and concurrency

Allowed transitions are:

- `new → preparing | cancelled`
- `preparing → ready | cancelled`
- `ready → picked_up | cancelled`
- `picked_up` and `cancelled` are terminal

Every transition compares the expected state/version, increments the canonical version once, and writes one matching customer-PII-free event. Terminal actions require contextual confirmation. Operator mistakes follow the owner-approved recovery runbook; no hidden direct reversal is part of the state graph.

## Customer receipt and tracking

- The browser creates an attempt UUID and an independent 256-bit bearer secret before first submit.
- Identical retries replay one committed receipt. Reusing an attempt with changed material semantics conflicts.
- Only the secret hash is stored. Display order numbers never authorize lookup.
- The raw secret may appear in a fragment during initial bootstrap or explicit Copy Link, but never in an HTTP request URL, referrer, server/access log, or database plaintext.
- Customer status/recovery responses contain no customer PII, staff identity, internal UUID, idempotency key, or raw database row.
- Status is pull-only and polls while visible. Realtime is not exposed anonymously.

## Staff and degraded operation

- Only allowlisted staff can read order PII or mutate café data. Layouts, handlers, actions, RLS policies, and transition routines reauthorize independently.
- Realtime is an invalidation hint. Canonical no-store reconciliation is the correctness layer.
- The board identifies `Live`, `Reconnecting`, `Polling`, and `Stale`, preserves last-known data honestly, and disables transitions after the stale threshold until a canonical refresh succeeds.
- The attended board and visible unacknowledged state are primary. Email and audio do not define whether an order exists.

## Local database contract

The committed Supabase project uses the existing additive migration history `001`-`004`, then runs these seed paths in order:

1. `supabase/bootstrap/environment-sentinel.sql`
2. `supabase/seed.sql`

The seed contains only synthetic fixed-ID menu/hours fixtures and creates no Auth user. U2 owns login-capable synthetic staff after its allowlist schema exists.

Pinned tools:

- Supabase CLI `2.115.0`
- Vitest `4.1.11`

Local ports are fixed:

| Service | URL/port |
|---|---|
| API | `http://127.0.0.1:54321` |
| Postgres | `127.0.0.1:54322` |
| Studio | `http://127.0.0.1:54323` |
| Inbucket | `http://127.0.0.1:54324` |

Local setup never links a hosted project:

```bash
npm install
npm run check:lifecycle-prerequisites
npm run supabase:start
npm run supabase:reset:local
npm run supabase:test:db
npm run test:target-safety
```

`supabase db reset --local` is destructive only to the committed loopback database. Never omit `--local` from a reset command.

## Mutation-target handshake

Environment strings are inputs, not proof. Before any mutation, `tests/e2e/helpers/supabase-target.ts` requires all applicable signals to agree.

### Local

- `LIFECYCLE_MUTATION_TARGET=local`
- URL origin is exactly `http://127.0.0.1:54321`
- protected database sentinel reports `local`
- sentinel checksum matches the committed bootstrap artifact
- a valid per-run exact cleanup manifest exists

`localhost`, alternate loopback addresses, alternate ports, URL paths, credentials, query strings, and hosted URLs are rejected.

### Hosted staging

Hosted staging is not authorized during U1. U7 must require:

- URL-derived project ref equals `EXPECTED_STAGING_PROJECT_REF`
- `PRODUCTION_PROJECT_REF` is present, valid, and different
- `LIFECYCLE_MUTATION_TARGET=staging:<exact-ref>` matches
- protected database sentinel reports `staging`
- sentinel checksum matches the committed bootstrap artifact
- exact per-run cleanup capability is present

Any missing or mismatched signal fails closed. Production credentials, real customer data, and an environment-name alias can never satisfy the handshake.

## Sentinel bootstrap

`supabase/bootstrap/environment-sentinel.sql` is outside the migration chain and pinned by:

```text
SHA-256 85fd583a19be476b1130ab505bd2829f0324c1f621d46b38b14fd1ec6a3fcdb3
```

The artifact creates one private singleton table and one service-role-only read RPC. Anonymous and authenticated browser roles receive no table or routine privilege. It is idempotent for the same environment/checksum and refuses to retarget an existing row.

Local reset records `local` in `seed.sql`. A newly created hosted non-production target may receive `staging` only during U7's one-time owner-approved bootstrap: verify the exact project ref read-only, verify the artifact checksum, set session values `app.lifecycle_environment=staging` and `app.lifecycle_bootstrap_checksum=<pinned digest>`, apply this exact artifact, then independently read the protected sentinel. Migration `005` must adopt and validate the same object. No other pre-baseline drift is permitted.

## Exact cleanup contract

Every lifecycle run uses an ID shaped like `YYYYMMDDTHHMMSSZ-<opaque-lowercase-suffix>` and writes an untracked manifest at:

```text
.lifecycle-tests/runs/<run-id>.json
```

The U1 manifest supports exact `orderItemIds` and `orderIds`; later units extend it only when they introduce new fixture tables. IDs must be concrete UUIDs, are bounded per run, and are deleted child-first. Wildcards, name/date prefixes, unknown tables, duplicate IDs, and broad cleanup are rejected.

Preview without mutation:

```bash
npm run cleanup:lifecycle-test -- --run-id 20260824T120000Z-8d71d2cb
```

Execution additionally requires the full live target handshake:

```bash
npm run cleanup:lifecycle-test -- --run-id 20260824T120000Z-8d71d2cb --execute
```

The script deletes any listed rows still present and then proves no listed ID remains, so an interrupted cleanup can be rerun safely. U1 verification uses dry-run/pure tests only; no remote cleanup is performed.

## Rollout gates

- U1: local contract, environment, sentinel, safety helper, and cleanup capability
- U2-U6: allowlist, atomic domain, server boundary, customer tracking, admin reliability
- U7: complete local proof, then owner-authorized hosted canary and operator rehearsal
- U8: separate contract migration stack after canary; old direct mutation paths then fail safely

Local success is not a production SLA. Merge/launch claims remain gated by hosted proof, real staging hostname/Turnstile proof, owner-approved content and retention, backup/restore ownership, manual fallback, and production cutover approval.
