# Café Le Den

Customer pickup ordering and a staff order board for Café Le Den. The product is guest checkout, pay-at-pickup, bilingual EN/FR, and one café. PostgreSQL owns menu availability, pricing, tax, pickup promises, idempotency, and the order state machine; Next.js owns the customer and authorized staff boundaries.

No paid ordering, email, payment, or queue product is required by this implementation.

## Local development

Requirements:

- Node.js 20.19 or newer
- Docker Desktop or a compatible Docker daemon
- npm

Install dependencies and start the application:

```bash
npm install
npm run dev
```

The committed local Supabase stack uses fixed loopback ports and never links a hosted project. Start and reset it with:

```bash
npm run check:lifecycle-prerequisites
npm run supabase:start
npm run supabase:reset:local
```

`supabase:reset:local` is destructive to the local database at `127.0.0.1:54322`. Never remove the `--local` protection from the underlying command.

## Verification

The complete local proof is:

```bash
npm run verify:order-lifecycle:local
```

It starts from a clean local reset and runs 220 database contracts, generated-type drift, 184 unit tests, four observed-lock races, real Auth/RLS/RPC integration, 27 intercepted design regressions, isolated production webpack builds, and three real browser cases covering authorization denial plus the EN picked-up and FR cancelled customer-to-admin lifecycles. It finishes with a private-material output scan, exact per-run cleanup, and restoration of the deterministic café schedule even after failure or interruption.

Useful focused commands:

| Command | Purpose |
| --- | --- |
| `npm run test:unit` | Unit contracts |
| `npm run supabase:test:db` | All pgTAP database contracts |
| `npm run test:order-lifecycle:races` | Deterministic multi-connection lock races |
| `npm run test:order-lifecycle:integration` | Explicitly gated real local Auth/RLS/RPC proof |
| `npm run test:e2e` | Playwright suite; mutation cases remain gated |
| `npm run build -- --webpack` | Supported production build in this workspace |
| `npm run lint` | ESLint and design-token guardrails |
| `npx tsc --noEmit` | TypeScript contract |

The real lifecycle command is deliberately local-only. It uses Cloudflare's official Turnstile test credentials behind an exact clean-local marker, stores synthetic staff credentials and cleanup manifests in ignored `0600` files, never exposes a privileged database key to the browser, and records concrete IDs rather than deleting by prefix or date.

## Safety and deployment status

- Local verification is green as of 2026-08-24.
- No hosted project was accessed, bootstrapped, migrated, or mutated by the local work.
- Local success is not a merge, canary, backup, or launch approval.
- Hosted staging requires an owner-confirmed non-production project, a distinct production project reference for the denylist, explicit sentinel-bootstrap authority, named backup/key owners, and exact synthetic cleanup.
- Production reset, contract migration, deployment, and real order creation are outside the local verifier.

Read these before any remote work:

- [Order lifecycle contract](docs/order-lifecycle-contract.md)
- [Reviewed implementation plan](docs/plans/2026-08-24-001-feat-order-lifecycle-hardening-plan.md)
- [Staging and canary runbook](docs/runbooks/order-lifecycle-staging.md)
- [Order recovery runbook](docs/runbooks/order-recovery.md)
- [Backup and restore runbook](docs/runbooks/supabase-backup-restore.md)

## Architecture in one flow

```text
customer IDs-only checkout
  → same-origin/identity/rate/challenge boundary
  → atomic PostgreSQL order RPC
  → authorized staff canonical queue + CAS transitions
  → token-scoped PII-free customer status polling
```

Realtime is a refresh hint for staff, not the source of truth. A committed database transaction is acceptance; no email or audio cue defines whether an order exists.
