-- 0001_core.sql
-- Core tables: brands, releases, figures, copies, storage locations, platforms,
-- listings and sales. Later stages add tables (purchases, expenses, tags, tasks,
-- hunt list, saved listing text, photos); they should not need to change these.
--
-- SECURITY RULES for every table in this project (see CLAUDE.md, "Security model"):
--   1. owner_id column, filled in automatically with the signed-in user.
--   2. Row Level Security ON.
--   3. One policy: a row is visible and changeable only when owner_id is the
--      signed-in user. Never "to authenticated" without that comparison.
--   4. Nothing granted to "anon" (people who are not signed in).
--
-- Money is whole cents (integer). A NULL amount means "unknown", never zero.
-- History is never deleted: foreign keys use ON DELETE RESTRICT.

begin;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

-- Which numbered SQL files have been applied to this database. Not reachable
-- from the app: RLS is on and there are no policies or grants.
create table if not exists public.schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);
alter table public.schema_migrations enable row level security;
revoke all on table public.schema_migrations from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Editable lists
-- ---------------------------------------------------------------------------

-- Thrilljoy PIX! today; Funko later.
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

-- Where a physical copy is kept: "Bag 01" ... "Bag 06" today.
create table public.storage_locations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

-- Selling sites: eBay and Vinted today. Fee presets are added in stage 6.
create table public.platforms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

-- ---------------------------------------------------------------------------
-- Catalogue: release -> figure -> copy
-- ---------------------------------------------------------------------------

-- One product (one blind box design). Holds a Hero figure and a Chase figure.
create table public.releases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete restrict,
  brand_id uuid not null references public.brands (id) on delete restrict,
  code text check (code is null or length(btrim(code)) > 0),          -- e.g. R-001 (from the spreadsheet)
  name text not null check (length(btrim(name)) > 0),                  -- official release name
  license text,
  edition_size integer check (edition_size is null or edition_size > 0),
  exclusive text,                                                      -- exclusive or sticker wording
  barcode text,                                                        -- UPC, for the scanner (later stage)
  box_number text,                                                     -- Funko only
  url text,                                                            -- maker's product page
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, code)
);

-- One specific figure: a Hero or a Chase within a release. This is what Greg searches for.
create table public.figures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete restrict,
  release_id uuid not null references public.releases (id) on delete restrict,
  code text check (code is null or length(btrim(code)) > 0),          -- e.g. F-001
  name text not null check (length(btrim(name)) > 0),
  variant text not null check (length(btrim(variant)) > 0),            -- Hero, Chase, Rare Chase (list editable in Settings later)
  how_to_tell text,
  other_names text,
  est_value_cents integer check (est_value_cents is null or est_value_cents >= 0),
  est_value_checked_on date,
  target_price_cents integer check (target_price_cents is null or target_price_cents >= 0),
  floor_price_cents integer check (floor_price_cents is null or floor_price_cents >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, code),
  -- Lets a copy prove that its figure belongs to its release (see copies below).
  unique (id, release_id)
);

create index figures_release_id_idx on public.figures (release_id);

-- One physical item Greg can hold.
create table public.copies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete restrict,
  code text check (code is null or length(btrim(code)) > 0),          -- e.g. C-0001
  release_id uuid not null references public.releases (id) on delete restrict,
  -- NULL figure = sealed blind box whose variant is not known yet ("Reveal" sets it).
  figure_id uuid,
  -- Whose it is: for sale, Greg's collection, or Kaitlyn's collection.
  bucket text not null check (bucket in ('for_sale', 'greg', 'kaitlyn')),
  storage_location_id uuid references public.storage_locations (id) on delete restrict,
  -- Condition. NULL means "not recorded".
  boxed boolean,                 -- true = in box, false = loose figure
  has_sleeve boolean,
  has_coa boolean,               -- Certificate of Authenticity card
  in_protector boolean,
  flaw boolean not null default false,
  condition_note text,
  -- What Greg paid. NULL = unknown. Never defaulted, never treated as zero.
  cost_cents integer check (cost_cents is null or cost_cents >= 0),
  status text not null default 'in_hand' check (status in ('incoming', 'in_hand', 'sold', 'shipped')),
  source_note text,              -- where this record came from
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, code),
  -- A copy's figure must belong to the copy's own release.
  foreign key (figure_id, release_id) references public.figures (id, release_id) on delete restrict
);

create index copies_figure_id_idx on public.copies (figure_id);
create index copies_release_id_idx on public.copies (release_id);
create index copies_storage_location_id_idx on public.copies (storage_location_id);

-- ---------------------------------------------------------------------------
-- Listings
-- ---------------------------------------------------------------------------

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete restrict,
  code text check (code is null or length(btrim(code)) > 0),          -- e.g. L-001
  platform_id uuid not null references public.platforms (id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'live', 'ended', 'sold')),
  title text,
  price_cents integer check (price_cents is null or price_cents >= 0),
  floor_cents integer check (floor_cents is null or floor_cents >= 0),  -- auto-decline offers below this
  -- How many are offered. For a set (two figures on one listing) this is the number of sets.
  quantity integer not null default 1 check (quantity >= 0),
  external_id text,              -- the site's own listing number (eBay item ID)
  url text,
  listed_on date,                -- NULL = not recorded
  reminder_on date,
  reminder_note text,
  note text,
  source_note text,
  -- True for records that came from screenshots and may be out of date (the Vinted review).
  needs_review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, code)
);

create index listings_platform_id_idx on public.listings (platform_id);

-- Which figures a listing offers. One row for a normal listing, two for a Hero + Chase set.
create table public.listing_figures (
  listing_id uuid not null references public.listings (id) on delete restrict,
  figure_id uuid not null references public.figures (id) on delete restrict,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete restrict,
  position integer not null default 1,
  primary key (listing_id, figure_id)
);

create index listing_figures_figure_id_idx on public.listing_figures (figure_id);

-- Optional: the exact physical copies attached to a listing. Used when it matters which
-- copy is on a listing (a flawed copy, or the very same copy listed on two sites).
create table public.listing_copies (
  listing_id uuid not null references public.listings (id) on delete restrict,
  copy_id uuid not null references public.copies (id) on delete restrict,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete restrict,
  primary key (listing_id, copy_id)
);

create index listing_copies_copy_id_idx on public.listing_copies (copy_id);

-- ---------------------------------------------------------------------------
-- Sales
-- ---------------------------------------------------------------------------

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete restrict,
  code text check (code is null or length(btrim(code)) > 0),          -- e.g. S-001
  platform_id uuid not null references public.platforms (id) on delete restrict,
  listing_id uuid references public.listings (id) on delete restrict,
  sold_on date,                  -- NULL = not recorded
  sale_price_cents integer not null check (sale_price_cents >= 0),
  shipping_charged_cents integer check (shipping_charged_cents is null or shipping_charged_cents >= 0),
  platform_fee_cents integer check (platform_fee_cents is null or platform_fee_cents >= 0),
  label_cost_cents integer check (label_cost_cents is null or label_cost_cents >= 0),
  other_cost_cents integer check (other_cost_cents is null or other_cost_cents >= 0),
  buyer text,
  order_number text,
  external_id text,              -- the site's listing number the sale came from
  status text not null default 'to_ship' check (status in ('to_ship', 'shipped', 'complete', 'refunded')),
  note text,
  needs_review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, code)
);

create index sales_platform_id_idx on public.sales (platform_id);
create index sales_listing_id_idx on public.sales (listing_id);

-- The physical copies that a sale covered. A refunded sale keeps its rows here (history is
-- kept) while the copy goes back into inventory and may later be sold again, so a copy can
-- appear under more than one sale; at most one of those sales may be un-refunded (checked
-- by the app when a sale is recorded).
create table public.sale_copies (
  sale_id uuid not null references public.sales (id) on delete restrict,
  copy_id uuid not null references public.copies (id) on delete restrict,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete restrict,
  primary key (sale_id, copy_id)
);

create index sale_copies_copy_id_idx on public.sale_copies (copy_id);

-- A record of each spreadsheet import, so it is clear what was loaded and when.
create table public.import_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete restrict,
  file_name text,
  counts jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger releases_set_updated_at before update on public.releases
  for each row execute function public.set_updated_at();
create trigger figures_set_updated_at before update on public.figures
  for each row execute function public.set_updated_at();
create trigger copies_set_updated_at before update on public.copies
  for each row execute function public.set_updated_at();
create trigger listings_set_updated_at before update on public.listings
  for each row execute function public.set_updated_at();
create trigger sales_set_updated_at before update on public.sales
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Locks: Row Level Security, owner-only policies, and grants
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'brands', 'storage_locations', 'platforms', 'releases', 'figures', 'copies',
    'listings', 'listing_figures', 'listing_copies', 'sales', 'sale_copies', 'import_runs'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated '
      'using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id)',
      t || '_owner_only', t
    );
    execute format('revoke all on table public.%I from public, anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
  end loop;
end;
$$;

-- History is kept: the app may not delete sales, sold copies or import records.
revoke delete on table public.sales from authenticated;
revoke delete on table public.sale_copies from authenticated;
revoke delete, update on table public.import_runs from authenticated;

insert into public.schema_migrations (version) values ('0001_core');

commit;
