-- 0002_import_batch.sql
-- One function that loads a whole spreadsheet import in a single step.
--
-- Why a function: everything inside it succeeds or fails together. If any row is wrong
-- (for example a copy that names a figure that does not exist), nothing at all is saved,
-- so an import can never be left half-done. Importing the same spreadsheet twice fails
-- cleanly because every record's code (R-001, F-001, C-0001 ...) must be unique.
--
-- It runs with the rights of the signed-in user (SECURITY INVOKER), so Row Level
-- Security applies to everything it does. It cannot touch anyone else's rows.

begin;

create or replace function public.import_batch(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  want integer;
  got integer;
  counts jsonb := '{}'::jsonb;
begin
  if uid is null then
    raise exception 'Not signed in.';
  end if;
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'The import is empty or not in the expected shape.';
  end if;

  -- Editable lists: add any names that are not there yet (ignoring capitals), placed after
  -- the ones already there so a later import never shuffles the existing order.
  insert into public.brands (name, sort_order)
  select n.name,
         (select coalesce(max(b.sort_order), 0) from public.brands b where b.owner_id = uid)
           + row_number() over (order by n.name)
  from (
    select distinct on (lower(x.name)) x.name
    from jsonb_to_recordset(coalesce(payload -> 'brands', '[]'::jsonb)) as x(name text)
    where x.name is not null
    order by lower(x.name), x.name
  ) n
  where not exists (
    select 1 from public.brands b where b.owner_id = uid and lower(b.name) = lower(n.name))
  on conflict (owner_id, lower(name)) do nothing;

  insert into public.storage_locations (name, sort_order)
  select n.name,
         (select coalesce(max(s.sort_order), 0) from public.storage_locations s where s.owner_id = uid)
           + row_number() over (order by n.sort_order, n.name)
  from (
    select distinct on (lower(x.name)) x.name, coalesce(x.sort_order, 0) as sort_order
    from jsonb_to_recordset(coalesce(payload -> 'storage_locations', '[]'::jsonb)) as x(name text, sort_order integer)
    where x.name is not null
    order by lower(x.name), x.name
  ) n
  where not exists (
    select 1 from public.storage_locations s where s.owner_id = uid and lower(s.name) = lower(n.name))
  on conflict (owner_id, lower(name)) do nothing;

  insert into public.platforms (name, sort_order)
  select n.name,
         (select coalesce(max(p.sort_order), 0) from public.platforms p where p.owner_id = uid)
           + row_number() over (order by n.sort_order, n.name)
  from (
    select distinct on (lower(x.name)) x.name, coalesce(x.sort_order, 0) as sort_order
    from jsonb_to_recordset(coalesce(payload -> 'platforms', '[]'::jsonb)) as x(name text, sort_order integer)
    where x.name is not null
    order by lower(x.name), x.name
  ) n
  where not exists (
    select 1 from public.platforms p where p.owner_id = uid and lower(p.name) = lower(n.name))
  on conflict (owner_id, lower(name)) do nothing;

  -- Releases
  want := jsonb_array_length(coalesce(payload -> 'releases', '[]'::jsonb));
  insert into public.releases (brand_id, code, name, license, edition_size, exclusive, barcode, box_number, url, notes)
  select b.id, x.code, x.name, x.license, x.edition_size, x.exclusive, x.barcode, x.box_number, x.url, x.notes
  from jsonb_to_recordset(coalesce(payload -> 'releases', '[]'::jsonb)) as x(
    brand text, code text, name text, license text, edition_size integer, exclusive text,
    barcode text, box_number text, url text, notes text)
  join public.brands b on b.owner_id = uid and lower(b.name) = lower(x.brand);
  get diagnostics got = row_count;
  if got <> want then
    raise exception 'Releases: expected to save % but only % matched a brand.', want, got;
  end if;
  counts := counts || jsonb_build_object('releases', got);

  -- Figures
  want := jsonb_array_length(coalesce(payload -> 'figures', '[]'::jsonb));
  insert into public.figures (release_id, code, name, variant, how_to_tell, other_names)
  select r.id, x.code, x.name, x.variant, x.how_to_tell, x.other_names
  from jsonb_to_recordset(coalesce(payload -> 'figures', '[]'::jsonb)) as x(
    release_code text, code text, name text, variant text, how_to_tell text, other_names text)
  join public.releases r on r.owner_id = uid and r.code = x.release_code;
  get diagnostics got = row_count;
  if got <> want then
    raise exception 'Figures: expected to save % but only % matched a release.', want, got;
  end if;
  counts := counts || jsonb_build_object('figures', got);

  -- Copies. figure_code may be blank (sealed blind box); storage may be blank.
  want := jsonb_array_length(coalesce(payload -> 'copies', '[]'::jsonb));
  select count(*) into got
  from jsonb_to_recordset(coalesce(payload -> 'copies', '[]'::jsonb)) as x(figure_code text, storage text)
  left join public.figures f on f.owner_id = uid and f.code = x.figure_code
  left join public.storage_locations s on s.owner_id = uid and lower(s.name) = lower(x.storage)
  where (x.figure_code is not null and f.id is null) or (x.storage is not null and s.id is null);
  if got > 0 then
    raise exception 'Copies: % name a figure or storage location that does not exist.', got;
  end if;

  insert into public.copies (code, release_id, figure_id, bucket, storage_location_id, boxed, has_sleeve,
                             has_coa, in_protector, flaw, condition_note, cost_cents, status, source_note)
  select x.code, r.id, f.id, x.bucket, s.id, x.boxed, x.has_sleeve, x.has_coa, x.in_protector,
         coalesce(x.flaw, false), x.condition_note, x.cost_cents, coalesce(x.status, 'in_hand'), x.source_note
  from jsonb_to_recordset(coalesce(payload -> 'copies', '[]'::jsonb)) as x(
    code text, release_code text, figure_code text, bucket text, storage text, boxed boolean,
    has_sleeve boolean, has_coa boolean, in_protector boolean, flaw boolean, condition_note text,
    cost_cents integer, status text, source_note text)
  join public.releases r on r.owner_id = uid and r.code = x.release_code
  left join public.figures f on f.owner_id = uid and f.code = x.figure_code
  left join public.storage_locations s on s.owner_id = uid and lower(s.name) = lower(x.storage);
  get diagnostics got = row_count;
  if got <> want then
    raise exception 'Copies: expected to save % but only % matched a release.', want, got;
  end if;
  counts := counts || jsonb_build_object('copies', got);

  -- Listings
  want := jsonb_array_length(coalesce(payload -> 'listings', '[]'::jsonb));
  insert into public.listings (code, platform_id, status, title, price_cents, floor_cents, quantity,
                               external_id, url, listed_on, note, source_note, needs_review)
  select x.code, p.id, x.status, x.title, x.price_cents, x.floor_cents, x.quantity,
         x.external_id, x.url, x.listed_on, x.note, x.source_note, coalesce(x.needs_review, false)
  from jsonb_to_recordset(coalesce(payload -> 'listings', '[]'::jsonb)) as x(
    code text, platform text, status text, title text, price_cents integer, floor_cents integer,
    quantity integer, external_id text, url text, listed_on date, note text, source_note text,
    needs_review boolean)
  join public.platforms p on p.owner_id = uid and lower(p.name) = lower(x.platform);
  get diagnostics got = row_count;
  if got <> want then
    raise exception 'Listings: expected to save % but only % matched a platform.', want, got;
  end if;
  counts := counts || jsonb_build_object('listings', got);

  want := jsonb_array_length(coalesce(payload -> 'listing_figures', '[]'::jsonb));
  insert into public.listing_figures (listing_id, figure_id, position)
  select l.id, f.id, coalesce(x.position, 1)
  from jsonb_to_recordset(coalesce(payload -> 'listing_figures', '[]'::jsonb)) as x(
    listing_code text, figure_code text, position integer)
  join public.listings l on l.owner_id = uid and l.code = x.listing_code
  join public.figures f on f.owner_id = uid and f.code = x.figure_code;
  get diagnostics got = row_count;
  if got <> want then
    raise exception 'Listing figures: expected to save % but only % matched.', want, got;
  end if;
  counts := counts || jsonb_build_object('listing_figures', got);

  want := jsonb_array_length(coalesce(payload -> 'listing_copies', '[]'::jsonb));
  insert into public.listing_copies (listing_id, copy_id)
  select l.id, c.id
  from jsonb_to_recordset(coalesce(payload -> 'listing_copies', '[]'::jsonb)) as x(
    listing_code text, copy_code text)
  join public.listings l on l.owner_id = uid and l.code = x.listing_code
  join public.copies c on c.owner_id = uid and c.code = x.copy_code;
  get diagnostics got = row_count;
  if got <> want then
    raise exception 'Listing copies: expected to save % but only % matched.', want, got;
  end if;
  counts := counts || jsonb_build_object('listing_copies', got);

  -- Sales. listing_code may be blank (the listing a sale came from is not always known).
  want := jsonb_array_length(coalesce(payload -> 'sales', '[]'::jsonb));
  select count(*) into got
  from jsonb_to_recordset(coalesce(payload -> 'sales', '[]'::jsonb)) as x(listing_code text)
  left join public.listings l on l.owner_id = uid and l.code = x.listing_code
  where x.listing_code is not null and l.id is null;
  if got > 0 then
    raise exception 'Sales: % name a listing that does not exist.', got;
  end if;

  insert into public.sales (code, platform_id, listing_id, sold_on, sale_price_cents, shipping_charged_cents,
                            platform_fee_cents, label_cost_cents, other_cost_cents, buyer, order_number,
                            external_id, status, note, needs_review)
  select x.code, p.id, l.id, x.sold_on, x.sale_price_cents, x.shipping_charged_cents, x.platform_fee_cents,
         x.label_cost_cents, x.other_cost_cents, x.buyer, x.order_number, x.external_id,
         coalesce(x.status, 'complete'), x.note, coalesce(x.needs_review, false)
  from jsonb_to_recordset(coalesce(payload -> 'sales', '[]'::jsonb)) as x(
    code text, platform text, listing_code text, sold_on date, sale_price_cents integer,
    shipping_charged_cents integer, platform_fee_cents integer, label_cost_cents integer,
    other_cost_cents integer, buyer text, order_number text, external_id text, status text, note text,
    needs_review boolean)
  join public.platforms p on p.owner_id = uid and lower(p.name) = lower(x.platform)
  left join public.listings l on l.owner_id = uid and l.code = x.listing_code;
  get diagnostics got = row_count;
  if got <> want then
    raise exception 'Sales: expected to save % but only % matched a platform.', want, got;
  end if;
  counts := counts || jsonb_build_object('sales', got);

  want := jsonb_array_length(coalesce(payload -> 'sale_copies', '[]'::jsonb));
  insert into public.sale_copies (sale_id, copy_id)
  select sa.id, c.id
  from jsonb_to_recordset(coalesce(payload -> 'sale_copies', '[]'::jsonb)) as x(
    sale_code text, copy_code text)
  join public.sales sa on sa.owner_id = uid and sa.code = x.sale_code
  join public.copies c on c.owner_id = uid and c.code = x.copy_code;
  get diagnostics got = row_count;
  if got <> want then
    raise exception 'Sale copies: expected to save % but only % matched.', want, got;
  end if;
  counts := counts || jsonb_build_object('sale_copies', got);

  insert into public.import_runs (file_name, counts)
  values (payload ->> 'file_name', counts);

  return counts;
end;
$$;

revoke all on function public.import_batch(jsonb) from public, anon;
grant execute on function public.import_batch(jsonb) to authenticated;

insert into public.schema_migrations (version) values ('0002_import_batch');

commit;
