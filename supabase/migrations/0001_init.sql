-- Wardrobe app initial schema
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query),
-- or via the Supabase CLI: supabase db push

-- Categories an item can belong to. Kept as a check constraint (not a postgres enum)
-- so it's easy to add new categories later without an ALTER TYPE migration.
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Display name, e.g. "Blue linen shirt" -- optional, mostly for her own browsing
  name text,

  category text not null check (
    category in ('top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory')
  ),

  -- Which season(s) this item is appropriate for. An item tagged 'all_season'
  -- shows up regardless of the season filter.
  season text not null default 'all_season' check (
    season in ('summer', 'winter', 'all_season')
  ),

  -- Photo in Supabase Storage (see storage bucket setup in README).
  image_path text not null,

  -- Dominant color(s), stored as hex codes, e.g. {'#1f2937', '#f3f4f6'}.
  -- The first color is treated as the "primary" color for matching.
  colors text[] not null default '{}',

  -- Free-form style tags -- filled manually at first, later auto-suggested
  -- from her Pinterest board (see color-matching / style-learning phase).
  style_tags text[] not null default '{}',

  -- Soft-delete flag so "archived" items drop out of the randomizer
  -- without losing history.
  archived boolean not null default false
);

create index if not exists items_category_idx on public.items (category);
create index if not exists items_season_idx on public.items (season);

-- Tracks generated/worn outfits so the randomizer can avoid repeating
-- the same combination too soon.
create table if not exists public.outfit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  item_ids uuid[] not null,
  worn boolean not null default false -- true once she actually wears it, vs. just previewed
);

-- Row Level Security: since this is a private single-household app accessed
-- with the anon key, we keep RLS on but allow all operations. Tighten this
-- later if you add multi-user auth.
alter table public.items enable row level security;
alter table public.outfit_log enable row level security;

drop policy if exists "Allow all on items" on public.items;
create policy "Allow all on items" on public.items
  for all using (true) with check (true);

drop policy if exists "Allow all on outfit_log" on public.outfit_log;
create policy "Allow all on outfit_log" on public.outfit_log
  for all using (true) with check (true);

-- Storage bucket for wardrobe photos.
insert into storage.buckets (id, name, public)
values ('wardrobe-photos', 'wardrobe-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public read wardrobe photos" on storage.objects;
create policy "Public read wardrobe photos" on storage.objects
  for select using (bucket_id = 'wardrobe-photos');

drop policy if exists "Anyone can upload wardrobe photos" on storage.objects;
create policy "Anyone can upload wardrobe photos" on storage.objects
  for insert with check (bucket_id = 'wardrobe-photos');

drop policy if exists "Anyone can delete wardrobe photos" on storage.objects;
create policy "Anyone can delete wardrobe photos" on storage.objects
  for delete using (bucket_id = 'wardrobe-photos');
