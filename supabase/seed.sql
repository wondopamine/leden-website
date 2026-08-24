-- Deterministic local/non-production lifecycle fixtures.
-- Migrations 001-004 remain immutable; this seed normalizes their sample row and
-- adds only synthetic, fixed-ID data. U2 creates login-capable Auth fixtures.

begin;

do $$
declare
  requested_environment text := coalesce(
    nullif(current_setting('app.lifecycle_environment', true), ''),
    'local'
  );
  expected_checksum constant text :=
    '85fd583a19be476b1130ab505bd2829f0324c1f621d46b38b14fd1ec6a3fcdb3';
  current_environment text;
  current_checksum text;
begin
  if requested_environment not in ('local', 'staging') then
    raise exception 'Unsupported lifecycle seed environment: %', requested_environment;
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
      expected_checksum
    );
  elsif current_environment <> requested_environment then
    raise exception 'Lifecycle sentinel is already configured as %', current_environment;
  elsif current_checksum <> expected_checksum then
    raise exception 'Lifecycle sentinel checksum does not match the committed bootstrap';
  end if;
end;
$$;

insert into public.categories (
  id,
  name_en,
  name_fr,
  slug,
  sort_order
) values (
  'd1000000-0000-4000-8000-000000000001',
  'Lifecycle test menu',
  'Menu de test du cycle',
  'lifecycle-test',
  900
)
on conflict (id) do update set
  name_en = excluded.name_en,
  name_fr = excluded.name_fr,
  slug = excluded.slug,
  sort_order = excluded.sort_order;

insert into public.menu_items (
  id,
  category_id,
  name_en,
  name_fr,
  description_en,
  description_fr,
  price,
  available,
  status,
  sort_order
) values (
  'd2000000-0000-4000-8000-000000000001',
  'd1000000-0000-4000-8000-000000000001',
  'Lifecycle test latte',
  'Latté de test du cycle',
  'Synthetic fixture. Never production menu content.',
  'Donnée synthétique. Jamais du contenu de production.',
  5.00,
  true,
  'available',
  1
)
on conflict (id) do update set
  category_id = excluded.category_id,
  name_en = excluded.name_en,
  name_fr = excluded.name_fr,
  description_en = excluded.description_en,
  description_fr = excluded.description_fr,
  price = excluded.price,
  available = excluded.available,
  status = excluded.status,
  sort_order = excluded.sort_order;

insert into public.modifiers (
  id,
  menu_item_id,
  name_en,
  name_fr,
  sort_order
) values (
  'd3000000-0000-4000-8000-000000000001',
  'd2000000-0000-4000-8000-000000000001',
  'Size',
  'Taille',
  1
)
on conflict (id) do update set
  menu_item_id = excluded.menu_item_id,
  name_en = excluded.name_en,
  name_fr = excluded.name_fr,
  sort_order = excluded.sort_order;

insert into public.modifier_options (
  id,
  modifier_id,
  name_en,
  name_fr,
  price_adjustment,
  sort_order
) values
  (
    'd4000000-0000-4000-8000-000000000001',
    'd3000000-0000-4000-8000-000000000001',
    'Regular',
    'Régulier',
    0.00,
    1
  ),
  (
    'd4000000-0000-4000-8000-000000000002',
    'd3000000-0000-4000-8000-000000000001',
    'Large',
    'Grand',
    1.25,
    2
  )
on conflict (id) do update set
  modifier_id = excluded.modifier_id,
  name_en = excluded.name_en,
  name_fr = excluded.name_fr,
  price_adjustment = excluded.price_adjustment,
  sort_order = excluded.sort_order;

do $$
declare
  cafe_row_count integer;
begin
  select count(*) into cafe_row_count from public.cafe_info;

  if cafe_row_count = 0 then
    insert into public.cafe_info (id) values (
      'd5000000-0000-4000-8000-000000000001'
    );
  elsif cafe_row_count = 1 then
    update public.cafe_info
    set id = 'd5000000-0000-4000-8000-000000000001';
  else
    raise exception 'Expected at most one café configuration, found %', cafe_row_count;
  end if;

  update public.cafe_info
  set
    hours = '[
      {"day":"Monday","open":"07:30","close":"15:00","closed":false},
      {"day":"Tuesday","open":"07:30","close":"15:00","closed":false},
      {"day":"Wednesday","open":"07:30","close":"15:00","closed":false},
      {"day":"Thursday","open":"07:30","close":"15:00","closed":false},
      {"day":"Friday","open":"07:30","close":"15:00","closed":false},
      {"day":"Saturday","open":"08:00","close":"15:00","closed":false},
      {"day":"Sunday","open":"08:00","close":"15:00","closed":false}
    ]'::jsonb,
    address = 'E2E lifecycle fixture — not a real café address',
    phone = '(514) 555-0100',
    announcement_en = 'Synthetic lifecycle environment',
    announcement_fr = 'Environnement synthétique du cycle',
    pickup_lead_time = 15,
    max_advance_order_days = 0
  where id = 'd5000000-0000-4000-8000-000000000001';
end;
$$;

commit;
