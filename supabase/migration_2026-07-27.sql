-- =============================================================================
-- MIGRATION — 2026-07-27 — Archive fabrics instead of crashing on delete,
-- and enable Realtime so Inventory/Dashboard update without a page refresh.
-- Run this once in your Supabase project's SQL Editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ARCHIVE COLUMN — "Delete this fabric?" was failing with a raw
--    "violates foreign key constraint stock_batches_fabric_id_fkey" error for
--    any fabric that has ever been sold or purchased. That FK restriction is
--    intentional (see schema_v2_phase0.sql) — it stops a delete from silently
--    breaking past invoices and the FIFO cost trail their profit numbers came
--    from. Instead of erasing those fabrics, the app now archives them.
-- -----------------------------------------------------------------------------
alter table fabrics add column if not exists is_active boolean not null default true;
comment on column fabrics.is_active is 'false = archived: hidden from storefront/Record Sale/Purchase List, but kept for Inventory (restorable) and to keep past invoices resolving a name. Set automatically when a delete is blocked by sale/purchase history — see src/lib/supabaseApi.js deleteProduct.';

create index if not exists idx_fabrics_is_active on fabrics(is_active);

-- fabrics_secure depends on the fabrics column list, so it has to be dropped
-- and recreated (not just CREATE OR REPLACE) whenever a column is added
-- anywhere but the very end — same lesson as every earlier fabrics migration.
drop view if exists fabrics_secure;
create view fabrics_secure
with (security_invoker = true) as
select
  id, fabric_type, color_name, hex, width, gsm, retail_price, stock_meters, sku, created_at,
  case when is_wholesale_authorized() then wholesale_price else null end as wholesale_price,
  photo_url,
  is_active
from fabrics;

grant select on fabrics_secure to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. REALTIME — Inventory and Dashboard sometimes needed a manual page
--    refresh to show current numbers. Every action taken IN this browser tab
--    already refetches (Record Sale, closing a Market Mode trip, editing or
--    deleting a fabric) — the remaining gap is a change made from a second
--    device or a second staff login, which this tab has no way to notice on
--    its own. Adding these tables to the realtime publication lets the app
--    subscribe and refetch automatically when that happens.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'fabrics'
  ) then
    alter publication supabase_realtime add table fabrics;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'stock_batches'
  ) then
    alter publication supabase_realtime add table stock_batches;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'sales'
  ) then
    alter publication supabase_realtime add table sales;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'sale_items'
  ) then
    alter publication supabase_realtime add table sale_items;
  end if;
end $$;
