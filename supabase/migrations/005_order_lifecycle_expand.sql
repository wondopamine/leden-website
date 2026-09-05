-- Order lifecycle expand: adopt the target sentinel and enforce one-role staff access.
-- This is an additive compatibility migration. U8 removes the temporary direct
-- allowlisted order-status update after the RPC-capable application canary.

begin;

-- Adopt the checksum-pinned sentinel bootstrap into canonical migration history.
create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create table if not exists private.lifecycle_environment_sentinel (
  singleton boolean primary key default true check (singleton),
  environment text not null check (environment in ('local', 'staging')),
  bootstrap_checksum text not null check (
    bootstrap_checksum ~ '^[0-9a-f]{64}$'
  ),
  configured_at timestamptz not null default now()
);

do $$
declare
  column_count integer;
  primary_key_count integer;
  check_count integer;
begin
  select count(*)
  into column_count
  from information_schema.columns
  where table_schema = 'private'
    and table_name = 'lifecycle_environment_sentinel'
    and (
      (column_name = 'singleton' and data_type = 'boolean' and is_nullable = 'NO')
      or (column_name = 'environment' and data_type = 'text' and is_nullable = 'NO')
      or (column_name = 'bootstrap_checksum' and data_type = 'text' and is_nullable = 'NO')
      or (
        column_name = 'configured_at'
        and data_type = 'timestamp with time zone'
        and is_nullable = 'NO'
      )
    );

  select count(*)
  into primary_key_count
  from pg_constraint as constraint_definition
  where constraint_definition.conrelid =
      'private.lifecycle_environment_sentinel'::regclass
    and constraint_definition.contype = 'p'
    and constraint_definition.conkey = array[
      (
        select attribute.attnum
        from pg_attribute as attribute
        where attribute.attrelid =
            'private.lifecycle_environment_sentinel'::regclass
          and attribute.attname = 'singleton'
      )
    ]::smallint[];

  select count(*)
  into check_count
  from pg_constraint as constraint_definition
  where constraint_definition.conrelid =
      'private.lifecycle_environment_sentinel'::regclass
    and constraint_definition.contype = 'c';

  if column_count <> 4 or primary_key_count <> 1 or check_count < 3 then
    raise exception
      'Existing lifecycle environment sentinel does not match the pinned contract';
  end if;
end;
$$;

comment on table private.lifecycle_environment_sentinel is
  'Protected local/staging identity used by the order-lifecycle mutation preflight.';

revoke all on table private.lifecycle_environment_sentinel from public;
revoke all on table private.lifecycle_environment_sentinel from anon;
revoke all on table private.lifecycle_environment_sentinel from authenticated;

grant usage on schema private to service_role;
grant select on table private.lifecycle_environment_sentinel to service_role;

create or replace function public.get_lifecycle_environment_sentinel()
returns table(environment text, bootstrap_checksum text)
language sql
stable
security definer
set search_path = ''
as $$
  select sentinel.environment, sentinel.bootstrap_checksum
  from private.lifecycle_environment_sentinel as sentinel
  where sentinel.singleton = true;
$$;

comment on function public.get_lifecycle_environment_sentinel() is
  'Returns the protected lifecycle target identity to the server-only service role.';

revoke all on function public.get_lifecycle_environment_sentinel() from public;
revoke all on function public.get_lifecycle_environment_sentinel() from anon;
revoke all on function public.get_lifecycle_environment_sentinel() from authenticated;
grant execute on function public.get_lifecycle_environment_sentinel() to service_role;

-- Single-capability staff membership. There is deliberately no browser-visible
-- policy and no self-enrollment function. A service-controlled fixture/provisioner
-- creates the Auth user first, then inserts that exact UUID here.
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Service-controlled allowlist for the single Café Le Den staff capability.';

alter table public.admin_users enable row level security;

revoke all on table public.admin_users from public;
revoke all on table public.admin_users from anon;
revoke all on table public.admin_users from authenticated;
grant select, insert, delete on table public.admin_users to service_role;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users as membership
    where membership.user_id = (select auth.uid())
  );
$$;

comment on function public.is_admin() is
  'Returns whether the current authenticated Auth user is allowlisted staff.';

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
revoke all on function public.is_admin() from authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;

-- Remove every permissive authenticated compatibility policy before adding the
-- allowlist-aware replacements. PostgreSQL ORs permissive policies.
drop policy if exists "Admin all categories" on public.categories;
drop policy if exists "Admin all menu_items" on public.menu_items;
drop policy if exists "Admin all modifiers" on public.modifiers;
drop policy if exists "Admin all modifier_options" on public.modifier_options;
drop policy if exists "Admin all orders" on public.orders;
drop policy if exists "Admin all order_items" on public.order_items;
drop policy if exists "Admin all cafe_info" on public.cafe_info;

drop policy if exists "Anon insert orders" on public.orders;
drop policy if exists "Anon insert order_items" on public.order_items;

drop policy if exists "Authenticated users can upload menu images"
  on storage.objects;
drop policy if exists "Authenticated users can update menu images"
  on storage.objects;
drop policy if exists "Authenticated users can delete menu images"
  on storage.objects;

-- Explicit table grants complement RLS and preserve only the old application's
-- real direct shapes during expand.
revoke all on table public.orders from public;
revoke all on table public.orders from anon;
revoke all on table public.orders from authenticated;
grant select on table public.orders to authenticated;
grant update (status) on table public.orders to authenticated;

revoke all on table public.order_items from public;
revoke all on table public.order_items from anon;
revoke all on table public.order_items from authenticated;
grant select on table public.order_items to authenticated;

revoke all on table public.categories from anon;
revoke all on table public.categories from authenticated;
grant select on table public.categories to anon, authenticated;
grant insert, update, delete on table public.categories to authenticated;

revoke all on table public.menu_items from anon;
revoke all on table public.menu_items from authenticated;
grant select on table public.menu_items to anon, authenticated;
grant insert, update, delete on table public.menu_items to authenticated;

revoke all on table public.modifiers from anon;
revoke all on table public.modifiers from authenticated;
grant select on table public.modifiers to anon, authenticated;
grant insert, update, delete on table public.modifiers to authenticated;

revoke all on table public.modifier_options from anon;
revoke all on table public.modifier_options from authenticated;
grant select on table public.modifier_options to anon, authenticated;
grant insert, update, delete on table public.modifier_options to authenticated;

revoke all on table public.cafe_info from anon;
revoke all on table public.cafe_info from authenticated;
grant select on table public.cafe_info to anon, authenticated;
grant update on table public.cafe_info to authenticated;

create policy "Staff manage categories"
on public.categories
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Staff manage menu items"
on public.menu_items
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Staff manage modifiers"
on public.modifiers
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Staff manage modifier options"
on public.modifier_options
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Staff update cafe info"
on public.cafe_info
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Staff read orders"
on public.orders
for select
to authenticated
using ((select public.is_admin()));

create policy "Staff update order status"
on public.orders
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Staff read order items"
on public.order_items
for select
to authenticated
using ((select public.is_admin()));

create policy "Staff upload menu images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'menu-images'
  and (select public.is_admin())
);

create policy "Staff update menu images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'menu-images'
  and (select public.is_admin())
)
with check (
  bucket_id = 'menu-images'
  and (select public.is_admin())
);

create policy "Staff delete menu images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'menu-images'
  and (select public.is_admin())
);

commit;
