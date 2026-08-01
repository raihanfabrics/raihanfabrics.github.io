-- =============================================================================
-- MIGRATION — 2026-07-28 — Prevent Market Mode trip closes from double-
-- counting inventory (e.g. "purchased 30m" showing up as 60m after closing,
-- reopening a closed trip, and closing again).
-- Run this once in your Supabase project's SQL Editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Closing a trip used to check "does a stock_movement already exist for this
-- session+fabric" with a plain SELECT before deciding whether to create a new
-- stock_batch. That check-then-insert has a race: two overlapping closes
-- (an impatient second tap on a slow connection, or closing again after
-- coming back to a trip later) can both pass the check before either has
-- written anything, and both go on to create a batch — doubling the meters
-- added to inventory.
--
-- This unique index makes that impossible at the database level: only one
-- 'purchase' stock_movement can ever exist for a given (trip, fabric) pair.
-- The updated closeShoppingSession (see src/lib/supabaseApi.js) now inserts
-- this row FIRST, before creating the stock_batch, and treats a unique-
-- violation as "already handled" rather than an error — so a second close
-- attempt can never create a second batch for the same item, no matter how
-- it's retried.
-- -----------------------------------------------------------------------------
create unique index if not exists idx_stock_movements_purchase_dedup
  on stock_movements (reference_id, fabric_id)
  where movement_type = 'purchase' and reference_id is not null;
