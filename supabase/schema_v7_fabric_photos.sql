-- =============================================================================
-- The Swatch Book — Schema v7: Fabric Product Photos (core, required)
-- Run this AFTER schema.sql (and schema_v2_phase0.sql, if you're using
-- that), once, in your Supabase project's SQL Editor.
--
-- This used to be split across schema_v4_phase6.sql, bundled with the
-- optional AI fabric-matching feature — but uploading a plain product
-- photo in the Inventory form isn't an AI feature, it's basic, so it
-- shouldn't have depended on an "optional" file. This is safe to run
-- whether or not you ever run schema_v4_phase6.sql, and safe to run
-- again if you already ran an earlier version of this project that
-- created the bucket privately (public = false, which is why photos
-- uploaded fine but never actually displayed), or that ran an earlier
-- version of this exact file that only created the bucket without the
-- fabrics.photo_url column (which is why saving ANY fabric, with or
-- without a photo, started failing with "Could not find the 'photo_url'
-- column of 'fabrics' in the schema cache" — the app always sends that
-- field, but the column to receive it didn't exist yet).
-- =============================================================================

-- The column the photo URL actually gets stored in.
alter table fabrics add column if not exists photo_url text;
comment on column fabrics.photo_url is 'Real fabric photo, uploaded via the Inventory form. Separate from hex, which is the calibrated swatch color used for Delta-E matching and storefront display.';

-- fabrics_secure (from schema.sql) is what the app actually reads from
-- (see src/lib/supabaseApi.js), not the base fabrics table — so
-- photo_url needs to be added there too, or the app will never see it
-- even though the column exists. This re-creates the view exactly as in
-- schema.sql, with photo_url appended at the END of the column list —
-- CREATE OR REPLACE VIEW only allows adding new columns there, not
-- inserting them in the middle (Postgres otherwise reads it as an
-- attempt to rename whatever column comes after, which fails). The
-- wholesale_price column-security logic is untouched.
create or replace view fabrics_secure
with (security_invoker = true) as
select
  id, fabric_type, color_name, hex, width, gsm, retail_price, stock_meters, sku, created_at,
  case when is_wholesale_authorized() then wholesale_price else null end as wholesale_price,
  photo_url
from fabrics;

grant select on fabrics_secure to anon, authenticated;

insert into storage.buckets (id, name, public)
select 'fabric-photos', 'fabric-photos', true
where not exists (select 1 from storage.buckets where id = 'fabric-photos');

-- In case this bucket already exists from an older version of this
-- project (created as private) — make sure it's public either way, since
-- the app reads photos back via getPublicUrl(), which only works for a
-- public bucket.
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

-- Fabric photos are readable by anyone (not staff-only like customer
-- request photos) since they're meant to show on the storefront/matcher
-- results, similar to how `hex` is already public via fabrics_secure.
create policy "fabric_photos_public_read" on storage.objects
  for select using (bucket_id = 'fabric-photos');
