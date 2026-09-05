# Deployment Verification: Order Lifecycle Expand and Application Cutover

## Current Decision

**NO-GO for any hosted migration, application cutover, or production launch.**

This checklist covers the reviewed diff from base 17e7623 through committed U1-U6 at 9ae9ffcee39cb67865e7c2bb0699ab4a23216ea4 plus the currently staged U7 proof changes. The staged tree is not an immutable deploy artifact, no hosted target or owner approval has been supplied, the staging runbook still has blank owners, and the hosted canary has not run.

This document is planning and read-only verification guidance. It grants no authority to connect to, bootstrap, migrate, seed, provision, deploy, clean, or otherwise mutate any hosted Supabase or application target. Every SQL statement below is SELECT-only. Mutation steps remain owner-gated and must use reviewed operator tooling.

## Blocking Findings to Close Before Hosted Go

- [ ] Commit and identify one immutable application/migration artifact; the current staged U7 working tree is not deployable.
- [ ] Fix the raw hosted migration state: migrations 001-007 retain max_advance_order_days = 3, while create_order_v1 requires 0 and the settings form cannot preserve an entered zero.
- [ ] Replace the universal modifier min_selections = 1 backfill with an owner-reviewed per-group mapping; the known paid Add-on must remain optional.
- [ ] Prevent overlap between the preserved legacy multi-request menu writer and v1 checkout, or define a pause/drain cutover that makes overlap impossible.
- [ ] Remove receipt_id from the public create/recovery receipt contract.
- [ ] Choose, implement, own, and verify an operational schedule for pruning expired order_rate_buckets.
- [ ] Review the installed Next.js 16.3.1 guidance and update the stale plan reference to 16.2.1.
- [ ] Assign owners for staging target, production denylist, sentinel bootstrap, migration, privileged key, backup/restore, synthetic staff, cleanup, café operations, and edge deployment.
- [ ] Complete an isolated backup restore drill and approve RPO/RTO before any production consideration.
- [ ] Complete the owner-authorized hosted Supabase canary before preparing U8. Do not add or apply 008/009 during this expand checklist.

## Go/No-Go Invariants

### Target and release identity

- [ ] The exact 20-character hosted project ref is independently classified staging, is different from the production denylist, and matches every approved configuration signal.
- [ ] The sentinel exists only after its separately approved checksum-pinned bootstrap and reports environment = staging with checksum 85fd583a19be476b1130ab505bd2829f0324c1f621d46b38b14fd1ec6a3fcdb3.
- [ ] Migration history before expand is understood and reconciled; no applied migration file is edited to conceal drift.
- [ ] The deployed source SHA, built artifact SHA, migrations SHA, generated database types, and run ID are recorded together.

### Raw data and schema

- [ ] Exactly one café configuration exists.
- [ ] ordering_enabled remains false until the RPC-capable app, staff identity, Turnstile, and canary are ready.
- [ ] timezone is America/Toronto and max_advance_order_days is exactly 0 before v1 ordering is enabled.
- [ ] Every modifier group has an owner-approved min_selections value; optional paid Add-on groups are 0 and required Size/Milk-style groups are 1.
- [ ] Menu status is one of available, sold_out, hidden and available equals status <> hidden.
- [ ] Modifier option prices are non-null and nonnegative.
- [ ] Legacy orders remain lifecycle_contract_version IS NULL and remain readable to allowlisted staff, but are never made trackable.
- [ ] Every lifecycle v1 order has at least one line, one version-0 initial event, complete idempotency/tracking fields, exact totals, and no duplicate idempotency key or tracking digest.
- [ ] Legal status transitions are versioned exactly once and have exactly one matching immutable event.

### Authorization and coexistence

- [ ] Anonymous direct order/order-item inserts are denied.
- [ ] Unlisted authenticated users cannot read order PII or mutate café data.
- [ ] The synthetic staff Auth UUID exists before canary; its admin_users membership is inserted only after migration 005 creates the table and is verified before app traffic.
- [ ] Old Next.js instances and the old multi-request menu editor are drained before v1 checkout is enabled.
- [ ] Public ordering is paused outside the old application, because the old order route does not honor the new ordering_enabled column.
- [ ] No old application is redeployed after any future U8 contract migration.

### Operations

- [ ] A valid backup exists outside the target and has restored successfully to an isolated destination.
- [ ] Storage objects, Auth configuration/users, deployment settings, migration history, sequences, and secret inventory are covered in addition to public database tables.
- [ ] Manual phone/in-person ordering fallback is active and staffed throughout migration/cutover.
- [ ] A cleanup manifest exists before the first synthetic mutation; cleanup uses exact recorded IDs only.
- [ ] A rate-bucket pruning owner, cadence, alert, and tested procedure exist.
- [ ] Monitoring owners can pause ordering immediately on any stop condition.

## Red Pre-Deploy Checklist

- [ ] Record all owner names, approvals, timestamps, exact target ref, production denylist ref, source SHA, artifact SHA, and run ID.
- [ ] Verify the checkout is clean and the deployment artifact contains the intended staged U7 proof changes.
- [ ] Attach passing local evidence: clean reset/seed, pgTAP, generated-type drift check, unit tests, deterministic multi-connection races, production build, real local lifecycle Playwright, lint/type checks, and exact cleanup.
- [ ] Resolve every blocking finding above or record an explicit reviewed rejection. P1 findings are automatic NO-GO.
- [ ] Complete the read-only Phase 1 target audit and save only aggregate/PII-free results.
- [ ] Create and restore-test the backup using the current provider-plan procedure.
- [ ] Verify the old application can be externally paused; do not rely on ordering_enabled until the new app is serving all traffic.
- [ ] Freeze staff menu/settings writes and activate manual fallback.
- [ ] Drain old application instances and confirm through deployment-platform traffic evidence that no old artifact is receiving requests.
- [ ] Obtain a separate approval for the checksum-pinned sentinel bootstrap. Do not combine bootstrap authority with migration authority.

## Pre-Expand Read-Only SQL

Run only after the read-only target audit is authorized. Save results as PII-free deployment evidence. Any unexpected value is STOP.

### A. Database and migration identity

    select
      current_database() as database_name,
      current_user as database_user,
      current_setting('server_version') as server_version,
      current_setting('server_version_num') as server_version_num,
      pg_is_in_recovery() as is_replica;

    select version
    from supabase_migrations.schema_migrations
    order by version;

    select
      to_regnamespace('public') is not null as has_public,
      to_regnamespace('auth') is not null as has_auth,
      to_regnamespace('storage') is not null as has_storage,
      to_regnamespace('private') is not null as has_private;

Expected:

- Exact database/project identity agrees with the independently resolved staging ref.
- PostgreSQL version is compatible with the committed Supabase configuration.
- Migration history is exactly the reviewed baseline. Unknown versions, missing 001-004, or unexpected private schema objects are STOP pending reconciliation.

### B. Baseline counts and status distribution

    select 'categories' as object_name, count(*) as row_count from public.categories
    union all
    select 'menu_items', count(*) from public.menu_items
    union all
    select 'modifiers', count(*) from public.modifiers
    union all
    select 'modifier_options', count(*) from public.modifier_options
    union all
    select 'cafe_info', count(*) from public.cafe_info
    union all
    select 'orders', count(*) from public.orders
    union all
    select 'order_items', count(*) from public.order_items
    order by object_name;

    select status::text as status, count(*) as order_count
    from public.orders
    group by status
    order by status;

    select status, count(*) as menu_item_count
    from public.menu_items
    group by status
    order by status;

Expected:

- Save exact values for post-deploy comparison.
- The staging target contains no real customer data. Any customer orders or unexplained Auth users are STOP.

### C. Compatibility preflight

    select
      count(*) filter (
        where status is null
           or status not in ('available', 'sold_out', 'hidden')
      ) as unknown_menu_statuses,
      count(*) filter (
        where available is distinct from (status <> 'hidden')
      ) as availability_mismatches
    from public.menu_items;

    select
      count(*) filter (
        where price_adjustment is null or price_adjustment < 0
      ) as invalid_modifier_prices
    from public.modifier_options;

    select
      count(*) as cafe_rows,
      min(max_advance_order_days) as min_advance_days,
      max(max_advance_order_days) as max_advance_days,
      count(*) filter (
        where case
          when jsonb_typeof(hours) = 'array'
            then jsonb_array_length(hours) <> 7
          else true
        end
      ) as malformed_weekly_hours
    from public.cafe_info;

Expected:

- unknown_menu_statuses = 0.
- availability_mismatches may be nonzero only if the reviewed migration normalization is expected and the exact rows are understood; otherwise STOP.
- invalid_modifier_prices = 0.
- cafe_rows = 1.
- malformed_weekly_hours = 0.
- Record the existing max_advance_order_days. Current committed baseline value 3 is incompatible with v1 creation and must be corrected by a reviewed migration before Go.

### D. Owner cardinality inventory

    select
      modifier.id as modifier_id,
      item.id as menu_item_id,
      item.name_en as item_name,
      modifier.name_en as modifier_name,
      count(option.id) as option_count,
      min(option.price_adjustment) as minimum_option_price,
      max(option.price_adjustment) as maximum_option_price
    from public.modifiers as modifier
    join public.menu_items as item on item.id = modifier.menu_item_id
    left join public.modifier_options as option
      on option.modifier_id = modifier.id
    group by modifier.id, item.id, item.name_en, modifier.name_en
    order by item.name_en, modifier.sort_order, modifier.id;

Expected:

- A café owner assigns required or optional to every exact modifier UUID before the migration backfill is approved.
- The committed Add-on group c9999999-9999-9999-9999-999999999999 is optional when present.
- Empty groups are STOP.

### E. Target size and lock-risk baseline

    select
      relname as table_name,
      n_live_tup,
      n_dead_tup,
      pg_size_pretty(pg_total_relation_size(relid)) as total_size
    from pg_stat_user_tables
    where schemaname = 'public'
      and relname in (
        'orders', 'order_items', 'menu_items',
        'modifiers', 'modifier_options', 'cafe_info'
      )
    order by relname;

    select
      application_name,
      state,
      wait_event_type,
      wait_event,
      count(*) as connection_count,
      min(query_start) as oldest_query_start
    from pg_stat_activity
    where datname = current_database()
      and pid <> pg_backend_pid()
    group by application_name, state, wait_event_type, wait_event
    order by connection_count desc, application_name;

Expected:

- Table sizes and write volume fit the reviewed pause window for non-concurrent unique-index creation.
- No long-running transaction or unexplained writer is active. Any active old application writer after the drain declaration is STOP.

## Yellow Migration and Cutover Steps

The commands/tooling for hosted mutation are intentionally omitted. Use only reviewed, owner-approved operator tooling.

| Step | Required action | Verification checkpoint | Rollback/recovery boundary |
|---|---|---|---|
| 1 | Pause public ordering at the edge/maintenance layer and start manual fallback | Old route receives no new create traffic | Re-enable only if no schema change has started |
| 2 | Freeze menu/settings edits and drain every old Next.js instance | Platform evidence shows zero old-artifact traffic | Keep paused if drain cannot be proven |
| 3 | Create the synthetic Auth user only; do not call it allowlisted yet | Exact UUID recorded in cleanup manifest | Delete exact synthetic Auth user if migration is cancelled |
| 4 | Apply only the separately approved checksum-pinned sentinel bootstrap | Read-only sentinel query matches staging/checksum and baseline drift is bootstrap-only | Stop; do not repair drift ad hoc |
| 5 | Reconfirm backup, target identity, source/migration SHA, and migration authority | All signals still agree | Stop before 005 on any mismatch |
| 6 | Apply migration 005 | Schema/grants/RLS pass read-only checks | 005 remains committed if a later file fails; recovery is forward, not down migration |
| 7 | Insert the exact synthetic Auth UUID into admin_users using the reviewed hosted adapter | Staff can pass is_admin; unlisted identity cannot | Remove only the exact synthetic membership/user if canary is abandoned |
| 8 | Apply corrected migration 006, including reviewed same-day and modifier-cardinality handling | Raw post-migration config/cardinality checks pass while ordering remains false | Keep ordering paused; use a reviewed forward fix on failure |
| 9 | Apply migration 007 | Trigger/function/event invariants pass | Keep ordering paused; do not drop triggers ad hoc |
| 10 | Deploy the exact RPC-capable application artifact | Health checks pass; no old artifact remains | Restore the same RPC-capable app or roll forward; do not reopen on the unsafe old public writer |
| 11 | Run the owner-authorized hosted application canary with official staging Turnstile configuration | EN/FR create/recovery/status/admin/event/privacy/cleanup evidence passes | Failure leaves ordering paused |
| 12 | Run post-deploy SQL and exact cleanup | All invariants pass and synthetic IDs are absent | Investigate while paused |
| 13 | Obtain café owner/operations approval, then resume ordering through the new app | New app confirms enabled and accepts a final synthetic order | Pause immediately on any stop condition |

Do not apply U8 contract migrations in this sequence. They remain a separate stacked release after the hosted expand/application canary succeeds.

## Raw Post-007 Read-Only SQL

Run before deploying or enabling the new application. These checks intentionally inspect the unseeded hosted migration state.

### A. Migration and sentinel identity

    select version
    from supabase_migrations.schema_migrations
    where version in ('005', '006', '007', '008', '009')
    order by version;

    select environment, bootstrap_checksum, configured_at
    from private.lifecycle_environment_sentinel
    where singleton = true;

Expected:

- Exactly 005, 006, 007 are applied from this lifecycle stack.
- 008 and 009 are absent.
- One sentinel row reports staging and the pinned checksum.

### B. Café readiness while paused

    select
      count(*) as cafe_rows,
      count(*) filter (where singleton = true) as singleton_rows,
      bool_and(timezone = 'America/Toronto') as timezone_valid,
      bool_and(max_advance_order_days = 0) as same_day_contract_valid,
      bool_and(ordering_enabled = false) as ordering_still_paused,
      bool_and(gst_rate between 0 and 0.25) as gst_valid,
      bool_and(qst_rate between 0 and 0.25) as qst_valid
    from public.cafe_info;

Expected:

- cafe_rows = 1, singleton_rows = 1.
- All booleans are true.
- With the current uncorrected migration chain same_day_contract_valid is false on the committed baseline; that result is NO-GO, not a manual canary workaround.

### C. Modifier cardinality

    select
      modifier.id as modifier_id,
      item.name_en as item_name,
      modifier.name_en as modifier_name,
      modifier.min_selections,
      modifier.max_selections,
      count(option.id) filter (where option.available) as available_options,
      min(option.price_adjustment) filter (where option.available) as minimum_available_price
    from public.modifiers as modifier
    join public.menu_items as item on item.id = modifier.menu_item_id
    left join public.modifier_options as option
      on option.modifier_id = modifier.id
    group by
      modifier.id, item.name_en, modifier.name_en,
      modifier.min_selections, modifier.max_selections
    order by item.name_en, modifier.sort_order, modifier.id;

    select
      count(*) filter (
        where min_selections not in (0, 1) or max_selections <> 1
      ) as invalid_cardinality,
      count(*) filter (
        where min_selections = 1
          and not exists (
            select 1
            from public.modifier_options as option
            where option.modifier_id = modifier.id
              and option.available
          )
      ) as required_groups_without_options
    from public.modifiers as modifier;

    select min_selections, max_selections
    from public.modifiers
    where id = 'c9999999-9999-9999-9999-999999999999'::uuid;

Expected:

- Every row matches the signed owner mapping.
- invalid_cardinality = 0.
- required_groups_without_options = 0.
- The known Add-on returns min_selections = 0 when present. Current raw migration default 1 is NO-GO.

### D. Constraints and triggers

    select
      namespace.nspname as schema_name,
      relation.relname as table_name,
      constraint_definition.conname,
      constraint_definition.contype,
      constraint_definition.convalidated
    from pg_constraint as constraint_definition
    join pg_class as relation
      on relation.oid = constraint_definition.conrelid
    join pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname in ('public', 'private')
      and relation.relname in (
        'menu_items', 'modifiers', 'modifier_options', 'cafe_info',
        'orders', 'order_items', 'order_status_events',
        'order_rate_buckets', 'lifecycle_environment_sentinel'
      )
    order by schema_name, table_name, constraint_definition.conname;

    select
      relation.relname as table_name,
      trigger_definition.tgname as trigger_name,
      trigger_definition.tgenabled
    from pg_trigger as trigger_definition
    join pg_class as relation on relation.oid = trigger_definition.tgrelid
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and not trigger_definition.tgisinternal
      and trigger_definition.tgname in (
        'guard_lifecycle_order_insert',
        'guard_lifecycle_order_item_insert',
        'enforce_order_lifecycle_update',
        'record_order_lifecycle_event',
        'guard_order_status_event_insert',
        'guard_lifecycle_order_item_mutation',
        'guard_order_status_event_mutation',
        'guard_lifecycle_order_delete'
      )
    order by table_name, trigger_name;

Expected:

- Every lifecycle constraint is validated.
- Every listed trigger exists exactly once with tgenabled = O.

### E. RLS, grants, and functions

    select
      relation.relname as table_name,
      relation.relrowsecurity as rls_enabled,
      relation.relforcerowsecurity as rls_forced
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'admin_users', 'orders', 'order_items',
        'order_status_events', 'order_rate_buckets'
      )
    order by table_name;

    select
      schemaname,
      tablename,
      policyname,
      roles,
      cmd
    from pg_policies
    where schemaname in ('public', 'storage')
      and tablename in (
        'admin_users', 'orders', 'order_items', 'order_status_events',
        'order_rate_buckets', 'categories', 'menu_items',
        'modifiers', 'modifier_options', 'cafe_info', 'objects'
      )
    order by schemaname, tablename, policyname;

    select
      has_table_privilege('anon', 'public.orders', 'INSERT') as anon_can_insert_orders,
      has_table_privilege('anon', 'public.order_items', 'INSERT') as anon_can_insert_items,
      has_table_privilege('authenticated', 'public.orders', 'SELECT') as staff_role_has_order_select,
      has_column_privilege('authenticated', 'public.orders', 'status', 'UPDATE') as expand_status_compatibility,
      has_column_privilege('authenticated', 'public.orders', 'total', 'UPDATE') as can_rewrite_total;

    select
      has_function_privilege(
        'service_role',
        'public.create_order_v1(uuid,bytea,text,text,text,text,text,timestamp without time zone,jsonb)',
        'EXECUTE'
      ) as service_can_create,
      has_function_privilege(
        'anon',
        'public.create_order_v1(uuid,bytea,text,text,text,text,text,timestamp without time zone,jsonb)',
        'EXECUTE'
      ) as anon_can_create,
      has_function_privilege(
        'authenticated',
        'public.transition_order_status_v1(uuid,public.order_status,integer,public.order_status)',
        'EXECUTE'
      ) as authenticated_can_transition;

Expected:

- RLS is enabled on every listed table.
- anon_can_insert_orders = false and anon_can_insert_items = false.
- staff_role_has_order_select = true, expand_status_compatibility = true until U8, can_rewrite_total = false.
- service_can_create = true, anon_can_create = false, authenticated_can_transition = true.
- Policy inventory exactly matches the reviewed allowlist-aware expand policies.

### F. Raw lifecycle rows

    select
      coalesce(lifecycle_contract_version::text, 'legacy') as contract_version,
      status::text,
      count(*) as order_count
    from public.orders
    group by lifecycle_contract_version, status
    order by contract_version, status;

    select
      count(*) filter (
        where lifecycle_contract_version = 1
          and (
            receipt_id is null
            or idempotency_key is null
            or request_fingerprint is null
            or octet_length(request_fingerprint) <> 32
            or tracking_token_hash is null
            or octet_length(tracking_token_hash) <> 32
            or promised_pickup_at is null
            or status_version is null
          )
      ) as incomplete_v1_orders,
      count(*) filter (
        where lifecycle_contract_version = 1
          and not exists (
            select 1
            from public.order_items as item
            where item.order_id = orders.id
          )
      ) as v1_orders_without_items,
      count(*) filter (
        where lifecycle_contract_version = 1
          and not exists (
            select 1
            from public.order_status_events as event
            where event.order_id = orders.id
              and event.from_status is null
              and event.to_status = 'new'
              and event.status_version = 0
          )
      ) as v1_orders_without_initial_event
    from public.orders;

    select count(*) as duplicate_idempotency_groups
    from (
      select idempotency_key
      from public.orders
      where idempotency_key is not null
      group by idempotency_key
      having count(*) > 1
    ) as duplicates;

    select count(*) as duplicate_tracking_groups
    from (
      select tracking_token_hash
      from public.orders
      where tracking_token_hash is not null
      group by tracking_token_hash
      having count(*) > 1
    ) as duplicates;

Expected before canary:

- Only understood legacy rows exist; v1 counts may be zero.
- All incomplete/without-item/without-event/duplicate counts are zero.

## Green Post-Deploy Verification

Run within five minutes of the approved canary and again after exact cleanup.

### A. Exact synthetic lifecycle integrity

Replace REPLACE_WITH_SYNTHETIC_ORDER_NUMBER with the exact display number recorded in the cleanup manifest. It is not a credential.

    with target as (
      select id
      from public.orders
      where order_number = 'REPLACE_WITH_SYNTHETIC_ORDER_NUMBER'
    )
    select
      count(*) as matched_orders,
      count(*) filter (where orders.lifecycle_contract_version = 1) as v1_orders,
      coalesce(sum((
        select count(*)
        from public.order_items as item
        where item.order_id = orders.id
      )), 0) as item_rows,
      coalesce(sum((
        select count(*)
        from public.order_status_events as event
        where event.order_id = orders.id
          and event.from_status is null
          and event.to_status = 'new'
          and event.status_version = 0
      )), 0) as initial_events
    from target
    join public.orders as orders on orders.id = target.id;

    with target as (
      select id
      from public.orders
      where order_number = 'REPLACE_WITH_SYNTHETIC_ORDER_NUMBER'
    )
    select
      event.status_version,
      event.from_status::text,
      event.to_status::text,
      event.actor_user_id is not null as has_staff_actor,
      event.created_at
    from target
    join public.order_status_events as event on event.order_id = target.id
    order by event.status_version;

Expected:

- matched_orders = 1, v1_orders = 1, item_rows >= 1, initial_events = 1.
- Event sequence is exactly version 0 new followed by the approved monotonic path.
- Version 0 has no actor; staff transitions have an actor UUID.

### B. Global integrity and growth

    select
      count(*) filter (
        where lifecycle_contract_version = 1
          and total <> subtotal + tax_gst + tax_qst
      ) as bad_total_equations,
      count(*) filter (
        where lifecycle_contract_version = 1
          and tracking_expires_at <> promised_pickup_at + interval '72 hours'
      ) as bad_tracking_expiry
    from public.orders;

    select count(*) as event_version_mismatches
    from public.order_status_events as event
    join public.orders as orders on orders.id = event.order_id
    where event.status_version > orders.status_version;

    select
      count(*) as total_buckets,
      count(*) filter (where expires_at <= statement_timestamp()) as expired_buckets,
      min(expires_at) as oldest_expiry,
      max(expires_at) as newest_expiry
    from public.order_rate_buckets;

Expected:

- bad_total_equations = 0.
- bad_tracking_expiry = 0.
- event_version_mismatches = 0.
- Expired buckets remain below the approved pruning threshold and return to zero after the scheduled prune window. No cadence means NO-GO.

### C. Cleanup proof

After approved exact cleanup, replace the display number as above:

    select
      count(*) as remaining_orders,
      coalesce(sum((
        select count(*)
        from public.order_items as item
        where item.order_id = orders.id
      )), 0) as remaining_items,
      coalesce(sum((
        select count(*)
        from public.order_status_events as event
        where event.order_id = orders.id
      )), 0) as remaining_events
    from public.orders as orders
    where orders.order_number = 'REPLACE_WITH_SYNTHETIC_ORDER_NUMBER';

Expected: all values = 0. Separately verify the exact synthetic admin_users/Auth UUID and exact run-owned rate keys are absent without enumerating unrelated users or rows.

## Blue Monitoring Plan

### First 30 minutes

- [ ] Keep the café board continuously attended and manual fallback ready.
- [ ] Check at +5, +15, and +30 minutes.
- [ ] Pause immediately on any create success without one complete admin-visible order and initial event.
- [ ] Pause on any unexpected OLH_CONFIGURATION_UNAVAILABLE, OLH_ORDER_IMMUTABLE, OLH_EVENT_WRITE_FORBIDDEN, repeated RECEIPT_UNCERTAIN, or public 5xx.
- [ ] Confirm Realtime can degrade to Polling and recover without duplicated/regressed orders.
- [ ] Confirm no raw tracking secret, customer PII, staff password, or privileged key appears in access/application logs.

### First 24 hours

| Signal | Alert/stop condition | Response |
|---|---|---|
| Public create 5xx | Any during canary; >1% for 5 minutes after launch | Pause ordering and inspect safe error codes |
| Accepted vs admin-visible orders | Any mismatch | Pause; reconcile database before customer communication |
| Initial event/item completeness | Any v1 row missing items or version-0 event | Pause; treat as integrity incident |
| Duplicate idempotency/tracking | Any duplicate group | Pause; preserve evidence |
| Configuration errors | Any after owner resume | Pause and verify raw config |
| Staff board freshness | Stale beyond the approved threshold or transitions remain disabled | Manual fallback; restore canonical polling |
| Transition conflicts | Unexpected sustained burst, e.g. >5 in 15 minutes | Check duplicate devices/workflow; do not bypass CAS |
| Expired rate buckets | Nonzero beyond one approved prune interval or monotonic daily growth | Run reviewed operational response; do not ad hoc delete |
| Database capacity | >70% of plan storage or relation growth >2x reviewed baseline | Pause growth source and review retention |
| Deadlocks | Any increase over pre-deploy baseline | Inspect lock graph and pause risky writes |
| Unauthorized probes | Burst of 401/403 or RLS denials | Review edge/auth logs and rotate if compromise suspected |

Read-only monitoring SQL:

    select
      status::text,
      count(*) as order_count,
      min(created_at) as oldest_created_at,
      max(created_at) as newest_created_at
    from public.orders
    where created_at >= statement_timestamp() - interval '24 hours'
    group by status
    order by status;

    select
      status::text,
      count(*) as active_count,
      max(statement_timestamp() - updated_at) as stalest_age
    from public.orders
    where status in ('new', 'preparing', 'ready')
    group by status
    order by status;

    select
      count(*) filter (
        where lifecycle_contract_version = 1
          and not exists (
            select 1 from public.order_items as item
            where item.order_id = orders.id
          )
      ) as missing_items,
      count(*) filter (
        where lifecycle_contract_version = 1
          and not exists (
            select 1 from public.order_status_events as event
            where event.order_id = orders.id
              and event.status_version = 0
          )
      ) as missing_initial_events
    from public.orders;

    select
      datname,
      deadlocks,
      temp_files,
      pg_size_pretty(temp_bytes) as temp_bytes,
      xact_commit,
      xact_rollback
    from pg_stat_database
    where datname = current_database();

    select
      relname,
      n_live_tup,
      n_dead_tup,
      pg_size_pretty(pg_total_relation_size(relid)) as total_size
    from pg_stat_user_tables
    where schemaname = 'public'
      and relname in (
        'orders', 'order_items', 'order_status_events', 'order_rate_buckets'
      )
    order by relname;

    select
      wait_event_type,
      wait_event,
      state,
      count(*) as sessions
    from pg_stat_activity
    where datname = current_database()
      and pid <> pg_backend_pid()
    group by wait_event_type, wait_event, state
    order by sessions desc;

## Rollback and Recovery

### Backup caveats

- A free-tier logical backup is not automatically equivalent to managed point-in-time recovery.
- Database backup does not include Storage objects themselves; export menu images separately.
- Auth users/settings, deployment configuration, extensions, Realtime publication state, sequences, and secret custody must be verified separately.
- Restoring a pre-deploy backup discards accepted orders newer than the recovery point. Record and obtain approval for the exact RPO/RTO and manual reconciliation.
- A backup is not valid evidence until it restores successfully to an isolated target and passes the lifecycle validation.

### Can the deployment roll back?

- **Before migration 005:** Application deployment can be abandoned normally; remove only exact synthetic preflight artifacts.
- **After 005 but before 006/007:** Migration 005 remains committed. Do not improvise a down migration. Keep ordering paused, restore allowlisted old admin access if needed through reviewed provisioning, and apply a reviewed forward fix.
- **After 005-007 but before any v1 order:** The schema is additive and the old service-credential create/direct legal status shapes were intentionally preserved, but reopening the old public writer reintroduces the known unsafe two-write path. Prefer restoring the reviewed RPC-capable app or a forward compatibility fix while ordering remains paused.
- **After any v1 order exists:** Do not redeploy the old customer application. It cannot preserve the hardened receipt/tracking/idempotency contract and may create mixed legacy rows. Recovery is forward with the RPC-capable app, or an owner-approved backup restore with explicit order-loss reconciliation.
- **After future U8:** Old application rollback is prohibited. Recovery is roll-forward only or restore under the separate U8 release plan.

### Stop-and-recover sequence

1. [ ] Pause ordering at the edge/new app and activate manual fallback.
2. [ ] Freeze staff mutations except incident-safe read/reconciliation.
3. [ ] Preserve aggregate evidence, exact source/migration SHA, target identity, timestamps, and safe error codes.
4. [ ] Determine whether the failure is application-only, configuration/data, partial migration history, credential, or database integrity.
5. [ ] Restore the same RPC-capable application for application-only failure.
6. [ ] For schema/data failure, create and review a forward migration; never edit applied migration history or drop guards ad hoc.
7. [ ] Use backup restore only with owner/restore approval and explicit post-backup order-loss handling.
8. [ ] Re-run target identity, schema, authorization, raw-state, synthetic lifecycle, privacy, monitoring, and exact cleanup checks before reopening.

## Final Go Record

Deployment is GO only when every checkbox below is signed:

- [ ] All blocking review findings resolved and re-reviewed.
- [ ] Immutable artifact and migration SHAs recorded.
- [ ] Local proof complete.
- [ ] Read-only hosted baseline reconciled.
- [ ] Backup and isolated restore proof complete.
- [ ] Sentinel bootstrap separately approved and verified.
- [ ] Corrected 005-007 expand migrations verified while ordering is paused.
- [ ] Exact synthetic staff allowlist verified; unlisted/anonymous denial verified.
- [ ] Old instances/menu writer drained.
- [ ] RPC-capable app deployed with current secrets and Turnstile staging policy.
- [ ] EN and FR hosted lifecycle canary passes.
- [ ] Public receipt/status privacy contract passes.
- [ ] Rate pruning and monitoring are operational.
- [ ] Exact synthetic cleanup passes.
- [ ] Café operations/manual fallback sign-off recorded.

Until all are complete, the correct status is:

**Local lifecycle proof may pass; hosted expand/cutover and production launch remain NO-GO and owner-gated.**
