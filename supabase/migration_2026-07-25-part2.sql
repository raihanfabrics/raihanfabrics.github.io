-- =============================================================================
-- MIGRATION — 2026-07-25 (part 2)
-- Run this in your Supabase project's SQL Editor, on your existing live
-- database. This is everything from today's round of bug fixes that
-- needs a database change — see CHANGES-2026-07-25-part2.md for the
-- full write-up of what was wrong and why.
--
-- Safe to run even if you're not sure whether you already ran an older
-- version of this bucket setup — every statement here is idempotent
-- (safe to run more than once).
-- =============================================================================

-- 1. Create the fabric-photos bucket if it doesn't exist yet, and make
--    sure it's PUBLIC either way (this is what "Could not upload photo"
--    was almost always about — either the bucket didn't exist at all, or
--    it existed but was private, which breaks the public URL the app
--    reads photos back from).
insert into storage.buckets (id, name, public)
select 'fabric-photos', 'fabric-photos', true
where not exists (select 1 from storage.buckets where id = 'fabric-photos');

update storage.buckets set public = true where id = 'fabric-photos';

drop policy if exists "fabric_photos_staff_write" on storage.objects;
drop policy if exists "fabric_photos_staff_delete" on storage.objects;
drop policy if exists "fabric_photos_public_read" on storage.objects;

create policy "fabric_photos_staff_write" on storage.objects
  for insert with check (
    bucket_id = 'fabric-photos'
    and exists (select 1 from profiles where profiles.id = auth.uid())
  );

create policy "fabric_photos_staff_delete" on storage.objects
  for delete using (
    bucket_id = 'fabric-photos'
    and exists (select 1 from profiles where profiles.id = auth.uid())
  );

create policy "fabric_photos_public_read" on storage.objects
  for select using (bucket_id = 'fabric-photos');

-- 2. Nothing else today needed a database change — the Record Sale / Log
--    Request / Market Mode close-trip bug (the hardcoded "wh1" that isn't
--    a valid warehouse id) was purely a code fix, and your `warehouses`
--    table already has the one default row it needs from
--    schema_v2_phase0.sql.

-- =============================================================================
-- ALSO REQUIRED — a dashboard setting, not SQL, so it can't go in this
-- file: go to Authentication → Providers → Email in your Supabase
-- dashboard and turn OFF "Confirm email". This is why "Become a Buyer"
-- signup was failing — see the README's Supabase setup section, step 2,
-- for the full explanation.
-- =============================================================================
