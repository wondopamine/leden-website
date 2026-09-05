begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select plan(38);

select has_function(
  'public',
  'transition_order_status_v1',
  array['uuid', 'order_status', 'integer', 'order_status'],
  'the optimistic staff transition routine exists'
);
select is(
  (
    select routine.prosecdef
    from pg_proc as routine
    join pg_namespace as namespace on namespace.oid = routine.pronamespace
    where namespace.nspname = 'public'
      and routine.proname = 'transition_order_status_v1'
  ),
  true,
  'the transition routine is security definer'
);
select is(
  (
    select routine.proconfig
    from pg_proc as routine
    join pg_namespace as namespace on namespace.oid = routine.pronamespace
    where namespace.nspname = 'public'
      and routine.proname = 'transition_order_status_v1'
  ),
  array['search_path=""']::text[],
  'the transition routine pins an empty search path'
);
select ok(
  has_function_privilege('authenticated', 'public.transition_order_status_v1(uuid,order_status,integer,order_status)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.transition_order_status_v1(uuid,order_status,integer,order_status)', 'EXECUTE')
    and not has_function_privilege('service_role', 'public.transition_order_status_v1(uuid,order_status,integer,order_status)', 'EXECUTE'),
  'only authenticated staff sessions may invoke the transition routine'
);
select ok(
  not has_table_privilege('anon', 'public.order_status_events', 'SELECT')
    and has_table_privilege('authenticated', 'public.order_status_events', 'SELECT'),
  'event history is staff-readable but never anonymous'
);
select ok(
  not has_table_privilege('authenticated', 'public.order_status_events', 'INSERT, UPDATE, DELETE')
    and not has_table_privilege('service_role', 'public.order_status_events', 'UPDATE, DELETE'),
  'application roles cannot forge or rewrite lifecycle events'
);

insert into public.orders (
  id, order_number, customer_name, customer_phone, subtotal, tax_gst, tax_qst, total
) values (
  'f7000000-0000-4000-8000-000000000099', 'LEGACY-EVENT-GUARD',
  'Guard Fixture', '(514) 555-0198', 1, 0.05, 0.10, 1.15
);
set local role service_role;
select throws_ok(
  $$
    insert into public.order_status_events (order_id, from_status, to_status, status_version)
    values ('f7000000-0000-4000-8000-000000000099', null, 'new', 0)
  $$,
  'P0001', 'OLH_EVENT_WRITE_FORBIDDEN',
  'a fresh service session cannot exploit unset internal event guard settings'
);
reset role;
delete from public.orders where id = 'f7000000-0000-4000-8000-000000000099';

insert into auth.users (id, aud, role, email)
values
  ('f7000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'u3-staff@example.invalid'),
  ('f7000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'u3-unlisted@example.invalid');
insert into public.admin_users (user_id)
values ('f7000000-0000-4000-8000-000000000001');

create temporary table transition_orders (name text primary key, order_id uuid not null) on commit drop;
grant select on table transition_orders to authenticated, service_role;
do $$
begin
  perform private.create_order_v1_at(
    'f7100000-0000-4000-8000-000000000001', decode(repeat('81', 32), 'hex'),
    'Synthetic Transition', '(514) 555-0111', 'en', null, 'asap', null,
    '[{"menu_item_id":"d2000000-0000-4000-8000-000000000001","quantity":1,"option_ids":["d4000000-0000-4000-8000-000000000001"]}]'::jsonb,
    '2026-08-24 12:00:00+00'::timestamptz
  );
  perform private.create_order_v1_at(
    'f7100000-0000-4000-8000-000000000002', decode(repeat('82', 32), 'hex'),
    'Synthetic Cancellation', '(514) 555-0112', 'fr', null, 'asap', null,
    '[{"menu_item_id":"d2000000-0000-4000-8000-000000000001","quantity":1,"option_ids":["d4000000-0000-4000-8000-000000000001"]}]'::jsonb,
    '2026-08-24 12:00:00+00'::timestamptz
  );
  perform private.create_order_v1_at(
    'f7100000-0000-4000-8000-000000000003', decode(repeat('83', 32), 'hex'),
    'Prepare Cancellation', '(514) 555-0113', 'en', null, 'asap', null,
    '[{"menu_item_id":"d2000000-0000-4000-8000-000000000001","quantity":1,"option_ids":["d4000000-0000-4000-8000-000000000001"]}]'::jsonb,
    '2026-08-24 12:00:00+00'::timestamptz
  );
  perform private.create_order_v1_at(
    'f7100000-0000-4000-8000-000000000004', decode(repeat('84', 32), 'hex'),
    'Ready Cancellation', '(514) 555-0114', 'en', null, 'asap', null,
    '[{"menu_item_id":"d2000000-0000-4000-8000-000000000001","quantity":1,"option_ids":["d4000000-0000-4000-8000-000000000001"]}]'::jsonb,
    '2026-08-24 12:00:00+00'::timestamptz
  );
  perform private.create_order_v1_at(
    'f7100000-0000-4000-8000-000000000005', decode(repeat('85', 32), 'hex'),
    'Direct Invariant', '(514) 555-0115', 'en', null, 'asap', null,
    '[{"menu_item_id":"d2000000-0000-4000-8000-000000000001","quantity":1,"option_ids":["d4000000-0000-4000-8000-000000000001"]}]'::jsonb,
    '2026-08-24 12:00:00+00'::timestamptz
  );
end;
$$;
insert into transition_orders (name, order_id)
select 'forward', id from public.orders
where idempotency_key = 'f7100000-0000-4000-8000-000000000001';
insert into transition_orders (name, order_id)
select 'cancel', id from public.orders
where idempotency_key = 'f7100000-0000-4000-8000-000000000002';
insert into transition_orders (name, order_id)
select 'prepare_cancel', id from public.orders
where idempotency_key = 'f7100000-0000-4000-8000-000000000003';
insert into transition_orders (name, order_id)
select 'ready_cancel', id from public.orders
where idempotency_key = 'f7100000-0000-4000-8000-000000000004';
insert into transition_orders (name, order_id)
select 'direct', id from public.orders
where idempotency_key = 'f7100000-0000-4000-8000-000000000005';

set local "request.jwt.claim.sub" = 'f7000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';
set local role authenticated;

select throws_ok(
  $$ select public.transition_order_status_v1((select order_id from transition_orders where name = 'forward'), 'new', null, 'preparing') $$,
  'P0001', 'OLH_TRANSITION_CONFLICT',
  'a null optimistic version cannot bypass conflict detection'
);
select throws_ok(
  $$ select public.transition_order_status_v1((select order_id from transition_orders where name = 'forward'), 'new', 0, null) $$,
  'P0001', 'OLH_TRANSITION_INVALID',
  'a null destination cannot bypass the legal transition graph'
);

select lives_ok(
  $$ select public.transition_order_status_v1((select order_id from transition_orders where name = 'forward'), 'new', 0, 'preparing') $$,
  'staff can advance new to preparing'
);
select results_eq(
  $$ select status, status_version from public.orders where id = (select order_id from transition_orders where name = 'forward') $$,
  $$ values ('preparing'::public.order_status, 1) $$,
  'a legal transition increments exactly one version'
);
select is(
  (select count(*) from public.order_status_events where order_id = (select order_id from transition_orders where name = 'forward') and status_version = 1 and from_status = 'new' and to_status = 'preparing' and actor_user_id = 'f7000000-0000-4000-8000-000000000001'),
  1::bigint,
  'the transition creates one actor-attributed event'
);
select lives_ok(
  $$ select public.transition_order_status_v1((select order_id from transition_orders where name = 'forward'), 'preparing', 1, 'ready') $$,
  'staff can advance preparing to ready'
);
select lives_ok(
  $$ select public.transition_order_status_v1((select order_id from transition_orders where name = 'forward'), 'ready', 2, 'picked_up') $$,
  'staff can advance ready to picked up'
);
select throws_ok(
  $$ select public.transition_order_status_v1((select order_id from transition_orders where name = 'forward'), 'picked_up', 3, 'cancelled') $$,
  'P0001', 'OLH_TRANSITION_INVALID',
  'picked-up orders are terminal'
);
select throws_ok(
  $$ select public.transition_order_status_v1((select order_id from transition_orders where name = 'cancel'), 'new', 0, 'ready') $$,
  'P0001', 'OLH_TRANSITION_INVALID',
  'skipped forward states reject'
);
select lives_ok(
  $$ select public.transition_order_status_v1((select order_id from transition_orders where name = 'cancel'), 'new', 0, 'cancelled') $$,
  'cancellation is legal from an active state'
);
select throws_ok(
  $$ select public.transition_order_status_v1((select order_id from transition_orders where name = 'cancel'), 'new', 0, 'preparing') $$,
  'P0001', 'OLH_TRANSITION_CONFLICT',
  'a stale expected state and version conflict safely'
);
select is(
  (select count(*) from public.order_status_events where order_id = (select order_id from transition_orders where name = 'cancel')),
  2::bigint,
  'rejected transitions never add contradictory events'
);

select lives_ok(
  $$ select public.transition_order_status_v1((select order_id from transition_orders where name = 'prepare_cancel'), 'new', 0, 'preparing') $$,
  'preparing cancellation fixture reaches preparing'
);
select lives_ok(
  $$ select public.transition_order_status_v1((select order_id from transition_orders where name = 'prepare_cancel'), 'preparing', 1, 'cancelled') $$,
  'cancellation is legal from preparing'
);
select lives_ok(
  $$ select public.transition_order_status_v1((select order_id from transition_orders where name = 'ready_cancel'), 'new', 0, 'preparing') $$,
  'ready cancellation fixture reaches preparing'
);
select lives_ok(
  $$ select public.transition_order_status_v1((select order_id from transition_orders where name = 'ready_cancel'), 'preparing', 1, 'ready') $$,
  'ready cancellation fixture reaches ready'
);
select lives_ok(
  $$ select public.transition_order_status_v1((select order_id from transition_orders where name = 'ready_cancel'), 'ready', 2, 'cancelled') $$,
  'cancellation is legal from ready'
);
select results_eq(
  $$
    select fixture.name, order_header.status, order_header.status_version, count(event.id)
    from transition_orders as fixture
    join public.orders as order_header on order_header.id = fixture.order_id
    join public.order_status_events as event on event.order_id = order_header.id
    where fixture.name in ('prepare_cancel', 'ready_cancel')
    group by fixture.name, order_header.status, order_header.status_version
    order by fixture.name
  $$,
  $$
    values
      ('prepare_cancel'::text, 'cancelled'::public.order_status, 2, 3::bigint),
      ('ready_cancel'::text, 'cancelled'::public.order_status, 3, 4::bigint)
  $$,
  'every allowed cancellation edge advances once and records exactly one event'
);

select lives_ok(
  $$ update public.orders set status = 'preparing' where id = (select order_id from transition_orders where name = 'direct') $$,
  'the compatibility direct staff path still passes through graph enforcement'
);
select results_eq(
  $$
    select order_header.status, order_header.status_version, count(event.id)
    from public.orders as order_header
    join public.order_status_events as event on event.order_id = order_header.id
    where order_header.id = (select order_id from transition_orders where name = 'direct')
    group by order_header.status, order_header.status_version
  $$,
  $$ values ('preparing'::public.order_status, 1, 2::bigint) $$,
  'direct compatibility writes cannot bypass automatic versioning or the event ledger'
);
select throws_ok(
  $$ update public.orders set status_version = 99 where id = (select order_id from transition_orders where name = 'direct') $$,
  '42501', null,
  'column privileges deny direct staff attempts to forge lifecycle versions'
);
select throws_ok(
  $$ update public.orders set total = 0 where id = (select order_id from transition_orders where name = 'direct') $$,
  '42501', null,
  'column privileges deny direct staff attempts to rewrite authoritative totals'
);

select throws_ok(
  $$
    update public.orders
    set status = 'preparing'
    where id = (select order_id from transition_orders where name = 'cancel')
  $$,
  'P0001', 'OLH_TRANSITION_INVALID',
  'the temporary direct staff path still enforces terminal immutability'
);

reset role;
delete from public.admin_users where user_id = 'f7000000-0000-4000-8000-000000000001';
set local role authenticated;
select throws_ok(
  $$ select public.transition_order_status_v1((select order_id from transition_orders where name = 'forward'), 'picked_up', 3, 'cancelled') $$,
  'P0001', 'OLH_ADMIN_FORBIDDEN',
  'removing live allowlist membership blocks the next transition'
);
reset role;

set local "request.jwt.claim.sub" = 'f7000000-0000-4000-8000-000000000002';
set local role authenticated;
select throws_ok(
  $$ select public.transition_order_status_v1((select order_id from transition_orders where name = 'forward'), 'picked_up', 3, 'cancelled') $$,
  'P0001', 'OLH_ADMIN_FORBIDDEN',
  'an authenticated but unlisted user cannot transition'
);
reset role;

set local role service_role;
select throws_ok(
  $$
    insert into public.order_status_events (order_id, from_status, to_status, status_version)
    values ((select order_id from transition_orders where name = 'forward'), 'picked_up', 'cancelled', 99)
  $$,
  'P0001', 'OLH_EVENT_WRITE_FORBIDDEN',
  'the server cannot reuse a leaked trigger context to forge an event'
);
select throws_ok(
  $$ update public.orders set status = 'cancelled' where id = (select order_id from transition_orders where name = 'forward') $$,
  '42501', null,
  'the elevated application server cannot bypass the staff transition boundary'
);
select throws_ok(
  $$ update public.order_items set quantity = 99 where order_id = (select order_id from transition_orders where name = 'forward') $$,
  '42501', null,
  'the server cannot rewrite immutable line snapshots'
);
select throws_ok(
  $$ delete from public.order_status_events where order_id = (select order_id from transition_orders where name = 'forward') $$,
  '42501', null,
  'the server cannot delete immutable lifecycle events'
);
reset role;

select is(
  (select status_version from public.orders where id = (select order_id from transition_orders where name = 'forward')),
  3,
  'failed bypass attempts cannot regress the terminal version'
);
select is(
  (select count(*) from public.order_status_events where order_id = (select order_id from transition_orders where name = 'forward')),
  4::bigint,
  'the complete forward path has one initial and three transition events'
);

select * from finish();
rollback;
