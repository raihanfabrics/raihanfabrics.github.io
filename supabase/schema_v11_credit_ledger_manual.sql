-- =============================================================================
-- SCHEMA v11 — Credit ledger, take 2: fully manual, decoupled from sales
--
-- Supersedes schema_v10_credit_ledger.sql's account_payments table and
-- design. Per owner feedback: recording a sale (paid or not) should NEVER
-- touch the credit ledger — the ledger is its own separate, entirely
-- hand-entered record of what a wholesale account borrowed and paid back,
-- kept in the Credit Ledger tab only. The previous design derived
-- "charges" automatically from unpaid/partial sales, which mixed the two
-- systems together; this version doesn't read from `sales` at all.
--
-- If you already ran schema_v10_credit_ledger.sql, that's harmless — the
-- `account_payments` table it created is just unused now, safe to leave
-- in place or drop later. If you haven't run it yet, skip it entirely and
-- just run this file.
--
-- One table replaces it, with a `type` column distinguishing the two
-- kinds of entry:
--   'charge'  — the account borrowed/owes more (an amount added by hand,
--               not computed from any sale)
--   'payment' — the account paid some of it back
-- Running balance for an account = sum(charge amounts) - sum(payment
-- amounts), computed in the app, not stored.
--
-- Any signed-in staff can log a transaction — they're often the one
-- physically present when a buyer borrows fabric or pays something back.
--
-- Safe to run on an existing database. Run this in Supabase's SQL Editor
-- (New query → paste → run), same as the other schema_v*.sql files.
-- =============================================================================

create table if not exists account_transactions (
  id uuid primary key default gen_random_uuid(),
  wholesale_account_id uuid not null references wholesale_accounts(id) on delete cascade,
  type text not null check (type in ('charge', 'payment')),
  amount numeric not null check (amount > 0),
  occurred_at date not null default current_date,
  notes text,
  recorded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_account_transactions_account on account_transactions(wholesale_account_id);

alter table account_transactions enable row level security;

create policy "account_transactions_staff_only" on account_transactions
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid())
  )
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid())
  );
