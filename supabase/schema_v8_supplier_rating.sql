-- =============================================================================
-- SCHEMA v8 — Supplier rating (1-10, owner only)
--
-- Adds a simple 1-10 rating column to suppliers, for the owner to track
-- overall supplier quality/reliability (not tied to any specific fabric
-- or purchase — a general "how good is this supplier to deal with"
-- number). Nullable: an un-rated supplier just shows blank in the UI,
-- not a 0.
--
-- No new RLS policy needed here — schema_v6_supplier_owner_only.sql
-- already restricts UPDATE on the suppliers table to owner-role profiles
-- only, and rating is just another column on that same row, so it's
-- already enforced server-side, not just hidden in the UI.
--
-- Safe to run on an existing database. Run this in Supabase's SQL Editor
-- (New query → paste → run), same as the other schema_v*.sql files.
-- =============================================================================

alter table suppliers add column if not exists rating smallint;

alter table suppliers add constraint suppliers_rating_range
  check (rating is null or (rating >= 1 and rating <= 10));
