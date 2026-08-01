-- =============================================================================
-- ⚠️ SUPERSEDED — do not run this file. See schema_v11_credit_ledger_manual.sql
-- instead. The design below (deriving ledger "charges" automatically from
-- unpaid/partial sales) was replaced with a fully manual ledger, decoupled
-- from Record Sale entirely, per owner feedback. Left in place only for
-- history; if you already ran this before v11 existed, that's harmless —
-- the account_payments table it created is just unused now.
-- =============================================================================

-- =============================================================================
-- SCHEMA v10 — Credit ledger for wholesale accounts
--
-- Wholesale sales already carry a payment_status ('paid' / 'partial' /
-- 'unpaid') on the sales row — but that's a snapshot at the moment of
-- sale, not a running balance, and there was nowhere to record a payment
-- that comes in later against an older sale. This adds that: a simple
-- payments log per wholesale account. A running balance is then just
-- arithmetic, not a stored/duplicated number:
--
--   balance owed = sum(totals of that account's sales where
--                       payment_status != 'paid')
--                  - sum(account_payments.amount for that account)
--
-- That math intentionally leaves 'paid' sales out of the charge side —
-- a sale marked paid in full at the register was never credit in the
-- first place, so it shouldn't appear on the ledger at all. 'partial'
-- sales count for their FULL total (not some guessed paid portion,
-- since sales doesn't store how much of a partial payment was made at
-- sale time) — the owner logs the actual amount that came in as an
-- account_payments row, same as any later payment.
--
-- No historical backfill: past payments before this table existed
-- aren't in here, so a wholesale account's very first computed balance
-- will look larger than reality if they've already been paying down an
-- old unpaid/partial sale in cash you didn't get a chance to log. Worth
-- doing one manual "opening balance" payment entry per account (with a
-- note like "pre-ledger balance adjustment") to true things up when this
-- ships, if that applies to any of your accounts.
--
-- Any signed-in staff can log a payment (they're often the one physically
-- collecting cash/transfer from a buyer) — this isn't owner-gated the way
-- editing wholesale account master data is.
--
-- Safe to run on an existing database. Run this in Supabase's SQL Editor
-- (New query → paste → run), same as the other schema_v*.sql files.
-- =============================================================================

create table if not exists account_payments (
  id uuid primary key default gen_random_uuid(),
  wholesale_account_id uuid not null references wholesale_accounts(id) on delete cascade,
  amount numeric not null check (amount > 0),
  paid_at date not null default current_date,
  method text check (method in ('cash', 'card', 'transfer', 'other')),
  notes text,
  recorded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_account_payments_account on account_payments(wholesale_account_id);

alter table account_payments enable row level security;

create policy "account_payments_staff_only" on account_payments
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid())
  )
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid())
  );
