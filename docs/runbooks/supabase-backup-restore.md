# Supabase Backup and Restore Runbook

Status: policy and owner gates incomplete — no hosted restore is authorized

This project is intended to operate without an added paid dependency. That does not make backup automatic: the owner must choose and operate a plan-appropriate backup before launch. Supabase's current documentation says paid plans have managed database backup options, while free-tier projects should regularly export logical backups. Database backups do not contain Storage API objects themselves, only their database metadata.

Provider references (re-check at execution time because plan features change):

- [Supabase database backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase CLI backup and restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)

## Owner decisions required

| Decision | Required record |
| --- | --- |
| Backup owner | Named person and backup access deputies |
| Restore approver | Named person allowed to accept downtime/data loss |
| Product target | Exact staging/production project refs; never an alias |
| RPO | Maximum acceptable order-data loss |
| RTO | Maximum acceptable ordering downtime |
| Backup method | Current provider backup or logical export, verified for the project's plan |
| Storage objects | Separate export/restore method for menu images |
| Off-site retention | Encrypted location, retention period, access policy, deletion policy |
| Drill cadence | Date and isolated destination for recurring restore proof |

Blank decisions block launch. Do not enable a paid backup or point-in-time recovery feature without explicit owner approval of cost.

## Backup scope

The minimum recoverable set is:

- public schema, private lifecycle sentinel, migration history, functions, grants, RLS policies, sequences, menu/config, orders/items/events/rate buckets, and staff allowlist;
- Auth users and settings required for staff sign-in;
- Storage bucket configuration, database metadata, and the actual menu-image objects as a separate artifact;
- deployment configuration and target-specific secret inventory, without copying secret values into the backup report.

A database-only backup is incomplete when Storage objects or external deployment settings matter.

## Creating and validating a backup

1. Independently resolve the exact project ref and compare it with the production denylist or staging allowlist.
2. Confirm the provider plan and current backup behavior in official documentation and the dashboard.
3. Pause ordering only if the chosen method or consistency requirement calls for it; retain accepted orders on the attended board.
4. Create the provider backup or logical exports using approved operator tooling. Never place a database URL or password in shell history, command output, a ticket, or this repository.
5. Export Storage objects separately when present.
6. Calculate checksums, record creation time/database version/migration head/object counts, encrypt, and move the artifacts to the approved off-site location.
7. Test that a second authorized operator can locate and decrypt the artifacts without exposing credentials.
8. A backup is not verified until it has restored successfully to an isolated target and passed the validation section below.

Do not use production as the restore-test destination.

## Restore authorization

A restore can make the project unavailable and discard transactions newer than the selected point. Before execution, record:

- incident, selected recovery point, expected data-loss window, and exact project ref;
- backup owner, restore operator, café owner or shift lead, and final approver;
- ordering pause/manual fallback start time;
- whether the restore is in-place or into a new isolated project;
- current application and migration versions plus a safe inventory of active orders.

If the lifecycle contract stack has been applied, do not redeploy the old direct-write application. Recovery is roll-forward with the current RPC-capable app or a separately reviewed compatibility migration.

## Restore procedure

Exact provider steps depend on the selected plan and backup type; follow the current official guide rather than copying a stale command from this runbook.

1. Pause public ordering and activate the café's manual fallback.
2. Preserve incident evidence and revoke or rotate credentials if compromise is suspected.
3. Verify the backup checksum and exact target one final time.
4. Perform the provider restore or restore logical artifacts into the approved isolated or new project. Account for downtime.
5. Re-create or verify items that may sit outside the database restore: Auth/deployment settings, API keys, Realtime publications, extensions/settings, and Storage objects.
6. Reapply only committed migrations not already present. Never edit migration history to hide drift.
7. Rotate application keys when the restore target changed or exposure is possible; restart or deploy consumers, then revoke old keys.
8. Keep ordering paused through validation and operator sign-off.

## Post-restore validation

All must pass:

- exact sentinel environment/checksum and project-ref handshake;
- expected migration head, schema/functions/grants/RLS, sequences, counts, and generated type contract;
- allowlisted staff succeeds; anonymous and unlisted users cannot read PII or mutate;
- storefront receives authoritative café/menu configuration and pause state;
- synthetic create commits one header/item set/initial event, identical replay returns one receipt, changed replay conflicts, and lost response recovers;
- legal compare-and-set transitions create exact monotonic events; invalid or concurrent transitions cannot overwrite;
- customer tracking is PII-free, monotonic, expiry/revocation-safe, and terminally bounded;
- Realtime loss falls back to canonical polling and stale controls lock;
- menu images are present and accessible under the intended policies;
- every synthetic artifact and credential is removed by exact ID cleanup.

Run the canary through the same application version that will reopen ordering. Do not claim recovery based only on a successful database connection.

## Completion record

Record the backup identifier/checksum (never credentials), chosen recovery point, measured RPO/RTO, validation results, remaining missing orders or Storage objects, key rotations, cleanup evidence, and signatures from the restore approver and café owner. Resume ordering with an explicit confirmation only after this record is complete.
