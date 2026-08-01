-- =============================================================================
-- MIGRATION — 2026-07-25 (part 3) — URGENT
-- This one fixes "Could not find the 'photo_url' column of 'fabrics' in
-- the schema cache" — which currently blocks saving ANY fabric (with or
-- without a photo). Run this before anything else.
--
-- What happened: schema_v7_fabric_photos.sql (from the last update) only
-- created the Storage bucket, not the actual `photo_url` column the app
-- needs on the `fabrics` table itself — that was my mistake, not
-- something you did wrong. This migration adds the missing piece.
-- Safe to run even if some of this already exists.
-- =============================================================================

alter table fabrics add column if not exists photo_url text;

-- fabrics_secure is what the app actually reads from (not the fabrics
-- table directly) — so photo_url needs to be added there too, or the
-- column existing on the base table alone won't be enough. photo_url has
-- to go at the END of the column list — CREATE OR REPLACE VIEW only
-- allows appending new columns there, not inserting them in the middle
-- (Postgres otherwise reads it as trying to rename an existing column).
create or replace view fabrics_secure
with (security_invoker = true) as
select
  id, fabric_type, color_name, hex, width, gsm, retail_price, stock_meters, sku, created_at,
  case when is_wholesale_authorized() then wholesale_price else null end as wholesale_price,
  photo_url
from fabrics;

grant select on fabrics_secure to anon, authenticated;
