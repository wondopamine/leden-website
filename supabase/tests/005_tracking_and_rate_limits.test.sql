begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select plan(42);

select has_table('public', 'order_rate_buckets', 'durable rate buckets exist');
select has_function('public', 'get_order_status_v1', array['bytea'], 'the token-scoped status projection exists');
select has_function('public', 'recover_order_v1', array['uuid', 'bytea'], 'the lost-response recovery projection exists');
select has_function(
  'public',
  'consume_order_rate_limit_v1',
  array['text', 'bytea', 'integer', 'integer'],
  'the server-only durable rate routine exists'
);
select has_function(
  'private',
  'consume_order_rate_limit_v1_at',
  array['text', 'bytea', 'integer', 'integer', 'timestamp with time zone'],
  'rate windows have a private injectable test clock'
);
select has_function(
  'private',
  'recover_order_v1_at',
  array['uuid', 'bytea', 'timestamp with time zone'],
  'recovery expiry has a private injectable test clock'
);
select has_function(
  'public',
  'cleanup_lifecycle_test_order_v1',
  array['uuid'],
  'exact lifecycle-test cleanup has a protected database boundary'
);
select hasnt_function(
  'public',
  'get_order_status_v1',
  array['text'],
  'the display order number alone is never a tracking credential'
);

select ok(
  has_function_privilege('service_role', 'public.get_order_status_v1(bytea)', 'EXECUTE')
    and has_function_privilege('service_role', 'public.recover_order_v1(uuid,bytea)', 'EXECUTE')
    and has_function_privilege('service_role', 'public.consume_order_rate_limit_v1(text,bytea,integer,integer)', 'EXECUTE'),
  'only the server role has the customer projection and rate capabilities'
);
select ok(
  not has_function_privilege('anon', 'public.get_order_status_v1(bytea)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.get_order_status_v1(bytea)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.recover_order_v1(uuid,bytea)', 'EXECUTE'),
  'browser roles cannot execute customer projection routines directly'
);
select ok(
  not has_function_privilege('authenticated', 'private.consume_order_rate_limit_v1_at(text,bytea,integer,integer,timestamp with time zone)', 'EXECUTE')
    and not has_function_privilege('anon', 'private.consume_order_rate_limit_v1_at(text,bytea,integer,integer,timestamp with time zone)', 'EXECUTE'),
  'the injected rate clock is unavailable to browser roles and outside the exposed schema'
);
select is(
  (
    select count(*)
    from pg_proc as routine
    join pg_namespace as namespace on namespace.oid = routine.pronamespace
    where namespace.nspname = 'public'
      and routine.proname in ('get_order_status_v1', 'recover_order_v1', 'consume_order_rate_limit_v1')
      and routine.proconfig = array['search_path=""']::text[]
  ),
  3::bigint,
  'every public tracking/rate routine pins an empty search path'
);
select ok(
  not has_table_privilege('anon', 'public.order_rate_buckets', 'SELECT, INSERT, UPDATE, DELETE')
    and not has_table_privilege('authenticated', 'public.order_rate_buckets', 'SELECT, INSERT, UPDATE, DELETE'),
  'rate bucket rows are not browser-visible'
);
select ok(
  has_function_privilege('service_role', 'public.cleanup_lifecycle_test_order_v1(uuid)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.cleanup_lifecycle_test_order_v1(uuid)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.cleanup_lifecycle_test_order_v1(uuid)', 'EXECUTE'),
  'only the server cleanup harness can invoke exact lifecycle-test removal'
);
select hasnt_column('public', 'order_rate_buckets', 'network_address', 'rate buckets never retain a raw network address');
select hasnt_column('public', 'order_status_events', 'customer_name', 'status events contain no customer name');
select hasnt_column('public', 'order_status_events', 'customer_phone', 'status events contain no customer phone');

create temporary table tracking_fixture (receipt jsonb not null) on commit drop;
create temporary table tracking_order_ids (order_id uuid not null) on commit drop;
grant select on table tracking_order_ids to service_role;
insert into tracking_fixture
select private.create_order_v1_at(
  'f8000000-0000-4000-8000-000000000001', decode(repeat('91', 32), 'hex'),
  'Tracking PII Must Stay Private', '(514) 555-0121', 'fr', 'Private note', 'scheduled',
  '2026-08-24 09:00:00'::timestamp,
  '[{"menu_item_id":"d2000000-0000-4000-8000-000000000001","quantity":1,"option_ids":["d4000000-0000-4000-8000-000000000001"]}]'::jsonb,
  '2026-08-24 12:00:00+00'::timestamptz
);
insert into tracking_order_ids
select id from public.orders
where idempotency_key = 'f8000000-0000-4000-8000-000000000001';

select ok(
  public.get_order_status_v1(decode(repeat('91', 32), 'hex')) ?&
    array['order_number', 'status', 'status_version', 'promised_pickup_at', 'updated_at', 'cafe'],
  'a valid digest returns the minimal status shape'
);
select ok(
  not (public.get_order_status_v1(decode(repeat('91', 32), 'hex')) ?|
    array['id', 'order_id', 'customer_name', 'customer_phone', 'notes', 'actor_user_id', 'tracking_token_hash', 'idempotency_key']),
  'status contains no PII, staff identity, secrets, or internal identifiers'
);
select ok(
  public.recover_order_v1('f8000000-0000-4000-8000-000000000001', decode(repeat('91', 32), 'hex')) ?&
    array['receipt_id', 'order_number', 'status', 'promised_pickup_at', 'subtotal', 'tax_gst', 'tax_qst', 'total', 'items'],
  'matching identity and digest recover the PII-free authoritative receipt'
);
select ok(
  not (public.recover_order_v1('f8000000-0000-4000-8000-000000000001', decode(repeat('91', 32), 'hex'))::text ~
    '(Tracking PII Must Stay Private|514.555.0121|Private note|d2000000-0000-4000-8000-000000000001)'),
  'the recovery serialization contains neither customer PII nor internal item identities'
);
select is(public.get_order_status_v1(decode(repeat('92', 32), 'hex')), null::jsonb, 'an invalid digest returns the same absence shape');
select is(public.recover_order_v1('f8000000-0000-4000-8000-000000000001', decode(repeat('92', 32), 'hex')), null::jsonb, 'recovery requires both exact identity and digest');

update public.orders
set tracking_revoked_at = '2026-08-24 12:30:00+00'
where idempotency_key = 'f8000000-0000-4000-8000-000000000001';
select is(public.get_order_status_v1(decode(repeat('91', 32), 'hex')), null::jsonb, 'a revoked digest is indistinguishable from an invalid digest');
select is(
  public.recover_order_v1(
    'f8000000-0000-4000-8000-000000000001',
    decode(repeat('91', 32), 'hex')
  ),
  null::jsonb,
  'revoked receipt recovery is indistinguishable from an invalid identity'
);
update public.orders
set tracking_revoked_at = null,
    tracking_expires_at = promised_pickup_at + interval '72 hours'
where idempotency_key = 'f8000000-0000-4000-8000-000000000001';
select is(private.get_order_status_v1_at(decode(repeat('91', 32), 'hex'), '2026-08-27 13:00:00+00'), null::jsonb, 'tracking expires at the exact 72-hour boundary');
select is(
  private.recover_order_v1_at(
    'f8000000-0000-4000-8000-000000000001',
    decode(repeat('91', 32), 'hex'),
    '2026-08-27 13:00:00+00'
  ),
  null::jsonb,
  'receipt recovery expires at the same exact boundary as status tracking'
);

select is(
  private.consume_order_rate_limit_v1_at('create', decode(repeat('a1', 32), 'hex'), 2, 60, '2026-08-24 12:00:00+00') ->> 'allowed',
  'true',
  'the first keyed request is allowed'
);
select is(
  private.consume_order_rate_limit_v1_at('create', decode(repeat('a1', 32), 'hex'), 2, 60, '2026-08-24 12:00:01+00') ->> 'count',
  '2',
  'the same keyed window increments atomically'
);
select is(
  private.consume_order_rate_limit_v1_at('create', decode(repeat('a1', 32), 'hex'), 2, 60, '2026-08-24 12:00:02+00') ->> 'allowed',
  'false',
  'requests beyond the bound are rejected without losing the retry window'
);
select is(
  private.consume_order_rate_limit_v1_at('status', decode(repeat('a1', 32), 'hex'), 2, 60, '2026-08-24 12:00:02+00') ->> 'count',
  '1',
  'status and create limits use separate durable buckets'
);
select is(
  private.consume_order_rate_limit_v1_at('create', decode(repeat('a2', 32), 'hex'), 2, 60, '2026-08-24 12:00:02+00') ->> 'count',
  '1',
  'different HMAC digests use separate buckets'
);
select is(
  private.consume_order_rate_limit_v1_at('create', decode(repeat('a1', 32), 'hex'), 2, 60, '2026-08-24 12:01:00+00') ->> 'count',
  '1',
  'the exact next-window boundary resets deterministically'
);
select is(
  (select max(octet_length(key_hash)) from public.order_rate_buckets),
  32,
  'only fixed-length HMAC digests are retained'
);
select throws_ok(
  $$ select private.consume_order_rate_limit_v1_at('create', convert_to('203.0.113.8', 'UTF8'), 2, 60, '2026-08-24 12:00:00+00') $$,
  'P0001', 'OLH_RATE_INPUT_INVALID',
  'raw network identifiers cannot be stored as rate keys'
);
select throws_ok(
  $$ select private.consume_order_rate_limit_v1_at('unknown', decode(repeat('b0', 32), 'hex'), 2, 60, statement_timestamp()) $$,
  'P0001', 'OLH_RATE_INPUT_INVALID',
  'unknown purposes cannot create ungoverned rate buckets'
);
select throws_ok(
  $$ select private.consume_order_rate_limit_v1_at(null, null, null, null, null) $$,
  'P0001', 'OLH_RATE_INPUT_INVALID',
  'null rate inputs fail closed instead of relying on SQL three-valued logic'
);

do $$
begin
  perform private.consume_order_rate_limit_v1_at(
    'recovery', decode(repeat('b1', 32), 'hex'), 2, 60,
    statement_timestamp() - interval '10 minutes'
  );
  perform private.consume_order_rate_limit_v1_at(
    'recovery', decode(repeat('b2', 32), 'hex'), 2, 60,
    statement_timestamp()
  );
end;
$$;
select lives_ok(
  $$ select public.prune_order_rate_buckets_v1() $$,
  'expired durable rate buckets are prunable independently of order retention'
);
select results_eq(
  $$
    select encode(key_hash, 'hex'), count(*)
    from public.order_rate_buckets
    where key_hash in (decode(repeat('b1', 32), 'hex'), decode(repeat('b2', 32), 'hex'))
    group by key_hash
  $$,
  $$ values (repeat('b2', 32), 1::bigint) $$,
  'pruning removes the expired bucket and preserves the active window'
);

set local role service_role;
select throws_ok(
  $$ delete from public.orders where id = (select order_id from tracking_order_ids) $$,
  'P0001', 'OLH_RETENTION_ACTIVE',
  'direct application deletion cannot remove recoverable idempotency protection'
);
select is(
  public.cleanup_lifecycle_test_order_v1((select order_id from tracking_order_ids)),
  (select order_id from tracking_order_ids),
  'protected test cleanup revokes recovery before deleting one exact order'
);
reset role;
select results_eq(
  $$
    select
      (select count(*) from public.orders where id = fixture.order_id),
      (select count(*) from public.order_items where order_id = fixture.order_id),
      (select count(*) from public.order_status_events where order_id = fixture.order_id)
    from tracking_order_ids as fixture
  $$,
  $$ values (0::bigint, 0::bigint, 0::bigint) $$,
  'exact cleanup removes the revoked test parent and verifies both immutable cascades'
);

select * from finish();
rollback;
