-- =============================================================================
-- MIGRATION — 2026-07-31
-- Run this once in your Supabase project's SQL Editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PARTIAL PAYMENTS — Record Sale now captures how much was actually paid
--    when payment status is "partial", so the receipt can show
--    Total / Paid / Remaining instead of just the total.
-- -----------------------------------------------------------------------------
alter table sales add column if not exists amount_paid numeric;
comment on column sales.amount_paid is 'Only set when payment_status = ''partial''. The amount handed over at sale time; the remaining balance is total - amount_paid, shown on the receipt and tracked the same way any other partial/unpaid balance is (Credit Ledger, for wholesale accounts).';

-- -----------------------------------------------------------------------------
-- 2. REALTIME — Two more spots that needed a manual refresh to show
--    changes made from another device/tab:
--      - A new wholesaler signup (or an approval/rejection) only appeared
--        in the owner's account-requests list, and the pending-count
--        badge, after a manual refresh.
--      - A credit ledger entry (charge/payment) logged from another
--        device only showed up here after a refresh too.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'wholesale_accounts'
  ) then
    alter publication supabase_realtime add table wholesale_accounts;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'account_transactions'
  ) then
    alter publication supabase_realtime add table account_transactions;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 3. SETTLE BALANCE — "Settle Balance" (Credit Ledger) wipes an account's
--    charge/payment history. The app already password-confirms this before
--    calling delete, but per this project's usual defense-in-depth pattern
--    (UI gating + RLS), it's restricted at the database level too: any
--    signed-in staff member can still add/view entries as before, but only
--    an owner-role profile can delete them.
-- -----------------------------------------------------------------------------
drop policy if exists "account_transactions_staff_only" on account_transactions;

create policy "account_transactions_staff_read_write" on account_transactions
  for select using (
    exists (select 1 from profiles where profiles.id = auth.uid())
  );

create policy "account_transactions_staff_insert" on account_transactions
  for insert with check (
    exists (select 1 from profiles where profiles.id = auth.uid())
  );

create policy "account_transactions_owner_delete" on account_transactions
  for delete using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'owner')
  );
