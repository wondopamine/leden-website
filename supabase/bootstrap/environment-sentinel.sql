-- Lifecycle mutation-target sentinel bootstrap.
--
-- This file is intentionally outside supabase/migrations. Before any hosted use,
-- the harness verifies this exact file's SHA-256 digest, applies it once with
-- owner approval, and then records the target environment in the protected row.
-- Migration 005 adopts and validates this contract before later remote changes.

begin;

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

comment on table private.lifecycle_environment_sentinel is
  'Protected local/staging identity used by the order-lifecycle mutation preflight.';

revoke all on table private.lifecycle_environment_sentinel from public;
revoke all on table private.lifecycle_environment_sentinel from anon;
revoke all on table private.lifecycle_environment_sentinel from authenticated;

grant usage on schema private to service_role;
grant select on table private.lifecycle_environment_sentinel to service_role;

-- Local reset records its value in seed.sql. The one-time hosted bootstrap sets
-- both session settings before applying this same artifact. When settings are
-- present, this block can create the exact row or verify an idempotent replay;
-- it never retargets an existing database.
do $$
declare
  requested_environment text := nullif(
    current_setting('app.lifecycle_environment', true),
    ''
  );
  requested_checksum text := nullif(
    current_setting('app.lifecycle_bootstrap_checksum', true),
    ''
  );
  current_environment text;
  current_checksum text;
begin
  if requested_environment is null and requested_checksum is null then
    return;
  end if;
  if requested_environment not in ('local', 'staging') then
    raise exception 'Invalid lifecycle bootstrap environment';
  end if;
  if requested_checksum is null or requested_checksum !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid lifecycle bootstrap checksum';
  end if;

  select sentinel.environment, sentinel.bootstrap_checksum
  into current_environment, current_checksum
  from private.lifecycle_environment_sentinel as sentinel
  where sentinel.singleton = true;

  if not found then
    insert into private.lifecycle_environment_sentinel (
      singleton,
      environment,
      bootstrap_checksum
    ) values (
      true,
      requested_environment,
      requested_checksum
    );
  elsif current_environment <> requested_environment
    or current_checksum <> requested_checksum then
    raise exception 'Lifecycle sentinel is already configured differently';
  end if;
end;
$$;

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

commit;
