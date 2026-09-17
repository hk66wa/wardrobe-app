-- Lock the wardrobe down to signed-in users only.
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query)
-- AFTER creating at least one user under Authentication -> Users, otherwise
-- you'll lock yourself out until you do.
--
-- This replaces the original "allow all" policies (safe while the app was
-- only ever reachable on your home network) with policies that require a
-- valid Supabase Auth session. Every signed-in user sees the same shared
-- wardrobe -- there's no per-user data split, since this is meant to be used
-- by you and your partner together.

drop policy if exists "Allow all on items" on public.items;
create policy "Authenticated read/write on items" on public.items
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Allow all on outfit_log" on public.outfit_log;
create policy "Authenticated read/write on outfit_log" on public.outfit_log
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Photos stay on the public bucket/URL scheme (unchanged) -- the bucket's
-- "public" flag makes read requests bypass storage RLS entirely regardless
-- of what a select policy says, so a select policy here would be
-- misleading. Paths are random-UUID filenames, not listable or guessable,
-- so this is a low-risk tradeoff for a personal photo bucket. What DOES
-- matter, and is locked down below: nobody can upload or delete photos, or
-- read/write any item/outfit data, without being signed in.

drop policy if exists "Anyone can upload wardrobe photos" on storage.objects;
create policy "Authenticated upload wardrobe photos" on storage.objects
  for insert
  with check (bucket_id = 'wardrobe-photos' and auth.role() = 'authenticated');

drop policy if exists "Anyone can delete wardrobe photos" on storage.objects;
create policy "Authenticated delete wardrobe photos" on storage.objects
  for delete
  using (bucket_id = 'wardrobe-photos' and auth.role() = 'authenticated');
