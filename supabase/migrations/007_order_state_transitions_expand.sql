-- Order transition expand: every writer follows the legal graph, versions move
-- monotonically, and one immutable actor-attributed event records each change.

begin;

create or replace function private.enforce_order_lifecycle_update()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if old.lifecycle_contract_version = 1 then
    if new.lifecycle_contract_version is distinct from old.lifecycle_contract_version
      or new.receipt_id is distinct from old.receipt_id
      or new.idempotency_key is distinct from old.idempotency_key
      or new.fingerprint_version is distinct from old.fingerprint_version
      or new.request_fingerprint is distinct from old.request_fingerprint
      or new.tracking_token_hash is distinct from old.tracking_token_hash
      or new.tracking_expires_at is distinct from old.tracking_expires_at
      or new.pickup_mode is distinct from old.pickup_mode
      or new.promised_pickup_at is distinct from old.promised_pickup_at
      or new.pickup_time is distinct from old.pickup_time
      or new.subtotal is distinct from old.subtotal
      or new.tax_gst is distinct from old.tax_gst
      or new.tax_qst is distinct from old.tax_qst
      or new.total is distinct from old.total
      or new.gst_rate is distinct from old.gst_rate
      or new.qst_rate is distinct from old.qst_rate
    then
      raise exception using errcode = 'P0001', message = 'OLH_ORDER_IMMUTABLE';
    end if;
  end if;

  if new.status is distinct from old.status then
    if actor is null or not exists (
      select 1 from public.admin_users as membership
      where membership.user_id = actor
    ) then
      raise exception using errcode = 'P0001', message = 'OLH_ADMIN_FORBIDDEN';
    end if;
    if new.status_version is distinct from old.status_version then
      raise exception using errcode = 'P0001', message = 'OLH_STATUS_VERSION_FORBIDDEN';
    end if;
    if not coalesce((
      (old.status = 'new' and new.status in ('preparing', 'cancelled'))
      or (old.status = 'preparing' and new.status in ('ready', 'cancelled'))
      or (old.status = 'ready' and new.status in ('picked_up', 'cancelled'))
    ), false) then
      raise exception using errcode = 'P0001', message = 'OLH_TRANSITION_INVALID';
    end if;
    new.status_version := coalesce(old.status_version, 0) + 1;
  elsif new.status_version is distinct from old.status_version then
    raise exception using errcode = 'P0001', message = 'OLH_STATUS_VERSION_FORBIDDEN';
  end if;

  return new;
end;
$$;

create trigger enforce_order_lifecycle_update
before update on public.orders
for each row execute function private.enforce_order_lifecycle_update();

create or replace function private.record_order_lifecycle_event()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  previous_transition_event text := pg_catalog.current_setting('app.order_transition_event', true);
begin
  if new.status is distinct from old.status then
    perform pg_catalog.set_config('app.order_transition_event', '1', true);
    insert into public.order_status_events (
      order_id,
      from_status,
      to_status,
      status_version,
      actor_user_id,
      created_at
    ) values (
      new.id,
      old.status,
      new.status,
      new.status_version,
      auth.uid(),
      new.updated_at
    );
    perform pg_catalog.set_config(
      'app.order_transition_event', coalesce(previous_transition_event, ''), true
    );
  end if;
  return new;
end;
$$;

create trigger record_order_lifecycle_event
after update on public.orders
for each row execute function private.record_order_lifecycle_event();

create or replace function private.guard_order_status_event_insert()
returns trigger
language plpgsql
volatile
set search_path = ''
as $$
begin
  if pg_catalog.current_setting('app.atomic_order_create', true) is distinct from '1'
    and pg_catalog.current_setting('app.order_transition_event', true) is distinct from '1'
  then
    raise exception using errcode = 'P0001', message = 'OLH_EVENT_WRITE_FORBIDDEN';
  end if;
  return new;
end;
$$;

create trigger guard_order_status_event_insert
before insert on public.order_status_events
for each row execute function private.guard_order_status_event_insert();

create or replace function private.guard_lifecycle_order_item_mutation()
returns trigger
language plpgsql
volatile
set search_path = ''
as $$
begin
  if old.lifecycle_contract_version = 1 then
    if tg_op = 'DELETE'
      and not exists (
        select 1 from public.orders as order_header
        where order_header.id = old.order_id
      )
    then
      return old;
    end if;
    raise exception using errcode = 'P0001', message = 'OLH_ORDER_ITEM_IMMUTABLE';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger guard_lifecycle_order_item_mutation
before update or delete on public.order_items
for each row execute function private.guard_lifecycle_order_item_mutation();

create or replace function private.guard_order_status_event_mutation()
returns trigger
language plpgsql
volatile
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    and not exists (
      select 1 from public.orders as order_header
      where order_header.id = old.order_id
    )
  then
    return old;
  end if;
  raise exception using errcode = 'P0001', message = 'OLH_EVENT_IMMUTABLE';
end;
$$;

create trigger guard_order_status_event_mutation
before update or delete on public.order_status_events
for each row execute function private.guard_order_status_event_mutation();

create or replace function private.guard_lifecycle_order_delete()
returns trigger
language plpgsql
volatile
set search_path = ''
as $$
begin
  if old.lifecycle_contract_version = 1
    and old.tracking_revoked_at is null
    and old.tracking_expires_at > statement_timestamp()
    and pg_catalog.current_setting('app.lifecycle_test_cleanup', true) is distinct from '1'
  then
    raise exception using errcode = 'P0001', message = 'OLH_RETENTION_ACTIVE';
  end if;
  return old;
end;
$$;

create trigger guard_lifecycle_order_delete
before delete on public.orders
for each row execute function private.guard_lifecycle_order_delete();

create or replace function public.cleanup_lifecycle_test_order_v1(p_order_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_environment text;
  target_order public.orders%rowtype;
  deleted_order_id uuid;
  previous_cleanup_context text := pg_catalog.current_setting('app.lifecycle_test_cleanup', true);
begin
  select sentinel.environment into target_environment
  from private.lifecycle_environment_sentinel as sentinel
  where sentinel.singleton = true;
  if target_environment is null or target_environment not in ('local', 'staging') then
    raise exception using errcode = 'P0001', message = 'OLH_CLEANUP_TARGET_FORBIDDEN';
  end if;

  select * into target_order
  from public.orders
  where id = p_order_id
  for update;
  if not found then
    return null;
  end if;

  if target_order.lifecycle_contract_version = 1 then
    update public.orders
    set tracking_revoked_at = coalesce(tracking_revoked_at, statement_timestamp())
    where id = p_order_id;
  end if;

  perform pg_catalog.set_config('app.lifecycle_test_cleanup', '1', true);
  delete from public.orders
  where id = p_order_id
  returning id into deleted_order_id;
  perform pg_catalog.set_config(
    'app.lifecycle_test_cleanup', coalesce(previous_cleanup_context, ''), true
  );
  return deleted_order_id;
end;
$$;

create or replace function public.transition_order_status_v1(
  p_order_id uuid,
  p_expected_status public.order_status,
  p_expected_version integer,
  p_new_status public.order_status
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_order public.orders%rowtype;
  changed_order public.orders%rowtype;
begin
  if actor is null or not exists (
    select 1 from public.admin_users as membership
    where membership.user_id = actor
  ) then
    raise exception using errcode = 'P0001', message = 'OLH_ADMIN_FORBIDDEN';
  end if;
  if p_order_id is null or p_expected_status is null or p_expected_version is null then
    raise exception using errcode = 'P0001', message = 'OLH_TRANSITION_CONFLICT';
  end if;
  if p_new_status is null then
    raise exception using errcode = 'P0001', message = 'OLH_TRANSITION_INVALID';
  end if;

  select * into current_order
  from public.orders
  where id = p_order_id
  for update;

  if not found
    or current_order.status is distinct from p_expected_status
    or coalesce(current_order.status_version, 0) <> p_expected_version
  then
    raise exception using errcode = 'P0001', message = 'OLH_TRANSITION_CONFLICT';
  end if;

  update public.orders
  set status = p_new_status
  where id = p_order_id
  returning * into changed_order;

  return pg_catalog.jsonb_build_object(
    'order_id', changed_order.id,
    'status', changed_order.status,
    'status_version', changed_order.status_version,
    'updated_at', changed_order.updated_at
  );
end;
$$;

revoke all on function public.transition_order_status_v1(uuid,public.order_status,integer,public.order_status) from public;
revoke all on function public.transition_order_status_v1(uuid,public.order_status,integer,public.order_status) from anon;
revoke all on function public.transition_order_status_v1(uuid,public.order_status,integer,public.order_status) from service_role;
grant execute on function public.transition_order_status_v1(uuid,public.order_status,integer,public.order_status) to authenticated;

revoke all on function private.enforce_order_lifecycle_update() from public, anon, authenticated, service_role;
revoke all on function private.record_order_lifecycle_event() from public, anon, authenticated, service_role;
revoke all on function private.guard_order_status_event_insert() from public, anon, authenticated, service_role;
revoke all on function private.guard_lifecycle_order_item_mutation() from public, anon, authenticated, service_role;
revoke all on function private.guard_order_status_event_mutation() from public, anon, authenticated, service_role;
revoke all on function private.guard_lifecycle_order_delete() from public, anon, authenticated, service_role;

revoke all on function public.cleanup_lifecycle_test_order_v1(uuid) from public;
revoke all on function public.cleanup_lifecycle_test_order_v1(uuid) from anon;
revoke all on function public.cleanup_lifecycle_test_order_v1(uuid) from authenticated;
grant execute on function public.cleanup_lifecycle_test_order_v1(uuid) to service_role;

commit;
