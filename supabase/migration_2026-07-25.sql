-- =============================================================================
-- MIGRATION — 2026-07-25
-- Run this in your Supabase project's SQL Editor (Dashboard → SQL Editor →
-- New query → paste this whole file → Run) on your EXISTING project.
--
-- Do NOT re-run the full schema.sql on a database that already has data —
-- it will fail on the "create policy" statements (a policy with the same
-- name already exists) and re-insert the seed rows. This file only makes
-- the two changes described in CHANGES-2026-07-25.md:
--   1. stock_meters can now hold fractional meters (was integer-only,
--      which is why saving an edit with a decimal stock value silently
--      failed).
--   2. Only the owner role can edit or delete an existing fabric row;
--      staff can still add new stock.
-- =============================================================================

-- 1. Allow fractional meters in stock.
--
-- fabrics_secure (a view) depends on this column, and Postgres won't let
-- you change a column's type while a view depends on it — so the view
-- has to be dropped first and recreated after, exactly as it was
-- originally defined in schema.sql.
drop view if exists fabrics_secure;

alter table fabrics
  alter column stock_meters type numeric using stock_meters::numeric;

create or replace view fabrics_secure
with (security_invoker = true) as
select
  id, fabric_type, color_name, hex, width, gsm, retail_price, stock_meters, sku, created_at,
  case when is_wholesale_authorized() then wholesale_price else null end as wholesale_price
from fabrics;

grant select on fabrics_secure to anon, authenticated;

-- 2. Replace the old "any staff can do anything" policy with three
--    narrower ones. Drop the old policy first (safe if it doesn't exist).
drop policy if exists "fabrics_write_staff_only" on fabrics;
drop policy if exists "fabrics_insert_staff" on fabrics;
drop policy if exists "fabrics_update_owner_only" on fabrics;
drop policy if exists "fabrics_delete_owner_only" on fabrics;

create policy "fabrics_insert_staff" on fabrics
  for insert with check (
    exists (select 1 from profiles where profiles.id = auth.uid())
  );

create policy "fabrics_update_owner_only" on fabrics
  for update using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'owner')
  )
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'owner')
  );

create policy "fabrics_delete_owner_only" on fabrics
  for delete using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'owner')
  );

-- Done. Nothing else in your database changes — your existing fabrics,
-- profiles, wholesale_accounts rows, and all other tables/policies/
-- functions/views are untouched.
