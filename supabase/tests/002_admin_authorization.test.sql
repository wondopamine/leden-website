begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select plan(39);

select has_table(
  'public',
  'admin_users',
  'the protected staff allowlist exists'
);

select has_function(
  'public',
  'is_admin',
  array[]::text[],
  'the no-argument membership helper exists'
);

select is(
  (
    select routine.prosecdef
    from pg_proc as routine
    join pg_namespace as namespace on namespace.oid = routine.pronamespace
    where namespace.nspname = 'public'
      and routine.proname = 'is_admin'
      and routine.pronargs = 0
  ),
  true,
  'the membership helper is security definer'
);

select is(
  (
    select routine.proconfig
    from pg_proc as routine
    join pg_namespace as namespace on namespace.oid = routine.pronamespace
    where namespace.nspname = 'public'
      and routine.proname = 'is_admin'
      and routine.pronargs = 0
  ),
  array['search_path=""']::text[],
  'the membership helper pins an empty search path'
);

select ok(
  has_function_privilege('authenticated', 'public.is_admin()', 'EXECUTE'),
  'authenticated sessions may ask only whether their own user is staff'
);

select ok(
  not has_function_privilege('anon', 'public.is_admin()', 'EXECUTE'),
  'anonymous sessions cannot execute the staff helper'
);

select ok(
  has_table_privilege('service_role', 'public.admin_users', 'SELECT, INSERT, DELETE'),
  'the service role can provision and revoke exact staff memberships'
);

select ok(
  not has_table_privilege('authenticated', 'public.admin_users', 'SELECT'),
  'authenticated sessions cannot enumerate the allowlist'
);

select ok(
  not has_table_privilege('anon', 'public.admin_users', 'SELECT'),
  'anonymous sessions cannot enumerate the allowlist'
);

select ok(
  has_table_privilege('authenticated', 'public.orders', 'SELECT'),
  'authenticated staff retain the order read grant needed by the old app'
);

select ok(
  has_column_privilege('authenticated', 'public.orders', 'status', 'UPDATE'),
  'authenticated staff retain only the direct status update compatibility grant'
);

select ok(
  not has_column_privilege('authenticated', 'public.orders', 'total', 'UPDATE'),
  'authenticated sessions cannot directly rewrite order totals'
);

select ok(
  has_table_privilege('authenticated', 'public.order_items', 'SELECT'),
  'authenticated staff retain immutable line-snapshot reads'
);

select ok(
  not has_table_privilege('authenticated', 'public.orders', 'INSERT'),
  'authenticated sessions cannot insert order headers directly'
);

select ok(
  not has_table_privilege('anon', 'public.orders', 'SELECT')
    and not has_table_privilege('anon', 'public.orders', 'INSERT')
    and not has_table_privilege('anon', 'public.orders', 'UPDATE')
    and not has_table_privilege('anon', 'public.orders', 'DELETE'),
  'anonymous sessions have no direct order-header table privileges'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and policyname like 'Admin all %'
  ),
  0::bigint,
  'no broad authenticated compatibility policy remains'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and policyname in ('Anon insert orders', 'Anon insert order_items')
  ),
  0::bigint,
  'anonymous order insert policies are removed'
);

select is(
  (
    select count(*)
    from pg_policies
    where policyname like 'Staff %'
      and schemaname in ('public', 'storage')
  ),
  11::bigint,
  'exactly the intended allowlist-aware compatibility policies exist'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and policyname like 'Authenticated users can % menu images'
  ),
  0::bigint,
  'no broad authenticated Storage mutation policy remains'
);

insert into auth.users (id, aud, role, email)
values
  (
    'e1000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'unlisted.lifecycle.invalid'
  ),
  (
    'e1000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'staff.lifecycle.invalid'
  );

insert into public.orders (
  id,
  order_number,
  customer_name,
  customer_phone,
  status,
  subtotal,
  tax_gst,
  tax_qst,
  total
) values (
  'e2000000-0000-4000-8000-000000000001',
  'E2E-AUTHZ-001',
  'Synthetic Customer',
  '(514) 555-0199',
  'new',
  5.00,
  0.25,
  0.50,
  5.75
);

insert into public.order_items (
  id,
  order_id,
  menu_item_id,
  menu_item_name,
  price,
  quantity,
  modifiers
) values (
  'e3000000-0000-4000-8000-000000000001',
  'e2000000-0000-4000-8000-000000000001',
  'd2000000-0000-4000-8000-000000000001',
  'Synthetic lifecycle item',
  5.00,
  1,
  '[]'::jsonb
);

set local "request.jwt.claim.sub" = 'e1000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';
set local role authenticated;

select is(public.is_admin(), false, 'an authenticated but unlisted user is not staff');

select is(
  (select count(*) from public.orders),
  0::bigint,
  'RLS hides order PII from an unlisted authenticated user'
);

select is(
  (select count(*) from public.order_items),
  0::bigint,
  'RLS hides order snapshots from an unlisted authenticated user'
);

select is_empty(
  $$
    update public.orders
    set status = 'preparing'
    where id = 'e2000000-0000-4000-8000-000000000001'
    returning id
  $$,
  'an unlisted authenticated user cannot update an order'
);

select is_empty(
  $$
    update public.cafe_info
    set address = 'Forbidden unlisted edit'
    returning id
  $$,
  'an unlisted authenticated user cannot mutate café settings'
);

select throws_ok(
  $$
    insert into public.categories (name_en, name_fr, slug)
    values ('Forbidden', 'Interdit', 'forbidden-unlisted')
  $$,
  '42501',
  'new row violates row-level security policy for table "categories"',
  'an unlisted authenticated user cannot insert café content'
);

select throws_ok(
  $$ select * from public.admin_users $$,
  '42501',
  'permission denied for table admin_users',
  'an unlisted authenticated user cannot read the allowlist'
);

reset role;
insert into public.admin_users (user_id)
values ('e1000000-0000-4000-8000-000000000002');

set local "request.jwt.claim.sub" = 'e1000000-0000-4000-8000-000000000002';
set local role authenticated;

select is(public.is_admin(), true, 'a listed authenticated user is staff');

select is(
  (select count(*) from public.orders),
  1::bigint,
  'allowlisted staff can read order PII'
);

select is(
  (select count(*) from public.order_items),
  1::bigint,
  'allowlisted staff can read immutable order snapshots'
);

select results_eq(
  $$
    update public.orders
    set status = 'preparing'
    where id = 'e2000000-0000-4000-8000-000000000001'
    returning id
  $$,
  $$ values ('e2000000-0000-4000-8000-000000000001'::uuid) $$,
  'allowlisted staff retain the temporary direct status update path'
);

select lives_ok(
  $$
    insert into public.categories (name_en, name_fr, slug)
    values ('Staff fixture', 'Donnée staff', 'staff-authz-fixture')
  $$,
  'allowlisted staff can insert café content'
);

select results_eq(
  $$
    update public.cafe_info
    set address = 'Synthetic staff update'
    returning id
  $$,
  $$ values ('d5000000-0000-4000-8000-000000000001'::uuid) $$,
  'allowlisted staff can update café settings'
);

reset role;
delete from public.admin_users
where user_id = 'e1000000-0000-4000-8000-000000000002';

set local role authenticated;

select is(public.is_admin(), false, 'removing membership invalidates the live session');

select is(
  (select count(*) from public.orders),
  0::bigint,
  'removed staff immediately lose order reads'
);

select is_empty(
  $$
    update public.orders
    set status = 'ready'
    where id = 'e2000000-0000-4000-8000-000000000001'
    returning id
  $$,
  'removed staff immediately lose order mutations'
);

reset role;
set local "request.jwt.claim.sub" = '';
set local "request.jwt.claim.role" = 'anon';
set local role anon;

select throws_ok(
  $$ select * from public.orders $$,
  '42501',
  'permission denied for table orders',
  'anonymous users cannot select order headers'
);

select throws_ok(
  $$
    insert into public.orders (
      order_number,
      customer_name,
      customer_phone,
      subtotal,
      tax_gst,
      tax_qst,
      total
    ) values ('FORGED', 'Forged', 'Forged', 0, 0, 0, 0)
  $$,
  '42501',
  'permission denied for table orders',
  'anonymous users cannot insert order headers'
);

select throws_ok(
  $$ select * from public.order_items $$,
  '42501',
  'permission denied for table order_items',
  'anonymous users cannot select order snapshots'
);

select throws_ok(
  $$
    insert into public.order_items (
      order_id,
      menu_item_name,
      price,
      quantity
    ) values (
      'e2000000-0000-4000-8000-000000000001',
      'Forged',
      0,
      1
    )
  $$,
  '42501',
  'permission denied for table order_items',
  'anonymous users cannot insert order snapshots'
);

reset role;
select * from finish();
rollback;
