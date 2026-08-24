begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select plan(18);

select has_schema(
  'private',
  'private schema exists for non-exposed lifecycle state'
);

select has_table(
  'private',
  'lifecycle_environment_sentinel',
  'protected lifecycle target sentinel exists'
);

select is(
  (select count(*) from private.lifecycle_environment_sentinel),
  1::bigint,
  'exactly one environment sentinel row exists'
);

select is(
  (
    select environment
    from private.lifecycle_environment_sentinel
    where singleton = true
  ),
  'local',
  'local reset identifies itself as local'
);

select is(
  (
    select bootstrap_checksum
    from private.lifecycle_environment_sentinel
    where singleton = true
  ),
  '85fd583a19be476b1130ab505bd2829f0324c1f621d46b38b14fd1ec6a3fcdb3',
  'sentinel records the pinned bootstrap checksum'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.get_lifecycle_environment_sentinel()',
    'EXECUTE'
  ),
  'service role can read the sentinel through the narrow RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.get_lifecycle_environment_sentinel()',
    'EXECUTE'
  ),
  'anonymous clients cannot execute the sentinel RPC'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.get_lifecycle_environment_sentinel()',
    'EXECUTE'
  ),
  'authenticated browser clients cannot execute the sentinel RPC'
);

select ok(
  not has_table_privilege(
    'anon',
    'private.lifecycle_environment_sentinel',
    'SELECT'
  ),
  'anonymous clients cannot read the private sentinel table'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'private.lifecycle_environment_sentinel',
    'SELECT'
  ),
  'authenticated browser clients cannot read the private sentinel table'
);

select ok(
  has_table_privilege(
    'service_role',
    'private.lifecycle_environment_sentinel',
    'SELECT'
  ),
  'service role has the explicit narrow table grant'
);

select is(
  (
    select p.prosecdef
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_lifecycle_environment_sentinel'
  ),
  true,
  'sentinel RPC is security definer'
);

select is(
  (select count(*) from public.cafe_info),
  1::bigint,
  'seed produces one deterministic café configuration'
);

select is(
  (
    select count(*)
    from public.menu_items
    where id = 'd2000000-0000-4000-8000-000000000001'
      and name_en = 'Lifecycle test latte'
      and status = 'available'
  ),
  1::bigint,
  'seed produces the synthetic lifecycle menu item'
);

select is(
  (
    select count(*)
    from public.modifier_options
    where modifier_id = 'd3000000-0000-4000-8000-000000000001'
  ),
  2::bigint,
  'seed produces deterministic zero-cost and priced modifier choices'
);

select is(
  (
    select price_adjustment
    from public.modifier_options
    where id = 'd4000000-0000-4000-8000-000000000002'
  ),
  1.25::numeric,
  'seed includes a priced modifier for authoritative total tests'
);

select is(
  (
    select jsonb_array_length(hours)
    from public.cafe_info
    where id = 'd5000000-0000-4000-8000-000000000001'
  ),
  7,
  'seed produces seven synthetic operating-day fixtures'
);

select is(
  (
    select count(*)
    from auth.users
    where email ilike '%lifecycle%'
  ),
  0::bigint,
  'U1 seed creates no login-capable lifecycle user'
);

select * from finish();
rollback;
