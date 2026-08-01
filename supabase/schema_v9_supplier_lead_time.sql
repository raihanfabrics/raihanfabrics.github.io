-- =============================================================================
-- SCHEMA v9 — Supplier orders (lead-time tracking)
--
-- Lead time (how long after ordering does a supplier actually deliver)
-- can't be computed from stock_batches alone — a batch only records when
-- goods were *received* (purchased_at), not when they were ordered. This
-- adds a lightweight, separate log for that: log "ordered today" when you
-- place an order with a supplier (by phone/WhatsApp, or a Market Mode
-- visit where you're paying on delivery rather than walking out with the
-- goods), then "mark received" once it actually arrives. Lead time for
-- that order = received_at - ordered_at.
--
-- This does NOT retroactively backfill lead time for past purchases —
-- there's no order-placed timestamp for historical batches, only
-- purchased_at (received date). Lead-time data starts accumulating from
-- whenever this table starts being used, same as any other "we didn't
-- track this before, so we can't know it before" situation (see also the
-- lead-time/seasonality note in PurchaseList's scoring comments).
--
-- Any signed-in staff can log/receive orders — this is routine day-to-day
-- operational logging (like stock_movements), not sensitive supplier
-- master data, so it isn't owner-gated the way editing a supplier's own
-- record is (schema_v6).
--
-- Safe to run on an existing database. Run this in Supabase's SQL Editor
-- (New query → paste → run), same as the other schema_v*.sql files.
-- =============================================================================

create table if not exists supplier_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  ordered_at date not null default current_date,
  received_at date,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_supplier_orders_supplier on supplier_orders(supplier_id);

alter table supplier_orders enable row level security;

create policy "supplier_orders_staff_only" on supplier_orders
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid())
  )
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid())
  );
