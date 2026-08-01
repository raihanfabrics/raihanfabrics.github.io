-- =============================================================================
-- SCHEMA v6 — Suppliers: only the owner can edit or delete
--
-- The original suppliers RLS policy (schema_v2_phase0.sql,
-- "suppliers_staff_only") let any signed-in staff member — owner or staff
-- — insert, read, update, or delete supplier rows. This tightens it: any
-- staff can still add a new supplier (e.g. logging one they just found)
-- and everyone can read the list, but only an owner-role profile can
-- update or delete an existing supplier row. Matches the same
-- owner-vs-staff split already used for approving/rejecting/deleting
-- wholesale accounts (see schema.sql, "wholesale_update_owner_only").
--
-- This is server-side enforcement — the app's UI already hides the
-- Edit/Delete buttons from non-owner logins (see SuppliersAdmin's
-- `canManage` prop), but that alone doesn't stop a staff account from
-- calling the API directly, so this policy is the actual enforcement.
--
-- Safe to run on an existing database. Run this in Supabase's SQL Editor
-- (New query → paste → run), same as the other schema_v*.sql files.
-- =============================================================================

drop policy if exists "suppliers_staff_only" on suppliers;

-- Any signed-in staff (owner or staff) can read the supplier list.
create policy "suppliers_select_staff" on suppliers
  for select using (
    exists (select 1 from profiles where profiles.id = auth.uid())
  );

-- Any signed-in staff can add a new supplier.
create policy "suppliers_insert_staff" on suppliers
  for insert with check (
    exists (select 1 from profiles where profiles.id = auth.uid())
  );

-- Only the owner can edit an existing supplier.
create policy "suppliers_update_owner_only" on suppliers
  for update using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'owner')
  );

-- Only the owner can delete a supplier.
create policy "suppliers_delete_owner_only" on suppliers
  for delete using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'owner')
  );
