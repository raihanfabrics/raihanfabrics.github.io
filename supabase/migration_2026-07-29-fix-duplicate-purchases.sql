-- =============================================================================
-- MIGRATION — 2026-07-29 — Clean up duplicate purchase records left over from
-- the double-counting bug, so migration_2026-07-28.sql's unique index can
-- actually be created.
--
-- Run the sections below ONE AT A TIME, in order, in the Supabase SQL
-- Editor. Don't run the whole file in one go — Section 1 is diagnostic and
-- worth reading before anything is deleted.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- SECTION 1 — DIAGNOSTIC (read-only, safe to run any time)
--
-- Shows every trip+fabric that got double-counted: the batch that's being
-- kept (the earliest one) next to the batch(es) that will be removed,
-- with how much of each has already been sold. Run this first and take a
-- look — in particular check the "meters_remaining_dupe" column below.
-- -----------------------------------------------------------------------------
with dupe_movements as (
  select
    id, reference_id, fabric_id, batch_id, created_at,
    row_number() over (partition by reference_id, fabric_id order by created_at asc, id asc) as rn
  from stock_movements
  where movement_type = 'purchase' and reference_id is not null
),
keepers as (
  select reference_id, fabric_id, batch_id as keeper_batch_id
  from dupe_movements where rn = 1
),
extras as (
  select reference_id, fabric_id, batch_id as dupe_batch_id, id as dupe_movement_id
  from dupe_movements where rn > 1
)
select
  f.fabric_type,
  f.color_name,
  e.reference_id as trip_session_id,
  k.keeper_batch_id,
  kb.meters_purchased as meters_purchased_keeper,
  kb.meters_remaining as meters_remaining_keeper,
  e.dupe_batch_id,
  db.meters_purchased as meters_purchased_dupe,
  db.meters_remaining as meters_remaining_dupe,
  case
    when db.meters_remaining = db.meters_purchased then 'safe to auto-remove (nothing sold from it)'
    else 'NEEDS MANUAL REVIEW — some of this duplicate batch has already been sold'
  end as status
from extras e
join keepers k using (reference_id, fabric_id)
join stock_batches kb on kb.id = k.keeper_batch_id
join stock_batches db on db.id = e.dupe_batch_id
join fabrics f on f.id = e.fabric_id
order by status desc, f.fabric_type;


-- -----------------------------------------------------------------------------
-- SECTION 2 — SAFE AUTO-CLEANUP
--
-- Only touches duplicate batches where meters_remaining = meters_purchased
-- — i.e. nothing has ever been sold from that specific duplicate batch, so
-- removing it can't affect any sale record. Deletes the extra
-- stock_movements row(s) first, then the extra stock_batches row(s); the
-- existing trigger recalculates the fabric's stock_meters automatically
-- once the batch is gone. Wrapped in a transaction — if anything looks
-- wrong, run ROLLBACK instead of COMMIT.
--
-- Anything flagged "NEEDS MANUAL REVIEW" in Section 1 is deliberately left
-- untouched by this — see Section 4 for how to handle those by hand.
-- -----------------------------------------------------------------------------
begin;

with dupe_movements as (
  select
    id, reference_id, fabric_id, batch_id, created_at,
    row_number() over (partition by reference_id, fabric_id order by created_at asc, id asc) as rn
  from stock_movements
  where movement_type = 'purchase' and reference_id is not null
),
safe_extras as (
  select dm.id as movement_id, dm.batch_id
  from dupe_movements dm
  join stock_batches b on b.id = dm.batch_id
  where dm.rn > 1
    and b.meters_remaining = b.meters_purchased
)
delete from stock_movements where id in (select movement_id from safe_extras);

with dupe_movements as (
  select
    id, reference_id, fabric_id, batch_id, created_at,
    row_number() over (partition by reference_id, fabric_id order by created_at asc, id asc) as rn
  from stock_movements
  where movement_type = 'purchase' and reference_id is not null
),
-- Re-derive from stock_batches directly this time (the movement rows for
-- the safe ones were just deleted above): any batch created from a trip
-- close that's no longer referenced by exactly one purchase movement for
-- its (fabric_id) is an orphaned duplicate left over from the delete above.
orphaned_batches as (
  select b.id
  from stock_batches b
  where b.notes like 'From market trip:%'
    and b.meters_remaining = b.meters_purchased
    and not exists (
      select 1 from stock_movements m where m.batch_id = b.id and m.movement_type = 'purchase'
    )
)
delete from stock_batches where id in (select id from orphaned_batches);

-- Review the output of this SELECT before committing — it should now be
-- empty for anything that was auto-cleaned. Anything still listed needs
-- Section 4 (manual review) before the unique index can be created.
select 'remaining duplicates after cleanup:' as note;
select
  reference_id, fabric_id, count(*) as movement_count
from stock_movements
where movement_type = 'purchase' and reference_id is not null
group by reference_id, fabric_id
having count(*) > 1;

-- If the query above returned no rows, this is safe:
commit;
-- If it returned rows, run this instead and move to Section 4:
-- rollback;


-- -----------------------------------------------------------------------------
-- SECTION 3 — CREATE THE UNIQUE INDEX
--
-- Only run this once Section 2's final check came back empty. This is the
-- same statement from migration_2026-07-28.sql — safe to run again if
-- you already tried it and it failed the first time.
-- -----------------------------------------------------------------------------
create unique index if not exists idx_stock_movements_purchase_dedup
  on stock_movements (reference_id, fabric_id)
  where movement_type = 'purchase' and reference_id is not null;


-- -----------------------------------------------------------------------------
-- SECTION 4 — MANUAL REVIEW (only needed if Section 1/2 flagged anything)
--
-- For a duplicate batch that's already had sales drawn from it, deleting it
-- outright isn't safe — it would leave those sale_items pointing at nothing
-- (batch_id gets set to null, which won't break anything, but the sale's
-- cost-of-goods and batch history for that line item is lost). The safer
-- fix is usually to MERGE the duplicate into the keeper batch instead of
-- deleting it:
--
--   1. Move any meters_remaining left on the duplicate batch onto the
--      keeper batch:
--        update stock_batches set meters_remaining = meters_remaining + <dupe's meters_remaining>
--        where id = '<keeper_batch_id>';
--   2. Re-point any sale_items that drew from the duplicate batch to the
--      keeper batch (only correct if both batches have the same
--      cost_per_meter — check this first, since unit_cost on those sale
--      rows was already copied at time of sale and won't change):
--        update sale_items set batch_id = '<keeper_batch_id>' where batch_id = '<dupe_batch_id>';
--   3. Re-point the corresponding 'sale' stock_movements rows the same way:
--        update stock_movements set batch_id = '<keeper_batch_id>' where batch_id = '<dupe_batch_id>';
--   4. Zero out and delete the now-empty duplicate:
--        update stock_batches set meters_remaining = 0 where id = '<dupe_batch_id>';
--        delete from stock_movements where batch_id = '<dupe_batch_id>' and movement_type = 'purchase';
--        delete from stock_batches where id = '<dupe_batch_id>';
--
-- Fill in the actual IDs from Section 1's output for each flagged row, and
-- double-check the cost_per_meter match in step 2 before running it — if
-- the keeper and duplicate batch have different costs, merging would
-- quietly change historical profit numbers for those sales. If in doubt,
-- leave a flagged pair alone rather than merge it; it won't block Section
-- 3 for the other, already-clean rows once resolved separately.
-- -----------------------------------------------------------------------------
