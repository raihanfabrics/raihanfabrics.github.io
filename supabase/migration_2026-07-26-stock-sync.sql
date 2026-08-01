-- =============================================================================
-- MIGRATION — 2026-07-26 — Sync fabrics.stock_meters with stock_batches
-- Run this in your Supabase SQL Editor.
--
-- This is the root cause of two things you reported:
--   1. Recording a sale looked like it did nothing on the Dashboard (the
--      sale itself WAS recorded correctly — but the low-stock/out-of-
--      stock/reorder numbers on the Dashboard read from
--      fabrics.stock_meters, which nothing was ever updating).
--   2. Closing a Market Mode trip said "N items were added to inventory"
--      but Inventory itself didn't change — same root cause: the
--      purchase was correctly recorded in stock_batches, but
--      fabrics.stock_meters (what Inventory actually displays) was never
--      touched.
--
-- This adds a trigger that keeps stock_meters permanently in sync with
-- the sum of stock_batches.meters_remaining for each fabric, and then
-- runs a one-time backfill so your EXISTING fabrics (which may already
-- have sales/purchases recorded against them from testing) show the
-- correct number immediately, not just going forward.
-- =============================================================================

create or replace function sync_fabric_stock_meters() returns trigger as $$
declare
  affected_fabric_id uuid := coalesce(new.fabric_id, old.fabric_id);
begin
  update fabrics
  set stock_meters = coalesce(
    (select sum(meters_remaining) from stock_batches where fabric_id = affected_fabric_id),
    0
  )
  where id = affected_fabric_id;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_sync_fabric_stock_meters on stock_batches;
create trigger trg_sync_fabric_stock_meters
  after insert or update of meters_remaining or delete on stock_batches
  for each row execute function sync_fabric_stock_meters();

-- One-time backfill: fix every fabric's stock_meters right now, for any
-- fabric that already has at least one stock_batch on record (sales or
-- purchases from before this trigger existed). Fabrics with NO batch
-- history at all (added directly via the Inventory form, never touched
-- by a sale or a Market Mode purchase) are left exactly as they are —
-- this only corrects fabrics the trigger will actually be managing going
-- forward.
update fabrics f
set stock_meters = coalesce(
  (select sum(meters_remaining) from stock_batches where fabric_id = f.id),
  0
)
where exists (select 1 from stock_batches where fabric_id = f.id);
