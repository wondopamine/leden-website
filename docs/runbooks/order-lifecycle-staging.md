# Order Lifecycle Staging and Canary Runbook

Status: preparation only — no hosted target has been authorized or touched

This runbook describes the gates for proving the order lifecycle on a separate hosted non-production project. It is not authorization to create a project, bootstrap the sentinel, apply migrations, deploy, or submit an order.

## Release boundary

Local proof is necessary but not merge- or launch-proof. Hosted verification has two separate gates:

1. A local production Next.js server uses hosted staging Auth, RLS, RPC, and Realtime with official Turnstile test credentials.
2. The actual staging hostname and edge use a staging widget plus the exact production-style action and hostname policy.

U8 contract migrations remain outside the active migration chain until the first hosted canary passes. Production remains forbidden throughout this runbook.

## Required owners and approvals

Record names and timestamps before continuing. A blank row is a stop condition.

| Gate | Required decision | Owner/sign-off |
| --- | --- | --- |
| Staging target | Exact 20-character project ref; confirmed non-production | _unassigned_ |
| Production denylist | Different exact production project ref | _unassigned_ |
| Sentinel bootstrap | Authority for only the checksum-pinned SQL artifact | _unassigned_ |
| Migration canary | Authority to apply committed expand migrations to staging | _unassigned_ |
| Synthetic staff | Named person responsible for the temporary account | _unassigned_ |
| Privileged key | Named holder and rotation/revocation operator | _unassigned_ |
| Backup | Verified backup/export and restore-test owner | _unassigned_ |
| Café operations | Owner/shift lead for device and fallback rehearsal | _unassigned_ |
| Platform staging | Staging hostname/edge deployment approval | _unassigned_ |
| Cleanup | Person who verifies every exact synthetic artifact is gone | _unassigned_ |

## Target handshake

All signals must agree. Environment variable names are inputs, not proof.

- The URL is exactly `https://<staging-ref>.supabase.co` with no path, credentials, port, query, or fragment.
- `EXPECTED_STAGING_PROJECT_REF` equals the URL-derived ref.
- `PRODUCTION_PROJECT_REF` is present, valid, and different.
- `LIFECYCLE_MUTATION_TARGET=staging:<staging-ref>` names that same ref.
- The protected sentinel reports `staging` with checksum `85fd583a19be476b1130ab505bd2829f0324c1f621d46b38b14fd1ec6a3fcdb3`.
- A valid per-run cleanup manifest exists before the first synthetic mutation.

Any mismatch stops the run. Never substitute an environment nickname, branch name, or dashboard label for the exact project reference.

## Phase 1: read-only pre-bootstrap audit

Before the sentinel exists, use read-only access to capture:

- exact project ref, database version, schemas, extensions, migration history, table counts, and Auth user count;
- evidence that the target is not production and contains no customer order data;
- the baseline against which bootstrap-only drift will be checked.

Do not link the working tree to a project, push migrations, create a user, or run a reset during this audit. If the target has unexpected history or data, stop and have the owner decide whether to replace it.

## Phase 2: one-time sentinel bootstrap

This step requires a separate, explicit approval after Phase 1 evidence is reviewed.

1. Recompute the SHA-256 of `supabase/bootstrap/environment-sentinel.sql` and require the pinned digest above.
2. Set the database session values for `app.lifecycle_environment=staging` and the pinned bootstrap checksum.
3. Apply exactly that artifact—no wrapper DDL, seed, migration, or convenience script.
4. Read the protected sentinel independently through the service-only RPC.
5. Repeat the Phase 1 inventory and prove that only the private sentinel table/function/grants and singleton row changed.

Unexpected drift is a hard stop. Preserve evidence and request review; do not fix forward ad hoc.

## Phase 3: expand canary preparation

Only after the handshake passes:

- verify a backup/export suitable for the target's current plan and name its owner;
- create a unique lifecycle run ID and an ignored `0600` exact-cleanup manifest;
- provision one synthetic, least-privilege allowlisted staff user with no reusable real address;
- configure distinct staging-only public, anonymous, and privileged keys;
- configure an explicit staging HMAC version/key and official Turnstile test site/secret keys;
- disable traces, video, and request-body reporting for bearer-bearing lifecycle cases;
- keep public ordering paused or manual fallback active during the canary.

The current `verify:order-lifecycle:local` and staff-setup scripts intentionally reject hosted targets. A reviewed hosted adapter is required before execution; do not weaken or bypass their local guards.

## Phase 4: hosted application canary

Apply committed expand migrations in order, then run the same production components used in local proof:

- EN: create, deliberately lose the HTTP response, recover one receipt, prove identical replay, advance `new → preparing → ready → picked_up`, and observe customer versions `0 → 1 → 2 → 3`.
- FR: create, cancel from an allowed active state with the call-before-cancel confirmation, and observe localized terminal status.
- Prove one complete item set and initial event, exact actor/version event order, changed-payload conflict, modifier ownership rejection, anonymous/unlisted denial, one-winner concurrency, and no partial rows.
- Block Realtime, require visible Polling, mutate through the authorized RPC, and prove canonical polling catches up without duplication or regression.
- Prove raw tracking material is absent from URLs after bootstrap, referrers, reports, traces, server/access logs, and database plaintext.
- Prove terminal retry or an invalid transition cannot create another event.

Failure leaves ordering paused. Do not proceed to U8 or deploy the old application after a contract change.

## Phase 5: actual staging hostname and edge

This is a later platform gate, distinct from the database canary.

- Deploy only to the approved staging hostname.
- Use a staging widget/secret pair, expected action, and exact staging hostname.
- Verify proxy/CDN client identity headers cannot be spoofed by the browser.
- Verify status responses retain no-store/no-referrer/restrictive CSP headers and no third-party requests after checkout navigation.
- Repeat EN/FR lifecycle and exact cleanup through the actual edge.

## Operator rehearsal

The café owner or delegate records:

- the always-on board device and responsible shift role;
- how the device stays powered, awake, connected, visible, and attended;
- that a new order is noticed visually without relying on audio;
- successful Live → Polling → Stale → manual Refresh recovery;
- pause/resume and manual fallback behavior;
- a synthetic picked-up path and a synthetic cancelled path;
- the phone/counter fallback used while ordering is paused;
- final artifact cleanup and sign-off time.

## Privileged-key lifecycle

- Local, staging, and production keys are distinct; a key is never copied between targets.
- Privileged keys exist only in server-side secret storage and named operator tooling, never browser bundles, screenshots, tickets, or committed files.
- Rotate before launch and immediately after suspected exposure. Deploy or restart consumers on the new key, verify health, revoke the old key, and prove the old key is denied.
- Review Auth and database audit evidence after rotation.
- Once the new Supabase secret-key scheme is accepted, remove the legacy service-role fallback rather than retaining two long-lived credentials.

## Cleanup and evidence

Cleanup is per-run and exact: revoke tracking, remove only recorded order/item/event/rate/staff/Auth IDs, then prove each ID is absent. Broad prefix/date deletion is forbidden. Rerun cleanup after interruption with the same manifest.

Retain only PII-free evidence: command names/results, migration versions, aggregate counts, safe error codes, event status/version/actor-presence assertions, target ref, and signed owner gates. Never retain request bodies, raw tracking secrets, staff passwords, service keys, customer names, or phone numbers.

## Exit criteria

Hosted canary is complete only when both hosted gates, backup evidence, key ownership, operator rehearsal, and exact cleanup are signed. Until then report: “local lifecycle proof passed; hosted canary and launch remain owner-gated.”
