-- =============================================================================
-- SCHEMA v5 — Supplier GPS pin
--
-- Adds the same "capture current location" pattern already used for
-- wholesale buyer addresses (see `wholesale_accounts.lat`/`lng` in
-- schema.sql) to suppliers, so a supplier's shop/stall can be found on a
-- map later, not just described in a text address line.
--
-- Safe to run on an existing database — only adds two nullable columns to
-- the `suppliers` table created in schema_v2_phase0.sql. Does not touch
-- any other table. Run this in Supabase's SQL Editor (New query → paste →
-- run), same as the other schema_v*.sql files.
-- =============================================================================

alter table suppliers add column if not exists lat double precision;
alter table suppliers add column if not exists lng double precision;
