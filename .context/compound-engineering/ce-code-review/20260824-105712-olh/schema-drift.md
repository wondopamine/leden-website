# Supabase Schema Drift Review

**Base:** `17e7623`  
**Verdict:** ✅ Generated public schema changes match committed migrations; no unrelated schema drift detected.

## Migration Scope

New migrations in the reviewed diff:

- `supabase/migrations/005_order_lifecycle_expand.sql`
- `supabase/migrations/006_atomic_order_creation_expand.sql`
- `supabase/migrations/007_order_state_transitions_expand.sql`

Base migrations `001_initial_schema.sql` through `004_menu_item_status.sql` are unchanged from `17e7623`. The branch also adds the local/staging sentinel bootstrap, deterministic seed, generated public database types, and a pinned type-drift check.

## Generated Type Cross-Reference

The public entities in `src/lib/supabase/database.types.ts` all have a committed schema source:

| Generated schema/type change | Committed source |
| --- | --- |
| Base tables `categories`, `menu_items`, `modifiers`, `modifier_options`, `orders`, `order_items`, `cafe_info` and enum `order_status` | Migrations `001` and `004` |
| Table `admin_users`; RPCs `get_lifecycle_environment_sentinel` and `is_admin` | Migration `005` |
| `modifiers.min_selections/max_selections`; `modifier_options.available`; lifecycle columns on `cafe_info`, `orders`, and `order_items` | Migration `006` |
| Tables `order_status_events` and `order_rate_buckets` | Migration `006` |
| RPCs `create_order_v1`, `get_order_status_v1`, `recover_order_v1`, `consume_order_rate_limit_v1`, `prune_order_rate_buckets_v1`, `save_menu_item_graph_v1`, and `create_menu_item_graph_v1` | Migration `006` |
| RPCs `cleanup_lifecycle_test_order_v1` and `transition_order_status_v1` | Migration `007` |

No generated public table, column, enum, relationship, or RPC was found without a corresponding base or branch migration. Private helper functions and `private.lifecycle_environment_sentinel` are intentionally absent because type generation is restricted to the `public` schema.

## Bootstrap and Seed Consistency

- `supabase/bootstrap/environment-sentinel.sql` creates the same private sentinel shape and public getter later adopted and validated by migration `005`; it does not introduce an unrelated public contract.
- The bootstrap SHA-256 is `85fd583a19be476b1130ab505bd2829f0324c1f621d46b38b14fd1ec6a3fcdb3`, matching `environment-sentinel.sha256`, the seed constant, and lifecycle verification scripts.
- `supabase/seed.sql` contains data mutations only. It adds no table, column, index, function, enum, policy, trigger, extension, or schema outside the migrations.
- Seeded lifecycle fields (`min_selections`, `max_selections`, ordering/tax/timezone fields) are introduced by migration `006` before seed execution.

## Drift Controls and Verification Limit

- The project pins Supabase CLI `2.115.0` and adds `check:database-types`, which generates the `public` schema types from the local database and compares them byte-for-byte with the committed file.
- Per the review constraint, this pass did not reset the database or regenerate types. The structural cross-reference is clean; an exact live regeneration remains the final mechanical proof and should be run only through the existing safe local lifecycle harness.

## Result

- Migration sequence is contiguous and scoped: `005` → `006` → `007`.
- Existing applied migrations are not rewritten.
- Generated public types contain no unrelated schema additions.
- Bootstrap and seed artifacts align with the migration-owned schema.

No schema-drift remediation is required.
