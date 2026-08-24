-- Atomic order creation expand: authoritative menu/config snapshots, private
-- tracking, durable rate windows, and compatibility-safe lifecycle columns.

begin;

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  unknown_statuses text;
  cafe_rows integer;
  invalid_modifier_prices integer;
begin
  select string_agg(distinct item.status, ', ' order by item.status)
  into unknown_statuses
  from public.menu_items as item
  where item.status not in ('available', 'sold_out', 'hidden');

  if unknown_statuses is not null then
    raise exception 'U3 compatibility preflight: unknown menu status values: %',
      unknown_statuses;
  end if;

  select count(*) into cafe_rows from public.cafe_info;
  if cafe_rows > 1 then
    raise exception
      'U3 compatibility preflight: expected at most one café configuration, found %',
      cafe_rows;
  end if;

  select count(*) into invalid_modifier_prices
  from public.modifier_options
  where price_adjustment is null or price_adjustment < 0;
  if invalid_modifier_prices > 0 then
    raise exception
      'U3 compatibility preflight: % modifier option prices are null or negative',
      invalid_modifier_prices;
  end if;
end;
$$;

-- `status` is authoritative during expand. The legacy boolean remains a
-- deterministic compatibility projection until U8 removes the old shape.
update public.menu_items
set available = (status <> 'hidden')
where available is distinct from (status <> 'hidden');

alter table public.menu_items
  add constraint menu_items_known_status
  check (status in ('available', 'sold_out', 'hidden')) not valid,
  add constraint menu_items_available_status_compatibility
  check (available is not null and available = (status <> 'hidden')) not valid;
alter table public.menu_items validate constraint menu_items_known_status;
alter table public.menu_items
  validate constraint menu_items_available_status_compatibility;
alter table public.menu_items alter column available set not null;

alter table public.modifiers
  add column min_selections smallint not null default 1,
  add column max_selections smallint not null default 1;
alter table public.modifiers
  add constraint modifiers_single_select_cardinality
  check (min_selections in (0, 1) and max_selections = 1) not valid;
alter table public.modifiers
  validate constraint modifiers_single_select_cardinality;

alter table public.modifier_options
  add column available boolean not null default true,
  alter column price_adjustment set not null;
alter table public.modifier_options
  add constraint modifier_options_nonnegative_price
  check (price_adjustment >= 0) not valid;
alter table public.modifier_options
  validate constraint modifier_options_nonnegative_price;

create or replace function private.valid_cafe_hours(p_hours jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    pg_catalog.jsonb_typeof(p_hours) = 'array'
    and pg_catalog.jsonb_array_length(p_hours) = 7
    and (
      select pg_catalog.count(*) = 7
        and pg_catalog.count(distinct entry.value ->> 'day') = 7
        and pg_catalog.bool_and(
          entry.value ?& array['day', 'open', 'close', 'closed']
          and (entry.value ->> 'day') in (
            'Monday', 'Tuesday', 'Wednesday', 'Thursday',
            'Friday', 'Saturday', 'Sunday'
          )
          and (entry.value ->> 'open') ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'
          and (entry.value ->> 'close') ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'
          and pg_catalog.jsonb_typeof(entry.value -> 'closed') = 'boolean'
          and (
            (entry.value ->> 'closed')::boolean
            or (entry.value ->> 'open')::time < (entry.value ->> 'close')::time
          )
        )
      from pg_catalog.jsonb_array_elements(p_hours) as entry(value)
    );
$$;

revoke all on function private.valid_cafe_hours(jsonb) from public;
revoke all on function private.valid_cafe_hours(jsonb) from anon;
grant execute on function private.valid_cafe_hours(jsonb) to authenticated;
grant execute on function private.valid_cafe_hours(jsonb) to service_role;

alter table public.cafe_info
  add column singleton boolean not null default true,
  add column ordering_enabled boolean not null default false,
  add column timezone text not null default 'America/Toronto',
  add column gst_rate numeric(8,6) not null default 0.05,
  add column qst_rate numeric(8,6) not null default 0.09975;

alter table public.cafe_info
  add constraint cafe_info_singleton_key unique (singleton),
  add constraint cafe_info_singleton_true check (singleton) not valid,
  add constraint cafe_info_authoritative_values check (
    timezone = 'America/Toronto'
    and gst_rate between 0 and 0.25
    and qst_rate between 0 and 0.25
    and pickup_lead_time is not null
    and pickup_lead_time between 0 and 240
    and max_advance_order_days is not null
    and max_advance_order_days between 0 and 30
  ) not valid,
  add constraint cafe_info_valid_weekly_hours
    check (private.valid_cafe_hours(hours)) not valid;
alter table public.cafe_info validate constraint cafe_info_singleton_true;
alter table public.cafe_info validate constraint cafe_info_authoritative_values;
alter table public.cafe_info validate constraint cafe_info_valid_weekly_hours;

alter table public.orders
  add column lifecycle_contract_version smallint,
  add column receipt_id uuid,
  add column idempotency_key uuid,
  add column fingerprint_version smallint,
  add column request_fingerprint bytea,
  add column tracking_token_hash bytea,
  add column tracking_expires_at timestamptz,
  add column tracking_revoked_at timestamptz,
  add column pickup_mode text,
  add column promised_pickup_at timestamptz,
  add column status_version integer,
  add column gst_rate numeric(8,6),
  add column qst_rate numeric(8,6);

alter table public.orders
  add constraint orders_lifecycle_v1_contract check (
    lifecycle_contract_version is null
    or (
      lifecycle_contract_version = 1
      and receipt_id is not null
      and idempotency_key is not null
      and fingerprint_version = 1
      and request_fingerprint is not null
      and pg_catalog.octet_length(request_fingerprint) = 32
      and tracking_token_hash is not null
      and pg_catalog.octet_length(tracking_token_hash) = 32
      and tracking_expires_at is not null
      and tracking_expires_at = promised_pickup_at + interval '72 hours'
      and pickup_mode in ('asap', 'scheduled')
      and promised_pickup_at is not null
      and pickup_time = promised_pickup_at
      and status is not null
      and status_version is not null
      and status_version >= 0
      and locale is not null
      and locale in ('en', 'fr')
      and gst_rate is not null
      and gst_rate between 0 and 0.25
      and qst_rate is not null
      and qst_rate between 0 and 0.25
      and subtotal >= 0
      and tax_gst >= 0
      and tax_qst >= 0
      and total >= 0
      and tax_gst = pg_catalog.round(subtotal * gst_rate, 2)
      and tax_qst = pg_catalog.round(subtotal * qst_rate, 2)
      and total = subtotal + tax_gst + tax_qst
    )
  ) not valid;
alter table public.orders validate constraint orders_lifecycle_v1_contract;

create unique index orders_lifecycle_receipt_key
  on public.orders (receipt_id)
  where receipt_id is not null;
create unique index orders_lifecycle_idempotency_key
  on public.orders (idempotency_key)
  where idempotency_key is not null;
create unique index orders_lifecycle_tracking_hash_key
  on public.orders (tracking_token_hash)
  where tracking_token_hash is not null;

alter table public.order_items
  add column lifecycle_contract_version smallint,
  add column line_position integer,
  add column modifier_total numeric(10,2),
  add column unit_price numeric(10,2),
  add column line_total numeric(10,2);
alter table public.order_items
  add constraint order_items_lifecycle_v1_contract check (
    lifecycle_contract_version is null
    or (
      lifecycle_contract_version = 1
      and line_position is not null
      and line_position > 0
      and price >= 0
      and modifier_total is not null
      and modifier_total >= 0
      and unit_price is not null
      and unit_price = price + modifier_total
      and line_total is not null
      and line_total = unit_price * quantity
      and modifiers is not null
      and pg_catalog.jsonb_typeof(modifiers) = 'array'
    )
  ) not valid;
alter table public.order_items
  validate constraint order_items_lifecycle_v1_contract;
create unique index order_items_lifecycle_line_position_key
  on public.order_items (order_id, line_position)
  where line_position is not null;

create table public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  status_version integer not null check (status_version >= 0),
  actor_user_id uuid,
  created_at timestamptz not null default statement_timestamp(),
  unique (order_id, status_version)
);
create index order_status_events_order_created_idx
  on public.order_status_events (order_id, status_version, created_at);

alter table public.order_status_events enable row level security;
revoke all on table public.order_status_events from public;
revoke all on table public.order_status_events from anon;
revoke all on table public.order_status_events from authenticated;
revoke all on table public.order_status_events from service_role;
grant select on table public.order_status_events to authenticated;
grant select, insert on table public.order_status_events to service_role;

create policy "Allowlisted read order status events"
on public.order_status_events
for select
to authenticated
using ((select public.is_admin()));

create table public.order_rate_buckets (
  id uuid primary key default gen_random_uuid(),
  purpose text not null check (purpose in ('create', 'status', 'recovery')),
  key_hash bytea not null check (pg_catalog.octet_length(key_hash) = 32),
  window_start timestamptz not null,
  window_seconds integer not null check (window_seconds between 1 and 3600),
  request_count integer not null check (request_count > 0),
  expires_at timestamptz not null,
  unique (purpose, key_hash, window_start, window_seconds)
);
create index order_rate_buckets_expiry_idx
  on public.order_rate_buckets (expires_at);

alter table public.order_rate_buckets enable row level security;
revoke all on table public.order_rate_buckets from public;
revoke all on table public.order_rate_buckets from anon;
revoke all on table public.order_rate_buckets from authenticated;
revoke all on table public.order_rate_buckets from service_role;
grant select, insert, update, delete on table public.order_rate_buckets to service_role;

create sequence public.order_display_number_seq;
revoke all on sequence public.order_display_number_seq from public;
revoke all on sequence public.order_display_number_seq from anon;
revoke all on sequence public.order_display_number_seq from authenticated;
grant usage, select on sequence public.order_display_number_seq to service_role;

create or replace function private.order_day_name(p_local timestamp without time zone)
returns text
language sql
immutable
set search_path = ''
as $$
  select case extract(isodow from p_local)::integer
    when 1 then 'Monday'
    when 2 then 'Tuesday'
    when 3 then 'Wednesday'
    when 4 then 'Thursday'
    when 5 then 'Friday'
    when 6 then 'Saturday'
    when 7 then 'Sunday'
  end;
$$;

-- PostgreSQL row-locking SELECTs require an UPDATE privilege. Keep the main
-- order routines SECURITY INVOKER without granting the application server any
-- direct update surface by concentrating those locks in two non-data-returning
-- owner helpers.
create or replace function private.lock_cafe_configuration_v1()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform 1 from public.cafe_info for share;
end;
$$;

create or replace function private.lock_menu_item_v1(p_menu_item_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform 1
  from public.menu_items
  where id = p_menu_item_id
  for share;
end;
$$;

create or replace function private.resolve_order_pickup_v1(
  p_pickup_mode text,
  p_scheduled_pickup_local timestamp without time zone,
  p_clock timestamptz
)
returns timestamptz
language plpgsql
volatile
set search_path = ''
as $$
declare
  config public.cafe_info%rowtype;
  config_count integer;
  local_clock timestamp without time zone;
  promised_local timestamp without time zone;
  promised_at timestamptz;
  today_hours jsonb;
  open_at time;
  close_at time;
begin
  perform private.lock_cafe_configuration_v1();
  select count(*) into config_count from public.cafe_info;
  if config_count <> 1 then
    raise exception using errcode = 'P0001', message = 'OLH_CONFIGURATION_UNAVAILABLE';
  end if;

  select * into config from public.cafe_info limit 1;
  if not config.ordering_enabled then
    raise exception using errcode = 'P0001', message = 'OLH_ORDERING_PAUSED';
  end if;
  if config.timezone <> 'America/Toronto'
    or config.max_advance_order_days <> 0
    or not private.valid_cafe_hours(config.hours)
  then
    raise exception using errcode = 'P0001', message = 'OLH_CONFIGURATION_UNAVAILABLE';
  end if;

  local_clock := p_clock at time zone 'America/Toronto';
  select entry.value
  into today_hours
  from pg_catalog.jsonb_array_elements(config.hours) as entry(value)
  where entry.value ->> 'day' = private.order_day_name(local_clock);

  if today_hours is null or (today_hours ->> 'closed')::boolean then
    raise exception using errcode = 'P0001', message = 'OLH_CAFE_CLOSED';
  end if;
  open_at := (today_hours ->> 'open')::time;
  close_at := (today_hours ->> 'close')::time;

  if local_clock::time < open_at or local_clock::time >= close_at then
    raise exception using errcode = 'P0001', message = 'OLH_CAFE_CLOSED';
  end if;

  if p_pickup_mode = 'asap' then
    if p_scheduled_pickup_local is not null then
      raise exception using errcode = 'P0001', message = 'OLH_PICKUP_INVALID';
    end if;
    promised_at := p_clock + pg_catalog.make_interval(mins => config.pickup_lead_time);
    promised_local := promised_at at time zone 'America/Toronto';
  elsif p_pickup_mode = 'scheduled' then
    if p_scheduled_pickup_local is null
      or p_scheduled_pickup_local <> pg_catalog.date_trunc('minute', p_scheduled_pickup_local)
    then
      raise exception using errcode = 'P0001', message = 'OLH_PICKUP_INVALID';
    end if;
    promised_local := p_scheduled_pickup_local;
    promised_at := promised_local at time zone 'America/Toronto';
    if promised_at at time zone 'America/Toronto' <> promised_local then
      raise exception using errcode = 'P0001', message = 'OLH_PICKUP_INVALID';
    end if;
    if promised_local < local_clock + pg_catalog.make_interval(mins => config.pickup_lead_time) then
      raise exception using errcode = 'P0001', message = 'OLH_PICKUP_INVALID';
    end if;
  else
    raise exception using errcode = 'P0001', message = 'OLH_PICKUP_INVALID';
  end if;

  if promised_local::date <> local_clock::date
    or promised_local::time < open_at
    or promised_local::time >= close_at
  then
    raise exception using errcode = 'P0001', message = 'OLH_PICKUP_INVALID';
  end if;

  return promised_at;
end;
$$;

create or replace function private.next_order_number_v1(p_clock timestamptz)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  candidate text;
begin
  loop
    candidate := pg_catalog.format(
      'LD-%s-%s',
      pg_catalog.to_char(p_clock at time zone 'America/Toronto', 'YYYYMMDD'),
      pg_catalog.lpad(pg_catalog.nextval('public.order_display_number_seq'::regclass)::text, 6, '0')
    );
    exit when not exists (
      select 1 from public.orders as order_header
      where order_header.order_number = candidate
    );
  end loop;
  return candidate;
end;
$$;

create or replace function private.order_receipt_v1(p_order_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'receipt_id', order_header.receipt_id,
    'order_number', order_header.order_number,
    'status', order_header.status,
    'status_version', order_header.status_version,
    'promised_pickup_at', order_header.promised_pickup_at,
    'subtotal', order_header.subtotal,
    'tax_gst', order_header.tax_gst,
    'tax_qst', order_header.tax_qst,
    'total', order_header.total,
    'gst_rate', order_header.gst_rate,
    'qst_rate', order_header.qst_rate,
    'created_at', order_header.created_at,
    'items', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'name', item.menu_item_name,
          'base_price', item.price,
          'modifier_total', item.modifier_total,
          'unit_price', item.unit_price,
          'quantity', item.quantity,
          'line_total', item.line_total,
          'modifiers', coalesce((
            select pg_catalog.jsonb_agg(
              element.value - 'modifier_id' - 'option_id'
              order by element.ordinality
            )
            from pg_catalog.jsonb_array_elements(item.modifiers)
              with ordinality as element(value, ordinality)
          ), '[]'::jsonb)
        ) order by item.line_position
      )
      from public.order_items as item
      where item.order_id = order_header.id
    ), '[]'::jsonb)
  )
  from public.orders as order_header
  where order_header.id = p_order_id;
$$;

create or replace function private.guard_lifecycle_order_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.lifecycle_contract_version = 1
    and pg_catalog.current_setting('app.atomic_order_create', true) is distinct from '1'
  then
    raise exception using errcode = 'P0001', message = 'OLH_ATOMIC_CREATE_REQUIRED';
  end if;
  return new;
end;
$$;

create trigger guard_lifecycle_order_insert
before insert on public.orders
for each row execute function private.guard_lifecycle_order_insert();

create or replace function private.guard_lifecycle_child_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.current_setting('app.atomic_order_create', true) is distinct from '1' then
    raise exception using errcode = 'P0001', message = 'OLH_ATOMIC_CREATE_REQUIRED';
  end if;
  return new;
end;
$$;

create trigger guard_lifecycle_order_item_insert
before insert on public.order_items
for each row
when (new.lifecycle_contract_version = 1)
execute function private.guard_lifecycle_child_insert();

revoke all on function private.guard_lifecycle_order_insert() from public, anon, authenticated, service_role;
revoke all on function private.guard_lifecycle_child_insert() from public, anon, authenticated, service_role;

create or replace function private.create_order_v1_at(
  p_idempotency_key uuid,
  p_tracking_token_hash bytea,
  p_customer_name text,
  p_customer_phone text,
  p_locale text,
  p_notes text,
  p_pickup_mode text,
  p_scheduled_pickup_local timestamp without time zone,
  p_items jsonb,
  p_clock timestamptz
)
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare
  normalized_items jsonb;
  fingerprint bytea;
  existing_order public.orders%rowtype;
  line jsonb;
  menu_row public.menu_items%rowtype;
  option_ids uuid[];
  selected_count integer;
  matched_count integer;
  modifier_row public.modifiers%rowtype;
  modifier_choice_count integer;
  modifiers_snapshot jsonb;
  modifier_total numeric(10,2);
  unit_price numeric(10,2);
  line_total numeric(10,2);
  snapshots jsonb := '[]'::jsonb;
  subtotal numeric(10,2) := 0;
  promised_at timestamptz;
  config public.cafe_info%rowtype;
  order_id uuid := gen_random_uuid();
  receipt_id uuid := gen_random_uuid();
  order_number text;
  gst_amount numeric(10,2);
  qst_amount numeric(10,2);
  total_amount numeric(10,2);
  line_number integer := 0;
  previous_atomic_create text := pg_catalog.current_setting('app.atomic_order_create', true);
begin
  if p_idempotency_key is null
    or p_tracking_token_hash is null
    or pg_catalog.octet_length(p_tracking_token_hash) <> 32
    or p_customer_name is null or pg_catalog.length(pg_catalog.btrim(p_customer_name)) not between 1 and 100
    or p_customer_phone is null or pg_catalog.length(pg_catalog.btrim(p_customer_phone)) not between 7 and 32
    or p_locale is null or p_locale not in ('en', 'fr')
    or pg_catalog.length(coalesce(p_notes, '')) > 500
    or p_items is null
    or pg_catalog.jsonb_typeof(p_items) <> 'array'
    or pg_catalog.jsonb_array_length(p_items) not between 1 and 50
  then
    raise exception using errcode = 'P0001', message = 'OLH_INVALID_INPUT';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_items) as raw(line)
    where pg_catalog.jsonb_typeof(raw.line) <> 'object'
      or not (raw.line ?& array['menu_item_id', 'quantity', 'option_ids'])
      or (select count(*) from pg_catalog.jsonb_object_keys(raw.line)) <> 3
      or pg_catalog.jsonb_typeof(raw.line -> 'option_ids') <> 'array'
      or pg_catalog.jsonb_array_length(raw.line -> 'option_ids') > 20
      or not (raw.line ->> 'menu_item_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
      or not (raw.line ->> 'quantity' ~ '^[0-9]+$')
      or (raw.line ->> 'quantity')::integer not between 1 and 20
      or exists (
        select 1 from pg_catalog.jsonb_array_elements_text(raw.line -> 'option_ids') as selected(id)
        where not (selected.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
      )
  ) then
    raise exception using errcode = 'P0001', message = 'OLH_INVALID_INPUT';
  end if;

  select pg_catalog.jsonb_agg(canonical.line order by canonical.line::text)
  into normalized_items
  from (
    select pg_catalog.jsonb_build_object(
      'menu_item_id', raw.line ->> 'menu_item_id',
      'quantity', (raw.line ->> 'quantity')::integer,
      'option_ids', coalesce((
        select pg_catalog.jsonb_agg(selected.id order by selected.id)
        from pg_catalog.jsonb_array_elements_text(raw.line -> 'option_ids') as selected(id)
      ), '[]'::jsonb)
    ) as line
    from pg_catalog.jsonb_array_elements(p_items) as raw(line)
  ) as canonical;

  fingerprint := extensions.digest(
    pg_catalog.convert_to(
      pg_catalog.jsonb_build_object(
        'version', 1,
        'tracking_hash', pg_catalog.encode(p_tracking_token_hash, 'hex'),
        'customer_name', pg_catalog.btrim(p_customer_name),
        'customer_phone', pg_catalog.btrim(p_customer_phone),
        'locale', p_locale,
        'notes', coalesce(p_notes, ''),
        'pickup_mode', p_pickup_mode,
        'scheduled_pickup_local', p_scheduled_pickup_local,
        'items', normalized_items
      )::text,
      'UTF8'
    ),
    'sha256'
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_idempotency_key::text, 0)
  );

  select * into existing_order
  from public.orders
  where idempotency_key = p_idempotency_key;
  if found then
    if existing_order.fingerprint_version <> 1
      or existing_order.request_fingerprint <> fingerprint
      or existing_order.tracking_token_hash <> p_tracking_token_hash
    then
      raise exception using errcode = 'P0001', message = 'OLH_IDEMPOTENCY_CONFLICT';
    end if;
    return private.order_receipt_v1(existing_order.id);
  end if;

  if exists (
    select 1 from public.orders
    where tracking_token_hash = p_tracking_token_hash
  ) then
    raise exception using errcode = 'P0001', message = 'OLH_TRACKING_CONFLICT';
  end if;

  promised_at := private.resolve_order_pickup_v1(
    p_pickup_mode, p_scheduled_pickup_local, p_clock
  );
  select * into strict config from public.cafe_info limit 1;

  for line in
    select value
    from pg_catalog.jsonb_array_elements(normalized_items)
    order by value::text
  loop
    line_number := line_number + 1;
    perform private.lock_menu_item_v1((line ->> 'menu_item_id')::uuid);
    select * into menu_row
    from public.menu_items
    where id = (line ->> 'menu_item_id')::uuid;
    if not found or menu_row.status <> 'available' then
      raise exception using errcode = 'P0001', message = 'OLH_MENU_CHANGED';
    end if;

    select coalesce(pg_catalog.array_agg(selected.id::uuid order by selected.id), '{}'::uuid[]),
      count(*), count(distinct selected.id)
    into option_ids, selected_count, matched_count
    from pg_catalog.jsonb_array_elements_text(line -> 'option_ids') as selected(id);
    if selected_count <> matched_count then
      raise exception using errcode = 'P0001', message = 'OLH_MODIFIER_INVALID';
    end if;

    select count(*) into matched_count
    from public.modifier_options as option
    join public.modifiers as modifier on modifier.id = option.modifier_id
    where option.id = any(option_ids)
      and option.available
      and modifier.menu_item_id = menu_row.id;
    if matched_count <> selected_count then
      raise exception using errcode = 'P0001', message = 'OLH_MODIFIER_INVALID';
    end if;

    for modifier_row in
      select * from public.modifiers
      where menu_item_id = menu_row.id
      order by sort_order, id
    loop
      if not exists (
        select 1 from public.modifier_options
        where modifier_id = modifier_row.id and available
      ) then
        raise exception using errcode = 'P0001', message = 'OLH_MODIFIER_INVALID';
      end if;
      select count(*) into modifier_choice_count
      from public.modifier_options
      where modifier_id = modifier_row.id and id = any(option_ids);
      if modifier_choice_count < modifier_row.min_selections
        or modifier_choice_count > modifier_row.max_selections
      then
        raise exception using errcode = 'P0001', message = 'OLH_MODIFIER_INVALID';
      end if;
    end loop;

    select coalesce(pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'modifier_id', modifier.id,
        'option_id', option.id,
        'modifier_name', case when p_locale = 'fr' then modifier.name_fr else modifier.name_en end,
        'option_name', case when p_locale = 'fr' then option.name_fr else option.name_en end,
        'price_adjustment', option.price_adjustment
      ) order by modifier.sort_order, option.sort_order, option.id
    ), '[]'::jsonb), coalesce(sum(option.price_adjustment), 0)
    into modifiers_snapshot, modifier_total
    from public.modifier_options as option
    join public.modifiers as modifier on modifier.id = option.modifier_id
    where option.id = any(option_ids);

    unit_price := menu_row.price + modifier_total;
    line_total := unit_price * (line ->> 'quantity')::integer;
    subtotal := subtotal + line_total;
    snapshots := snapshots || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'line_position', line_number,
        'menu_item_id', menu_row.id,
        'menu_item_name', case when p_locale = 'fr' then menu_row.name_fr else menu_row.name_en end,
        'price', menu_row.price,
        'modifier_total', modifier_total,
        'unit_price', unit_price,
        'quantity', (line ->> 'quantity')::integer,
        'line_total', line_total,
        'modifiers', modifiers_snapshot
      )
    );
  end loop;

  if subtotal < 0 or subtotal > 1000 then
    raise exception using errcode = 'P0001', message = 'OLH_INVALID_INPUT';
  end if;

  gst_amount := pg_catalog.round(subtotal * config.gst_rate, 2);
  qst_amount := pg_catalog.round(subtotal * config.qst_rate, 2);
  total_amount := subtotal + gst_amount + qst_amount;
  order_number := private.next_order_number_v1(p_clock);

  perform pg_catalog.set_config('app.atomic_order_create', '1', true);
  insert into public.orders (
    id, order_number, customer_name, customer_phone, pickup_time, status,
    subtotal, tax_gst, tax_qst, total, locale, notes,
    lifecycle_contract_version, receipt_id, idempotency_key,
    fingerprint_version, request_fingerprint, tracking_token_hash,
    tracking_expires_at, pickup_mode, promised_pickup_at, status_version,
    gst_rate, qst_rate, created_at, updated_at
  ) values (
    order_id, order_number, pg_catalog.btrim(p_customer_name),
    pg_catalog.btrim(p_customer_phone), promised_at, 'new', subtotal,
    gst_amount, qst_amount, total_amount, p_locale, p_notes,
    1, receipt_id, p_idempotency_key, 1, fingerprint, p_tracking_token_hash,
    promised_at + interval '72 hours', p_pickup_mode, promised_at, 0,
    config.gst_rate, config.qst_rate, p_clock, p_clock
  );

  insert into public.order_items (
    order_id, menu_item_id, menu_item_name, price, quantity, modifiers,
    lifecycle_contract_version, line_position, modifier_total, unit_price, line_total
  )
  select
    order_id,
    (snapshot.value ->> 'menu_item_id')::uuid,
    snapshot.value ->> 'menu_item_name',
    (snapshot.value ->> 'price')::numeric,
    (snapshot.value ->> 'quantity')::integer,
    snapshot.value -> 'modifiers',
    1,
    (snapshot.value ->> 'line_position')::integer,
    (snapshot.value ->> 'modifier_total')::numeric,
    (snapshot.value ->> 'unit_price')::numeric,
    (snapshot.value ->> 'line_total')::numeric
  from pg_catalog.jsonb_array_elements(snapshots) as snapshot(value);

  insert into public.order_status_events (
    order_id, from_status, to_status, status_version, actor_user_id, created_at
  ) values (order_id, null, 'new', 0, null, p_clock);

  perform pg_catalog.set_config(
    'app.atomic_order_create', coalesce(previous_atomic_create, ''), true
  );
  return private.order_receipt_v1(order_id);
exception
  when unique_violation then
    if exists (select 1 from public.orders where idempotency_key = p_idempotency_key) then
      raise exception using errcode = 'P0001', message = 'OLH_IDEMPOTENCY_CONFLICT';
    end if;
    if exists (select 1 from public.orders where tracking_token_hash = p_tracking_token_hash) then
      raise exception using errcode = 'P0001', message = 'OLH_TRACKING_CONFLICT';
    end if;
    raise;
end;
$$;

create or replace function public.create_order_v1(
  p_idempotency_key uuid,
  p_tracking_token_hash bytea,
  p_customer_name text,
  p_customer_phone text,
  p_locale text,
  p_notes text,
  p_pickup_mode text,
  p_scheduled_pickup_local timestamp without time zone,
  p_items jsonb
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.create_order_v1_at(
    p_idempotency_key, p_tracking_token_hash, p_customer_name, p_customer_phone,
    p_locale, p_notes, p_pickup_mode, p_scheduled_pickup_local, p_items,
    statement_timestamp()
  );
$$;

create or replace function public.get_order_status_v1(p_tracking_token_hash bytea)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'order_number', order_header.order_number,
    'status', order_header.status,
    'status_version', order_header.status_version,
    'promised_pickup_at', order_header.promised_pickup_at,
    'updated_at', order_header.updated_at,
    'cafe', pg_catalog.jsonb_build_object(
      'address', config.address,
      'phone', config.phone
    )
  )
  from public.orders as order_header
  cross join public.cafe_info as config
  where order_header.lifecycle_contract_version = 1
    and order_header.tracking_token_hash = p_tracking_token_hash
    and order_header.tracking_revoked_at is null
    and order_header.tracking_expires_at > statement_timestamp();
$$;

create or replace function private.get_order_status_v1_at(
  p_tracking_token_hash bytea,
  p_clock timestamptz
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'order_number', order_header.order_number,
    'status', order_header.status,
    'status_version', order_header.status_version,
    'promised_pickup_at', order_header.promised_pickup_at,
    'updated_at', order_header.updated_at,
    'cafe', pg_catalog.jsonb_build_object(
      'address', config.address,
      'phone', config.phone
    )
  )
  from public.orders as order_header
  cross join public.cafe_info as config
  where order_header.lifecycle_contract_version = 1
    and order_header.tracking_token_hash = p_tracking_token_hash
    and order_header.tracking_revoked_at is null
    and order_header.tracking_expires_at > p_clock;
$$;

create or replace function private.recover_order_v1_at(
  p_idempotency_key uuid,
  p_tracking_token_hash bytea,
  p_clock timestamptz
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select private.order_receipt_v1(order_header.id)
  from public.orders as order_header
  where order_header.lifecycle_contract_version = 1
    and order_header.idempotency_key = p_idempotency_key
    and order_header.tracking_token_hash = p_tracking_token_hash
    and order_header.tracking_revoked_at is null
    and order_header.tracking_expires_at > p_clock;
$$;

create or replace function public.recover_order_v1(
  p_idempotency_key uuid,
  p_tracking_token_hash bytea
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.recover_order_v1_at(
    p_idempotency_key, p_tracking_token_hash, statement_timestamp()
  );
$$;

create or replace function private.consume_order_rate_limit_v1_at(
  p_purpose text,
  p_key_hash bytea,
  p_limit integer,
  p_window_seconds integer,
  p_clock timestamptz
)
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare
  bucket public.order_rate_buckets%rowtype;
  start_at timestamptz;
  end_at timestamptz;
begin
  if p_purpose is null or p_purpose not in ('create', 'status', 'recovery')
    or p_key_hash is null or pg_catalog.octet_length(p_key_hash) <> 32
    or p_limit is null
    or p_limit not between 1 and 10000
    or p_window_seconds is null
    or p_window_seconds not between 1 and 3600
    or p_clock is null
  then
    raise exception using errcode = 'P0001', message = 'OLH_RATE_INPUT_INVALID';
  end if;

  start_at := pg_catalog.to_timestamp(
    pg_catalog.floor(extract(epoch from p_clock) / p_window_seconds)
      * p_window_seconds
  );
  end_at := start_at + pg_catalog.make_interval(secs => p_window_seconds);

  insert into public.order_rate_buckets (
    purpose, key_hash, window_start, window_seconds, request_count, expires_at
  ) values (
    p_purpose, p_key_hash, start_at, p_window_seconds, 1, end_at + interval '5 minutes'
  )
  on conflict (purpose, key_hash, window_start, window_seconds)
  do update set request_count = public.order_rate_buckets.request_count + 1
  returning * into bucket;

  return pg_catalog.jsonb_build_object(
    'allowed', bucket.request_count <= p_limit,
    'count', bucket.request_count,
    'limit', p_limit,
    'retry_after_seconds', greatest(0, pg_catalog.ceil(extract(epoch from end_at - p_clock))::integer)
  );
end;
$$;

create or replace function public.consume_order_rate_limit_v1(
  p_purpose text,
  p_key_hash bytea,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.consume_order_rate_limit_v1_at(
    p_purpose, p_key_hash, p_limit, p_window_seconds, statement_timestamp()
  );
$$;

create or replace function public.prune_order_rate_buckets_v1()
returns integer
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  delete from public.order_rate_buckets
  where expires_at <= statement_timestamp();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create or replace function public.save_menu_item_graph_v1(
  p_menu_item_id uuid,
  p_item jsonb,
  p_modifiers jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  group_value jsonb;
  option_value jsonb;
  modifier_id uuid;
  group_position integer := 0;
  option_position integer;
begin
  if actor is null or not exists (
    select 1 from public.admin_users where user_id = actor
  ) then
    raise exception using errcode = 'P0001', message = 'OLH_ADMIN_FORBIDDEN';
  end if;
  if p_menu_item_id is null
    or pg_catalog.jsonb_typeof(p_item) <> 'object'
    or pg_catalog.jsonb_typeof(p_modifiers) <> 'array'
    or pg_catalog.jsonb_array_length(p_modifiers) > 20
    or (p_item ->> 'status') not in ('available', 'sold_out', 'hidden')
    or not ((p_item ->> 'price') ~ '^[0-9]+(?:\.[0-9]{1,2})?$')
    or (p_item ->> 'price')::numeric < 0
  then
    raise exception using errcode = 'P0001', message = 'OLH_MENU_GRAPH_INVALID';
  end if;

  perform 1 from public.menu_items where id = p_menu_item_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'OLH_MENU_CHANGED';
  end if;

  for group_value in select value from pg_catalog.jsonb_array_elements(p_modifiers)
  loop
    if pg_catalog.jsonb_typeof(group_value -> 'options') <> 'array'
      or pg_catalog.jsonb_array_length(group_value -> 'options') not between 1 and 20
      or (group_value ->> 'min_selections')::integer not in (0, 1)
      or (group_value ->> 'max_selections')::integer <> 1
      or pg_catalog.length(pg_catalog.btrim(group_value ->> 'name_en')) not between 1 and 100
      or pg_catalog.length(pg_catalog.btrim(group_value ->> 'name_fr')) not between 1 and 100
    then
      raise exception using errcode = 'P0001', message = 'OLH_MENU_GRAPH_INVALID';
    end if;
  end loop;

  update public.menu_items
  set
    category_id = (p_item ->> 'category_id')::uuid,
    name_en = p_item ->> 'name_en',
    name_fr = p_item ->> 'name_fr',
    description_en = coalesce(p_item ->> 'description_en', ''),
    description_fr = coalesce(p_item ->> 'description_fr', ''),
    price = (p_item ->> 'price')::numeric,
    status = p_item ->> 'status',
    available = (p_item ->> 'status') <> 'hidden',
    image_url = nullif(p_item ->> 'image_url', ''),
    sort_order = coalesce((p_item ->> 'sort_order')::integer, sort_order)
  where id = p_menu_item_id;

  delete from public.modifiers where menu_item_id = p_menu_item_id;
  for group_value in select value from pg_catalog.jsonb_array_elements(p_modifiers)
  loop
    group_position := group_position + 1;
    modifier_id := gen_random_uuid();
    insert into public.modifiers (
      id, menu_item_id, name_en, name_fr, sort_order, min_selections, max_selections
    ) values (
      modifier_id, p_menu_item_id, pg_catalog.btrim(group_value ->> 'name_en'),
      pg_catalog.btrim(group_value ->> 'name_fr'), group_position,
      (group_value ->> 'min_selections')::smallint,
      (group_value ->> 'max_selections')::smallint
    );
    option_position := 0;
    for option_value in select value from pg_catalog.jsonb_array_elements(group_value -> 'options')
    loop
      option_position := option_position + 1;
      if pg_catalog.length(pg_catalog.btrim(option_value ->> 'name_en')) not between 1 and 100
        or pg_catalog.length(pg_catalog.btrim(option_value ->> 'name_fr')) not between 1 and 100
        or not ((option_value ->> 'price_adjustment') ~ '^[0-9]+(?:\.[0-9]{1,2})?$')
        or (option_value ->> 'price_adjustment')::numeric < 0
      then
        raise exception using errcode = 'P0001', message = 'OLH_MENU_GRAPH_INVALID';
      end if;
      insert into public.modifier_options (
        modifier_id, name_en, name_fr, price_adjustment, sort_order, available
      ) values (
        modifier_id, pg_catalog.btrim(option_value ->> 'name_en'),
        pg_catalog.btrim(option_value ->> 'name_fr'),
        (option_value ->> 'price_adjustment')::numeric, option_position,
        coalesce((option_value ->> 'available')::boolean, true)
      );
    end loop;
  end loop;

  return p_menu_item_id;
end;
$$;

-- Preserve the old service-key two-insert shape for legacy/null-contract rows,
-- but prevent it from mutating v1 truth. U8 removes the remaining legacy shape.
revoke update on table public.orders from service_role;
revoke update, delete on table public.order_items from service_role;
grant select, insert, delete on table public.orders to service_role;
grant select, insert on table public.order_items to service_role;
-- The creation/status wrappers are SECURITY INVOKER by design. The server role
-- therefore needs read-only access to the authoritative rows those routines
-- validate; RLS bypass alone does not confer table privileges.
grant select on table public.cafe_info to service_role;
grant select on table public.menu_items to service_role;
grant select on table public.modifiers to service_role;
grant select on table public.modifier_options to service_role;

revoke all on function public.create_order_v1(uuid,bytea,text,text,text,text,text,timestamp without time zone,jsonb) from public;
revoke all on function public.create_order_v1(uuid,bytea,text,text,text,text,text,timestamp without time zone,jsonb) from anon;
revoke all on function public.create_order_v1(uuid,bytea,text,text,text,text,text,timestamp without time zone,jsonb) from authenticated;
grant execute on function public.create_order_v1(uuid,bytea,text,text,text,text,text,timestamp without time zone,jsonb) to service_role;

revoke all on function private.create_order_v1_at(uuid,bytea,text,text,text,text,text,timestamp without time zone,jsonb,timestamptz) from public;
revoke all on function private.create_order_v1_at(uuid,bytea,text,text,text,text,text,timestamp without time zone,jsonb,timestamptz) from anon;
revoke all on function private.create_order_v1_at(uuid,bytea,text,text,text,text,text,timestamp without time zone,jsonb,timestamptz) from authenticated;
grant execute on function private.create_order_v1_at(uuid,bytea,text,text,text,text,text,timestamp without time zone,jsonb,timestamptz) to service_role;

revoke all on function public.get_order_status_v1(bytea) from public;
revoke all on function public.get_order_status_v1(bytea) from anon;
revoke all on function public.get_order_status_v1(bytea) from authenticated;
grant execute on function public.get_order_status_v1(bytea) to service_role;

revoke all on function public.recover_order_v1(uuid,bytea) from public;
revoke all on function public.recover_order_v1(uuid,bytea) from anon;
revoke all on function public.recover_order_v1(uuid,bytea) from authenticated;
grant execute on function public.recover_order_v1(uuid,bytea) to service_role;

revoke all on function public.consume_order_rate_limit_v1(text,bytea,integer,integer) from public;
revoke all on function public.consume_order_rate_limit_v1(text,bytea,integer,integer) from anon;
revoke all on function public.consume_order_rate_limit_v1(text,bytea,integer,integer) from authenticated;
grant execute on function public.consume_order_rate_limit_v1(text,bytea,integer,integer) to service_role;

revoke all on function public.prune_order_rate_buckets_v1() from public;
revoke all on function public.prune_order_rate_buckets_v1() from anon;
revoke all on function public.prune_order_rate_buckets_v1() from authenticated;
grant execute on function public.prune_order_rate_buckets_v1() to service_role;

revoke all on function public.save_menu_item_graph_v1(uuid,jsonb,jsonb) from public;
revoke all on function public.save_menu_item_graph_v1(uuid,jsonb,jsonb) from anon;
revoke all on function public.save_menu_item_graph_v1(uuid,jsonb,jsonb) from service_role;
grant execute on function public.save_menu_item_graph_v1(uuid,jsonb,jsonb) to authenticated;

revoke all on function private.order_day_name(timestamp without time zone) from public, anon, authenticated, service_role;
grant execute on function private.order_day_name(timestamp without time zone) to service_role;
revoke all on function private.lock_cafe_configuration_v1() from public, anon, authenticated;
grant execute on function private.lock_cafe_configuration_v1() to service_role;
revoke all on function private.lock_menu_item_v1(uuid) from public, anon, authenticated;
grant execute on function private.lock_menu_item_v1(uuid) to service_role;
revoke all on function private.resolve_order_pickup_v1(text,timestamp without time zone,timestamptz) from public, anon, authenticated;
grant execute on function private.resolve_order_pickup_v1(text,timestamp without time zone,timestamptz) to service_role;
revoke all on function private.next_order_number_v1(timestamptz) from public, anon, authenticated;
grant execute on function private.next_order_number_v1(timestamptz) to service_role;
revoke all on function private.order_receipt_v1(uuid) from public, anon, authenticated;
grant execute on function private.order_receipt_v1(uuid) to service_role;
revoke all on function private.get_order_status_v1_at(bytea,timestamptz) from public, anon, authenticated, service_role;
revoke all on function private.recover_order_v1_at(uuid,bytea,timestamptz) from public, anon, authenticated;
grant execute on function private.recover_order_v1_at(uuid,bytea,timestamptz) to service_role;
revoke all on function private.consume_order_rate_limit_v1_at(text,bytea,integer,integer,timestamptz) from public, anon, authenticated;
grant execute on function private.consume_order_rate_limit_v1_at(text,bytea,integer,integer,timestamptz) to service_role;

commit;
