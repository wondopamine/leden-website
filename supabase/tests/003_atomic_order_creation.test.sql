begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select plan(83);

select has_column('public', 'orders', 'lifecycle_contract_version', 'orders identify the lifecycle contract version');
select has_column('public', 'orders', 'idempotency_key', 'orders retain the idempotency identity');
select has_column('public', 'orders', 'fingerprint_version', 'orders snapshot the fingerprint version');
select has_column('public', 'orders', 'tracking_token_hash', 'orders retain only a tracking digest');
select has_column('public', 'orders', 'tracking_expires_at', 'orders bound tracking retention');
select has_column('public', 'orders', 'promised_pickup_at', 'orders snapshot the authoritative pickup promise');
select has_column('public', 'orders', 'status_version', 'orders carry an optimistic status version');
select has_column('public', 'orders', 'gst_rate', 'orders snapshot the applied GST rate');
select has_column('public', 'orders', 'qst_rate', 'orders snapshot the applied QST rate');
select has_column('public', 'modifiers', 'min_selections', 'modifier groups define a minimum cardinality');
select has_column('public', 'modifiers', 'max_selections', 'modifier groups define a maximum cardinality');
select has_column('public', 'modifier_options', 'available', 'modifier options have authoritative availability');
select has_column('public', 'cafe_info', 'ordering_enabled', 'café configuration can pause new acceptance');
select has_column('public', 'cafe_info', 'timezone', 'café configuration pins its authoritative timezone');
select has_column('public', 'order_items', 'line_total', 'line snapshots retain authoritative totals');
select has_table('public', 'order_status_events', 'the lifecycle event ledger exists');

select has_function(
  'public',
  'create_order_v1',
  array['uuid', 'bytea', 'text', 'text', 'text', 'text', 'text', 'timestamp without time zone', 'jsonb'],
  'the service order-creation wrapper exists'
);
select has_function(
  'private',
  'create_order_v1_at',
  array['uuid', 'bytea', 'text', 'text', 'text', 'text', 'text', 'timestamp without time zone', 'jsonb', 'timestamp with time zone'],
  'a private fixed-clock creation helper exists for deterministic proof'
);
select has_function(
  'public',
  'save_menu_item_graph_v1',
  array['uuid', 'jsonb', 'jsonb'],
  'transactional menu and modifier replacement has one RPC'
);
select has_function(
  'public',
  'create_menu_item_graph_v1',
  array['uuid', 'jsonb', 'jsonb'],
  'transactional menu creation has one RPC'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_menu_item_graph_v1(uuid,jsonb,jsonb)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.create_menu_item_graph_v1(uuid,jsonb,jsonb)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'service_role',
    'public.create_menu_item_graph_v1(uuid,jsonb,jsonb)',
    'EXECUTE'
  ),
  'only authenticated staff may invoke transactional menu creation'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.create_order_v1(uuid,bytea,text,text,text,text,text,timestamp without time zone,jsonb)',
    'EXECUTE'
  ),
  'only the server role may execute atomic creation'
);
select ok(
  has_table_privilege('service_role', 'public.cafe_info', 'SELECT')
  and has_table_privilege('service_role', 'public.menu_items', 'SELECT')
  and has_table_privilege('service_role', 'public.modifiers', 'SELECT')
  and has_table_privilege('service_role', 'public.modifier_options', 'SELECT'),
  'the invoker-role wrapper can read every authoritative pricing and pickup source'
);
select ok(
  not has_table_privilege('service_role', 'public.cafe_info', 'UPDATE')
  and not has_table_privilege('service_role', 'public.menu_items', 'UPDATE')
  and not has_table_privilege('service_role', 'public.modifiers', 'UPDATE')
  and not has_table_privilege('service_role', 'public.modifier_options', 'UPDATE'),
  'row-lock support does not grant the application server a direct café or menu mutation surface'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_order_v1(uuid,bytea,text,text,text,text,text,timestamp without time zone,jsonb)',
    'EXECUTE'
  ) and not has_function_privilege(
    'authenticated',
    'public.create_order_v1(uuid,bytea,text,text,text,text,text,timestamp without time zone,jsonb)',
    'EXECUTE'
  ),
  'browser roles cannot execute atomic creation'
);
select is(
  (
    select routine.proconfig
    from pg_proc as routine
    join pg_namespace as namespace on namespace.oid = routine.pronamespace
    where namespace.nspname = 'public'
      and routine.proname = 'create_order_v1'
  ),
  array['search_path=""']::text[],
  'atomic creation pins an empty search path'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.create_order_v1_at(uuid,bytea,text,text,text,text,text,timestamp without time zone,jsonb,timestamp with time zone)',
    'EXECUTE'
  ) and not has_function_privilege(
    'anon',
    'private.create_order_v1_at(uuid,bytea,text,text,text,text,text,timestamp without time zone,jsonb,timestamp with time zone)',
    'EXECUTE'
  ),
  'the injected-clock helper is unavailable to browser roles and is outside the exposed schema'
);

select throws_ok(
  $$
    select private.create_order_v1_at(
      'f1000000-0000-4000-8000-000000000011', null::bytea,
      'Null Secret', '(514) 555-0101', 'en', null, 'asap', null,
      '[{"menu_item_id":"d2000000-0000-4000-8000-000000000001","quantity":1,"option_ids":["d4000000-0000-4000-8000-000000000001"]}]'::jsonb,
      '2026-08-24 12:00:00+00'::timestamptz
    )
  $$,
  'P0001', 'OLH_INVALID_INPUT',
  'a null tracking digest fails closed before any lifecycle row can exist'
);
select throws_ok(
  $$
    select private.create_order_v1_at(
      'f1000000-0000-4000-8000-000000000012', decode(repeat('12', 32), 'hex'),
      'Null Cart', '(514) 555-0101', 'en', null, 'asap', null, null::jsonb,
      '2026-08-24 12:00:00+00'::timestamptz
    )
  $$,
  'P0001', 'OLH_INVALID_INPUT',
  'a null cart cannot exploit SQL three-valued logic to create an empty order'
);
select throws_ok(
  $$
    select private.create_order_v1_at(
      'f1000000-0000-4000-8000-000000000013', decode(repeat('13', 32), 'hex'),
      'Null Locale', '(514) 555-0101', null::text, null, 'asap', null,
      '[{"menu_item_id":"d2000000-0000-4000-8000-000000000001","quantity":1,"option_ids":["d4000000-0000-4000-8000-000000000001"]}]'::jsonb,
      '2026-08-24 12:00:00+00'::timestamptz
    )
  $$,
  'P0001', 'OLH_INVALID_INPUT',
  'a null locale cannot create an ambiguous snapshot'
);
select throws_ok(
  $$ update public.modifier_options set price_adjustment = null where id = 'd4000000-0000-4000-8000-000000000001' $$,
  '23502', null,
  'authoritative modifier adjustments cannot be null'
);
select throws_ok(
  $$ update public.modifier_options set price_adjustment = -0.01 where id = 'd4000000-0000-4000-8000-000000000001' $$,
  '23514', null,
  'authoritative modifier adjustments cannot be negative'
);
select throws_ok(
  $$ update public.cafe_info set pickup_lead_time = null $$,
  '23514', null,
  'nullable legacy café bounds cannot evade the authoritative configuration constraint'
);
select throws_ok(
  $$
    insert into public.orders (
      order_number, customer_name, customer_phone, subtotal, tax_gst, tax_qst, total,
      lifecycle_contract_version
    ) values ('FORGED-FRESH-V1', 'Forged', '(514) 555-0197', 1, 0.05, 0.10, 1.15, 1)
  $$,
  'P0001', 'OLH_ATOMIC_CREATE_REQUIRED',
  'a fresh database session cannot exploit an unset internal guard setting'
);

create temporary table original_cafe_runtime as
select hours, pickup_lead_time from public.cafe_info;
update public.cafe_info
set hours = '[
  {"day":"Monday","open":"00:00","close":"24:00","closed":false},
  {"day":"Tuesday","open":"00:00","close":"24:00","closed":false},
  {"day":"Wednesday","open":"00:00","close":"24:00","closed":false},
  {"day":"Thursday","open":"00:00","close":"24:00","closed":false},
  {"day":"Friday","open":"00:00","close":"24:00","closed":false},
  {"day":"Saturday","open":"00:00","close":"24:00","closed":false},
  {"day":"Sunday","open":"00:00","close":"24:00","closed":false}
]'::jsonb,
pickup_lead_time = 0;
set local role service_role;
select lives_ok(
  $$
    select public.create_order_v1(
      'f1000000-0000-4000-8000-000000000014', decode(repeat('14', 32), 'hex'),
      'Invoker Contract', '(514) 555-0114', 'en', null, 'asap', null,
      '[{"menu_item_id":"d2000000-0000-4000-8000-000000000001","quantity":1,"option_ids":["d4000000-0000-4000-8000-000000000001"]}]'::jsonb
    )
  $$,
  'the real service-role wrapper reaches authoritative configuration and menu rows'
);
reset role;
update public.cafe_info as config
set hours = original.hours,
    pickup_lead_time = original.pickup_lead_time
from original_cafe_runtime as original;

create temporary table atomic_receipts (receipt jsonb not null) on commit drop;

insert into atomic_receipts (receipt)
select private.create_order_v1_at(
  'f1000000-0000-4000-8000-000000000001',
  decode(repeat('11', 32), 'hex'),
  'Synthetic Customer',
  '(514) 555-0101',
  'en',
  'No disposable items',
  'asap',
  null,
  '[{"menu_item_id":"d2000000-0000-4000-8000-000000000001","quantity":1,"option_ids":["d4000000-0000-4000-8000-000000000001"]}]'::jsonb,
  '2026-08-24 12:00:00+00'::timestamptz
);

select is(
  (select count(*) from public.orders where idempotency_key = 'f1000000-0000-4000-8000-000000000001'),
  1::bigint,
  'one valid attempt creates exactly one order header'
);
select is(
  (
    select count(*)
    from public.order_items as item
    join public.orders as order_header on order_header.id = item.order_id
    where order_header.idempotency_key = 'f1000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'the valid attempt creates its complete line set'
);
select is(
  (
    select count(*)
    from public.order_status_events as event
    join public.orders as order_header on order_header.id = event.order_id
    where order_header.idempotency_key = 'f1000000-0000-4000-8000-000000000001'
      and event.to_status = 'new'
      and event.status_version = 0
  ),
  1::bigint,
  'the atomic commit includes exactly one initial event'
);
select results_eq(
  $$
    select subtotal, tax_gst, tax_qst, total, gst_rate, qst_rate
    from public.orders
    where idempotency_key = 'f1000000-0000-4000-8000-000000000001'
  $$,
  $$ values (5.00::numeric, 0.25::numeric, 0.50::numeric, 5.75::numeric, 0.05::numeric, 0.09975::numeric) $$,
  'the database snapshots authoritative prices, order-level rounded taxes, and rates'
);
select results_eq(
  $$
    select price, modifier_total, unit_price, line_total, menu_item_name
    from public.order_items as item
    join public.orders as order_header on order_header.id = item.order_id
    where order_header.idempotency_key = 'f1000000-0000-4000-8000-000000000001'
  $$,
  $$ values (5.00::numeric, 0.00::numeric, 5.00::numeric, 5.00::numeric, 'Lifecycle test latte'::text) $$,
  'line snapshots ignore browser display and price authority'
);
select ok(
  not ((select receipt from atomic_receipts) ?| array['id', 'order_id', 'customer_name', 'customer_phone', 'tracking_token_hash', 'idempotency_key']),
  'the create receipt exposes no PII, bearer digest, idempotency identity, or internal order UUID'
);
select is(
  (
    select promised_pickup_at
    from public.orders
    where idempotency_key = 'f1000000-0000-4000-8000-000000000001'
  ),
  '2026-08-24 12:15:00+00'::timestamptz,
  'ASAP uses the Montréal-local lead time and stores a concrete promise'
);

select is(
  private.create_order_v1_at(
    'f1000000-0000-4000-8000-000000000001',
    decode(repeat('11', 32), 'hex'),
    'Synthetic Customer',
    '(514) 555-0101',
    'en',
    'No disposable items',
    'asap',
    null,
    '[{"quantity":1,"option_ids":["d4000000-0000-4000-8000-000000000001"],"menu_item_id":"d2000000-0000-4000-8000-000000000001"}]'::jsonb,
    '2026-08-24 12:01:00+00'::timestamptz
  ) ->> 'receipt_id',
  (select receipt ->> 'receipt_id' from atomic_receipts),
  'an identical normalized retry returns the original receipt'
);
select is(
  (select count(*) from public.orders where idempotency_key = 'f1000000-0000-4000-8000-000000000001'),
  1::bigint,
  'an identical retry does not duplicate the order'
);
select throws_ok(
  $$
    select private.create_order_v1_at(
      'f1000000-0000-4000-8000-000000000001', decode(repeat('11', 32), 'hex'),
      'Synthetic Customer', '(514) 555-0101', 'en', 'No disposable items', 'scheduled',
      '2026-08-24 09:00:00'::timestamp,
      '[{"menu_item_id":"d2000000-0000-4000-8000-000000000001","quantity":1,"option_ids":["d4000000-0000-4000-8000-000000000001"]}]'::jsonb,
      '2026-08-24 12:01:00+00'::timestamptz
    )
  $$,
  'P0001', 'OLH_IDEMPOTENCY_CONFLICT',
  'changing pickup semantics under one identity conflicts'
);
select throws_ok(
  $$
    select private.create_order_v1_at(
      'f1000000-0000-4000-8000-000000000001', decode(repeat('11', 32), 'hex'),
      'Synthetic Customer', '(514) 555-0101', 'en', 'No disposable items', 'asap', null,
      '[{"menu_item_id":"d2000000-0000-4000-8000-000000000001","quantity":2,"option_ids":["d4000000-0000-4000-8000-000000000001"]}]'::jsonb,
      '2026-08-24 12:01:00+00'::timestamptz
    )
  $$,
  'P0001', 'OLH_IDEMPOTENCY_CONFLICT',
  'changing cart semantics under one identity conflicts'
);
select throws_ok(
  $$
    select private.create_order_v1_at(
      'f1000000-0000-4000-8000-000000000001', decode(repeat('11', 32), 'hex'),
      'Changed Customer', '(514) 555-0101', 'en', 'No disposable items', 'asap', null,
      '[{"menu_item_id":"d2000000-0000-4000-8000-000000000001","quantity":1,"option_ids":["d4000000-0000-4000-8000-000000000001"]}]'::jsonb,
      '2026-08-24 12:01:00+00'::timestamptz
    )
  $$,
  'P0001', 'OLH_IDEMPOTENCY_CONFLICT',
  'changing contact data under one identity conflicts'
);
select throws_ok(
  $$
    select private.create_order_v1_at(
      'f1000000-0000-4000-8000-000000000001', decode(repeat('12', 32), 'hex'),
      'Synthetic Customer', '(514) 555-0101', 'en', 'No disposable items', 'asap', null,
      '[{"menu_item_id":"d2000000-0000-4000-8000-000000000001","quantity":1,"option_ids":["d4000000-0000-4000-8000-000000000001"]}]'::jsonb,
      '2026-08-24 12:01:00+00'::timestamptz
    )
  $$,
  'P0001', 'OLH_IDEMPOTENCY_CONFLICT',
  'changing the tracking digest under one identity conflicts'
);

select throws_ok(
  $$
    select private.create_order_v1_at(
      'f1000000-0000-4000-8000-000000000002', decode(repeat('22', 32), 'hex'),
      'Synthetic Customer', '(514) 555-0102', 'en', null, 'asap', null,
      '[{"menu_item_id":"d2000000-0000-4000-8000-000000000001","quantity":1,"option_ids":[]}]'::jsonb,
      '2026-08-24 12:00:00+00'::timestamptz
    )
  $$,
  'P0001', 'OLH_MODIFIER_INVALID',
  'missing a required modifier selection rejects atomically'
);
select throws_ok(
  $$
    select private.create_order_v1_at(
      'f1000000-0000-4000-8000-000000000003', decode(repeat('33', 32), 'hex'),
      'Synthetic Customer', '(514) 555-0103', 'en', null, 'asap', null,
      '[{"menu_item_id":"d2000000-0000-4000-8000-000000000001","quantity":1,"option_ids":["d4000000-0000-4000-8000-000000000001","d4000000-0000-4000-8000-000000000002"]}]'::jsonb,
      '2026-08-24 12:00:00+00'::timestamptz
    )
  $$,
  'P0001', 'OLH_MODIFIER_INVALID',
  'two options from one single-select group reject'
);
select throws_ok(
  $$
    select private.create_order_v1_at(
      'f1000000-0000-4000-8000-000000000004', decode(repeat('44', 32), 'hex'),
      'Synthetic Customer', '(514) 555-0104', 'en', null, 'asap', null,
      '[{"menu_item_id":"d2000000-0000-4000-8000-000000000001","quantity":1,"option_ids":["d4000000-0000-4000-8000-000000000001","d4000000-0000-4000-8000-000000000001"]}]'::jsonb,
      '2026-08-24 12:00:00+00'::timestamptz
    )
  $$,
  'P0001', 'OLH_MODIFIER_INVALID',
  'duplicate option identities reject'
);
select throws_ok(
  $$
    select private.create_order_v1_at(
      'f1000000-0000-4000-8000-000000000005', decode(repeat('55', 32), 'hex'),
      'Synthetic Customer', '(514) 555-0105', 'en', null, 'asap', null,
      '[{"menu_item_id":"d2000000-0000-4000-8000-000000000001","quantity":1,"option_ids":["d4000000-0000-4000-8000-000000000004"]}]'::jsonb,
      '2026-08-24 12:00:00+00'::timestamptz
    )
  $$,
  'P0001', 'OLH_MODIFIER_INVALID',
  'an option owned by a different menu item rejects'
);
select throws_ok(
  $$
    select private.create_order_v1_at(
      'f1000000-0000-4000-8000-000000000006', decode(repeat('66', 32), 'hex'),
      'Synthetic Customer', '(514) 555-0106', 'en', null, 'asap', null,
      '[{"menu_item_id":"d2000000-0000-4000-8000-000000000001","quantity":1,"option_ids":["d4000000-0000-4000-8000-000000000001"],"name":"Forged","price":0.01}]'::jsonb,
      '2026-08-24 12:00:00+00'::timestamptz
    )
  $$,
  'P0001', 'OLH_INVALID_INPUT',
  'forged display and price fields are outside the accepted line contract'
);

update public.menu_items
set status = 'sold_out', available = true
where id = 'd2000000-0000-4000-8000-000000000001';
select throws_ok(
  $$
    select private.create_order_v1_at(
      'f1000000-0000-4000-8000-000000000007', decode(repeat('77', 32), 'hex'),
      'Synthetic Customer', '(514) 555-0107', 'en', null, 'asap', null,
      '[{"menu_item_id":"d2000000-0000-4000-8000-000000000001","quantity":1,"option_ids":["d4000000-0000-4000-8000-000000000001"]}]'::jsonb,
      '2026-08-24 12:00:00+00'::timestamptz
    )
  $$,
  'P0001', 'OLH_MENU_CHANGED',
  'sold-out menu rows reject atomically even though the legacy available flag remains true'
);
update public.menu_items
set status = 'available', available = true
where id = 'd2000000-0000-4000-8000-000000000001';

update public.modifier_options
set available = false
where id = 'd4000000-0000-4000-8000-000000000003';
select throws_ok(
  $$
    select private.create_order_v1_at(
      'f1000000-0000-4000-8000-000000000008', decode(repeat('78', 32), 'hex'),
      'Synthetic Customer', '(514) 555-0108', 'en', null, 'asap', null,
      '[{"menu_item_id":"d2000000-0000-4000-8000-000000000001","quantity":1,"option_ids":["d4000000-0000-4000-8000-000000000001","d4000000-0000-4000-8000-000000000003"]}]'::jsonb,
      '2026-08-24 12:00:00+00'::timestamptz
    )
  $$,
  'P0001', 'OLH_MODIFIER_INVALID',
  'an unavailable optional choice rejects atomically'
);
update public.modifier_options
set available = true
where id = 'd4000000-0000-4000-8000-000000000003';

select lives_ok(
  $$
    select private.create_order_v1_at(
      'f1000000-0000-4000-8000-000000000009', decode(repeat('79', 32), 'hex'),
      'Optional Customer', '(514) 555-0109', 'en', null, 'asap', null,
      '[{"menu_item_id":"d2000000-0000-4000-8000-000000000001","quantity":1,"option_ids":["d4000000-0000-4000-8000-000000000001","d4000000-0000-4000-8000-000000000003"]}]'::jsonb,
      '2026-08-24 12:00:00+00'::timestamptz
    )
  $$,
  'an optional group accepts one configured selection'
);
select results_eq(
  $$
    select subtotal, tax_gst, tax_qst, total
    from public.orders where idempotency_key = 'f1000000-0000-4000-8000-000000000009'
  $$,
  $$ values (5.50::numeric, 0.28::numeric, 0.55::numeric, 6.33::numeric) $$,
  'optional paid selections are priced and rounded authoritatively at order level'
);
select lives_ok(
  $$
    select private.create_order_v1_at(
      'f1000000-0000-4000-8000-000000000010', decode(repeat('7a', 32), 'hex'),
      'Fractional Customer', '(514) 555-0110', 'en', null, 'asap', null,
      '[{"menu_item_id":"d2000000-0000-4000-8000-000000000002","quantity":1,"option_ids":["d4000000-0000-4000-8000-000000000004"]}]'::jsonb,
      '2026-08-24 12:00:00+00'::timestamptz
    )
  $$,
  'fractional-cent tax inputs commit with the documented rounding rule'
);
select results_eq(
  $$
    select subtotal, tax_gst, tax_qst, total
    from public.orders where idempotency_key = 'f1000000-0000-4000-8000-000000000010'
  $$,
  $$ values (0.10::numeric, 0.01::numeric, 0.01::numeric, 0.12::numeric) $$,
  'each order-level tax is rounded to cents before the exact total equation'
);

select is(
  (select count(*) from public.orders where idempotency_key between 'f1000000-0000-4000-8000-000000000002' and 'f1000000-0000-4000-8000-000000000007'),
  0::bigint,
  'all rejected attempts leave no order header'
);
select is(
  (
    select count(*)
    from public.order_items as item
    join public.orders as order_header on order_header.id = item.order_id
    where order_header.idempotency_key between 'f1000000-0000-4000-8000-000000000002' and 'f1000000-0000-4000-8000-000000000008'
  ),
  0::bigint,
  'rejected line validation leaves no partial line snapshots'
);
select is(
  (
    select count(*)
    from public.order_status_events as event
    join public.orders as order_header on order_header.id = event.order_id
    where order_header.idempotency_key between 'f1000000-0000-4000-8000-000000000002' and 'f1000000-0000-4000-8000-000000000008'
  ),
  0::bigint,
  'rejected line validation leaves no visible lifecycle event'
);

select is(
  private.resolve_order_pickup_v1('scheduled', '2026-08-24 08:15:00'::timestamp, '2026-08-24 12:00:00+00'::timestamptz),
  '2026-08-24 12:15:00+00'::timestamptz,
  'the first lead-time-valid scheduled slot is accepted'
);
select is(
  private.resolve_order_pickup_v1('scheduled', '2026-08-24 14:59:00'::timestamp, '2026-08-24 12:00:00+00'::timestamptz),
  '2026-08-24 18:59:00+00'::timestamptz,
  'the last minute before closing is accepted'
);
select throws_ok(
  $$ select private.resolve_order_pickup_v1('scheduled', '2026-08-24 15:00:00'::timestamp, '2026-08-24 12:00:00+00'::timestamptz) $$,
  'P0001', 'OLH_PICKUP_INVALID',
  'the exact close is not a pickup slot'
);
update public.cafe_info
set hours = jsonb_set(
  hours,
  '{6}',
  '{"day":"Sunday","open":"00:00","close":"23:59","closed":false}'::jsonb
);
select throws_ok(
  $$ select private.resolve_order_pickup_v1('scheduled', '2026-03-08 02:30:00'::timestamp, '2026-03-08 06:00:00+00'::timestamptz) $$,
  'P0001', 'OLH_PICKUP_INVALID',
  'a nonexistent Montréal DST wall time rejects deterministically'
);
update public.cafe_info
set hours = jsonb_set(
  hours,
  '{6}',
  '{"day":"Sunday","open":"08:00","close":"15:00","closed":false}'::jsonb
);

update public.cafe_info set ordering_enabled = false;
select throws_ok(
  $$ select private.resolve_order_pickup_v1('asap', null, '2026-08-24 12:00:00+00'::timestamptz) $$,
  'P0001', 'OLH_ORDERING_PAUSED',
  'paused ordering fails closed'
);
update public.cafe_info set ordering_enabled = true;

update public.cafe_info
set hours = jsonb_set(
  hours,
  '{0}',
  '{"day":"Monday","open":"00:00","close":"23:59","closed":false}'::jsonb
);
select throws_ok(
  $$ select private.resolve_order_pickup_v1('asap', null, '2026-08-25 03:55:00+00'::timestamptz) $$,
  'P0001', 'OLH_PICKUP_INVALID',
  'an ASAP promise cannot cross Montréal midnight in the same-day contract'
);
update public.cafe_info
set hours = jsonb_set(
  hours,
  '{0}',
  '{"day":"Monday","open":"07:30","close":"15:00","closed":false}'::jsonb
);

select throws_ok(
  $$
    insert into public.cafe_info (
      id, hours, pickup_lead_time, max_advance_order_days,
      ordering_enabled, timezone, gst_rate, qst_rate
    )
    select
      'f5000000-0000-4000-8000-000000000001', hours,
      pickup_lead_time, max_advance_order_days, ordering_enabled,
      timezone, gst_rate, qst_rate
    from public.cafe_info
    limit 1
  $$,
  '23505',
  'duplicate key value violates unique constraint "cafe_info_singleton_key"',
  'a second authoritative café configuration cannot exist'
);
select throws_ok(
  $$ update public.cafe_info set hours = '[{"day":"Monday","open":"bad","close":"15:00","closed":false}]'::jsonb $$,
  '23514',
  null,
  'malformed or incomplete weekly hours cannot become authoritative'
);

insert into public.orders (
  id, order_number, customer_name, customer_phone, subtotal, tax_gst, tax_qst, total
) values (
  'f6000000-0000-4000-8000-000000000001', 'LEGACY-U3-001', 'Legacy', '(514) 555-0198', 1, 0.05, 0.10, 1.15
);
select is(
  (select lifecycle_contract_version from public.orders where id = 'f6000000-0000-4000-8000-000000000001'),
  null::smallint,
  'legacy inserts remain compatible and are not silently made trackable'
);
select throws_ok(
  $$ update public.menu_items set status = 'hidden', available = true where id = 'd2000000-0000-4000-8000-000000000001' $$,
  '23514', null,
  'stale dual availability fields cannot become authoritative'
);
select throws_ok(
  $$
    insert into public.orders (
      order_number, customer_name, customer_phone, subtotal, tax_gst, tax_qst, total,
      lifecycle_contract_version
    ) values ('FORGED-V1', 'Forged', '(514) 555-0197', 1, 0.05, 0.10, 1.15, 1)
  $$,
  'P0001', 'OLH_ATOMIC_CREATE_REQUIRED',
  'a v1 header cannot bypass the atomic creation routine'
);
select ok(
  (select count(distinct order_number) = count(*) from public.orders where lifecycle_contract_version = 1),
  'display order numbers are collision-safe while remaining non-authorizing identifiers'
);

insert into auth.users (id, aud, role, email)
values ('f9000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'u3-menu@example.invalid');
insert into public.admin_users (user_id)
values ('f9000000-0000-4000-8000-000000000001');
set local "request.jwt.claim.sub" = 'f9000000-0000-4000-8000-000000000001';
set local role authenticated;
select throws_ok(
  $$
    select public.create_menu_item_graph_v1(
      'd2000000-0000-4000-8000-000000000099',
      '{"category_id":"d1000000-0000-4000-8000-000000000001","name_en":"Atomic create","name_fr":"Création atomique","description_en":"Synthetic","description_fr":"Synthétique","price":5.00,"status":"available","sort_order":9}'::jsonb,
      '[{"name_en":"Empty","name_fr":"Vide","min_selections":1,"max_selections":1,"options":[]}]'::jsonb
    )
  $$,
  'P0001', 'OLH_MENU_GRAPH_INVALID',
  'an invalid menu create rolls back the item header with its graph'
);
reset role;
select is_empty(
  $$ select id from public.menu_items where id = 'd2000000-0000-4000-8000-000000000099' $$,
  'failed transactional creation leaves no hidden orphan'
);
set local role authenticated;
select lives_ok(
  $$
    select public.create_menu_item_graph_v1(
      'd2000000-0000-4000-8000-000000000099',
      '{"category_id":"d1000000-0000-4000-8000-000000000001","name_en":"Atomic create","name_fr":"Création atomique","description_en":"Synthetic","description_fr":"Synthétique","price":5.00,"status":"sold_out","sort_order":9}'::jsonb,
      '[{"name_en":"Milk","name_fr":"Lait","min_selections":0,"max_selections":1,"options":[{"name_en":"Oat","name_fr":"Avoine","price_adjustment":0.75,"available":false}]}]'::jsonb
    )
  $$,
  'a valid menu create publishes its complete graph atomically'
);
reset role;
select results_eq(
  $$
    select item.status, modifier.min_selections, option.available
    from public.menu_items as item
    join public.modifiers as modifier on modifier.menu_item_id = item.id
    join public.modifier_options as option on option.modifier_id = modifier.id
    where item.id = 'd2000000-0000-4000-8000-000000000099'
  $$,
  $$ values ('sold_out'::text, 0::smallint, false) $$,
  'atomic creation preserves status, cardinality, and option availability'
);
set local role authenticated;
select throws_ok(
  $$
    select public.save_menu_item_graph_v1(
      'd2000000-0000-4000-8000-000000000001',
      '{"category_id":"d1000000-0000-4000-8000-000000000001","name_en":"Lifecycle test latte","name_fr":"Latté de test du cycle","description_en":"Synthetic","description_fr":"Synthétique","price":5.00,"status":"available","sort_order":1}'::jsonb,
      '[{"name_en":"Empty","name_fr":"Vide","min_selections":1,"max_selections":1,"options":[]}]'::jsonb
    )
  $$,
  'P0001', 'OLH_MENU_GRAPH_INVALID',
  'an invalid replacement rolls back instead of exposing an empty modifier graph'
);
reset role;
select is(
  (select count(*) from public.modifiers where menu_item_id = 'd2000000-0000-4000-8000-000000000001'),
  2::bigint,
  'failed transactional replacement preserves the complete old graph'
);
set local role authenticated;
select lives_ok(
  $$
    select public.save_menu_item_graph_v1(
      'd2000000-0000-4000-8000-000000000001',
      '{"category_id":"d1000000-0000-4000-8000-000000000001","name_en":"Lifecycle test latte","name_fr":"Latté de test du cycle","description_en":"Synthetic","description_fr":"Synthétique","price":5.25,"status":"available","sort_order":1}'::jsonb,
      '[{"name_en":"Size","name_fr":"Taille","min_selections":1,"max_selections":1,"options":[{"name_en":"Regular","name_fr":"Régulier","price_adjustment":0,"available":true}]}]'::jsonb
    )
  $$,
  'a valid menu and modifier graph replaces atomically in one staff RPC'
);
reset role;
select results_eq(
  $$
    select item.price, count(modifier.id), count(option.id)
    from public.menu_items as item
    left join public.modifiers as modifier on modifier.menu_item_id = item.id
    left join public.modifier_options as option on option.modifier_id = modifier.id
    where item.id = 'd2000000-0000-4000-8000-000000000001'
    group by item.price
  $$,
  $$ values (5.25::numeric, 1::bigint, 1::bigint) $$,
  'the transactional save exposes only the complete new graph'
);

select ok(
  not exists (
    select 1
    from pg_proc as routine
    join pg_namespace as namespace on namespace.oid = routine.pronamespace
    cross join lateral aclexplode(coalesce(routine.proacl, acldefault('f', routine.proowner))) as grant_entry
    where namespace.nspname in ('public', 'private')
      and routine.proname in (
        'create_order_v1', 'create_order_v1_at', 'resolve_order_pickup_v1',
        'save_menu_item_graph_v1', 'create_menu_item_graph_v1',
        'get_order_status_v1', 'recover_order_v1', 'recover_order_v1_at',
        'consume_order_rate_limit_v1', 'consume_order_rate_limit_v1_at',
        'prune_order_rate_buckets_v1'
      )
      and grant_entry.grantee = 0
      and grant_entry.privilege_type = 'EXECUTE'
  ),
  'no U3 domain routine retains the default PUBLIC execute privilege'
);

select * from finish();
rollback;
