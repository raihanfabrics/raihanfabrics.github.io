-- =============================================================================
-- The Swatch Book — Schema v2 / Phase 0: Business Intelligence foundation
-- Run this AFTER schema.sql, once, in your Supabase project's SQL Editor.
--
-- What this adds, and why:
--   - suppliers        who you buy fabric from
--   - warehouses        where stock physically lives (starts with just one row)
--   - stock_batches      a specific purchase of a specific fabric at a specific
--                        cost — this is what makes real profit tracking possible
--   - stock_movements    every stock change (purchase/sale/return/adjustment/
--                        transfer), so current stock is calculated, not stored
--   - sales / sale_items  a real record of what was sold, to whom, for how much
--
-- This does NOT touch fabrics, profiles, or wholesale_accounts from schema.sql.
-- It also does not add any dashboards or UI yet — this is the data foundation
-- that Phase 1 (dashboards) and Phase 2 (demand intelligence) will read from.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. SUPPLIERS
-- ---------------------------------------------------------------------------
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address_line text,
  notes text,
  created_at timestamptz not null default now()
);

alter table suppliers enable row level security;

create policy "suppliers_staff_only" on suppliers
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid())
  )
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 2. WAREHOUSES
-- One shop, one warehouse to start — but modeled as a real table now so
-- Phase 4+ (multi-branch) never needs a schema change, only a new row.
-- ---------------------------------------------------------------------------
create table if not exists warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table warehouses enable row level security;

create policy "warehouses_staff_only" on warehouses
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid())
  )
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid())
  );

insert into warehouses (name, is_default)
select 'Main Shop', true
where not exists (select 1 from warehouses);

-- ---------------------------------------------------------------------------
-- 3. STOCK BATCHES
-- A specific purchase of a specific fabric: X meters bought from supplier Y
-- at cost Z on date D. Profit on a sale is calculated against the cost of
-- the batch that sale actually drew from — not today's price for that
-- fabric. This is what makes "profit" and "profit margin" numbers correct
-- even as purchase prices change over time.
-- ---------------------------------------------------------------------------
create table if not exists stock_batches (
  id uuid primary key default gen_random_uuid(),
  fabric_id uuid not null references fabrics(id) on delete restrict,
  warehouse_id uuid not null references warehouses(id) on delete restrict,
  supplier_id uuid references suppliers(id) on delete set null,
  cost_per_meter numeric not null check (cost_per_meter >= 0),
  meters_purchased numeric not null check (meters_purchased > 0),
  meters_remaining numeric not null check (meters_remaining >= 0),
  purchased_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_batches_fabric on stock_batches(fabric_id);
create index if not exists idx_stock_batches_remaining on stock_batches(fabric_id, meters_remaining)
  where meters_remaining > 0;

alter table stock_batches enable row level security;

create policy "stock_batches_staff_only" on stock_batches
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid())
  )
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid())
  );

-- fabrics.stock_meters is what the Inventory screen (and the Dashboard's
-- low-stock/out-of-stock/reorder widgets) actually display — but every
-- OTHER stock-moving feature (Record Sale, closing a Market Mode trip)
-- only ever touches stock_batches.meters_remaining, and nothing kept
-- fabrics.stock_meters in sync with it. A sale or a purchase would
-- correctly record itself in stock_batches, but the number staff
-- actually sees never moved — recording a sale looked like it "did
-- nothing" to the Dashboard, and closing a trip could report "N items
-- added to inventory" while Inventory itself stayed unchanged. This
-- trigger recalculates a fabric's stock_meters as the sum of
-- meters_remaining across its batches every time a batch is
-- inserted/updated/deleted, so it can never drift out of sync again.
--
-- Note: this means once a fabric has any batch history, its
-- stock_meters becomes fully computed from that history — manually
-- typing a new number into the Inventory field will get overwritten the
-- next time a sale or purchase touches that fabric. That's intentional
-- (the batches are the source of truth for anything with real purchase
-- history), and matches how local/demo mode already behaved.
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

-- ---------------------------------------------------------------------------
-- 4. STOCK MOVEMENTS
-- Every change to stock, of any kind, is one row here. Current stock for a
-- fabric is SUM(meters_remaining) across its stock_batches — which itself is
-- kept correct by movements decrementing/incrementing meters_remaining.
-- This table is the audit trail: it answers "what happened to this fabric's
-- stock, and when" for dead-stock/aging/reporting purposes.
-- ---------------------------------------------------------------------------
create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  fabric_id uuid not null references fabrics(id) on delete restrict,
  batch_id uuid references stock_batches(id) on delete set null,
  warehouse_id uuid not null references warehouses(id) on delete restrict,
  movement_type text not null check (
    movement_type in ('purchase', 'sale', 'return', 'adjustment', 'transfer')
  ),
  meters numeric not null,  -- positive = stock added, negative = stock removed
  reference_id uuid,        -- e.g. the sale_id or purchase this movement came from
  reason text,               -- required for 'adjustment', optional otherwise
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_movements_fabric on stock_movements(fabric_id, created_at);
create index if not exists idx_stock_movements_type on stock_movements(movement_type, created_at);

alter table stock_movements enable row level security;

create policy "stock_movements_staff_only" on stock_movements
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid())
  )
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 5. SALES (invoice header)
-- ---------------------------------------------------------------------------
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique,
  sold_at timestamptz not null default now(),
  warehouse_id uuid not null references warehouses(id) on delete restrict,
  salesperson_id uuid references profiles(id) on delete set null,
  customer_name text,
  customer_phone text,
  wholesale_account_id uuid references wholesale_accounts(id) on delete set null,
  payment_method text check (payment_method in ('cash', 'card', 'transfer', 'other')),
  payment_status text not null default 'paid' check (payment_status in ('paid', 'partial', 'unpaid')),
  discount_total numeric not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

-- invoice_number is auto-generated (INV-000001, INV-000002, ...) — the app
-- never sets it directly. A sequence + trigger fill it in on insert, so
-- staff never have to think about invoice numbering and it can't collide.
create sequence if not exists sales_invoice_seq start 1;

create or replace function set_invoice_number()
returns trigger
language plpgsql
as $$
begin
  if new.invoice_number is null then
    new.invoice_number := 'INV-' || lpad(nextval('sales_invoice_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_invoice_number on sales;
create trigger trg_set_invoice_number
  before insert on sales
  for each row
  execute function set_invoice_number();

create index if not exists idx_sales_sold_at on sales(sold_at);
create index if not exists idx_sales_wholesale_account on sales(wholesale_account_id);

alter table sales enable row level security;

create policy "sales_staff_only" on sales
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid())
  )
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 6. SALE ITEMS (invoice line items)
-- unit_cost is copied from the stock_batch at time of sale, so historical
-- profit stays correct even if that batch's cost or the fabric's price
-- changes later. This is the single most important field for every profit/
-- margin report in Phase 1.
-- ---------------------------------------------------------------------------
create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  fabric_id uuid not null references fabrics(id) on delete restrict,
  batch_id uuid references stock_batches(id) on delete set null,
  meters numeric not null check (meters > 0),
  unit_price numeric not null check (unit_price >= 0),
  unit_cost numeric not null check (unit_cost >= 0),
  discount numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_sale_items_sale on sale_items(sale_id);
create index if not exists idx_sale_items_fabric on sale_items(fabric_id);

alter table sale_items enable row level security;

create policy "sale_items_staff_only" on sale_items
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid())
  )
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid())
  );

-- =============================================================================
-- NOTES FOR PHASE 1 (dashboards) — not implemented yet, just documented here
-- so the intent behind these tables is clear:
--
--   - Current stock for a fabric  = sum(meters_remaining) from stock_batches
--                                    where fabric_id = X
--   - Profit on a sale_item        = (unit_price - unit_cost) * meters - discount
--   - Inventory valuation           = sum(meters_remaining * cost_per_meter)
--                                    across all stock_batches
--   - Dead stock                    = fabrics with no 'sale' stock_movement
--                                    in the last N days (N configurable)
--
-- All of these are plain SQL aggregations at this data volume — no
-- materialized views or pre-aggregation needed yet.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 7. CUSTOMER REQUESTS (Phase 2: Demand Intelligence)
-- Records what a customer wanted but couldn't buy — either because a known
-- fabric is temporarily out of stock, or because it's something the shop
-- has never carried. This is deliberately separate from `fabrics`: a
-- never-stocked request often has no real fabric_id to link to, just a
-- photo and a free-text description.
--
-- Dedup is rule-based, not AI-based (consistent with keeping this phase
-- rule-based): a new request is matched against open requests with the
-- same normalized fabric_type + color_name. A match increments
-- request_count and updates last_requested_at instead of creating a new
-- row. This is a simple, explainable heuristic — it will miss matches
-- with inconsistent free-text spelling, which is an acceptable tradeoff
-- for this phase; Phase 6's fabric matching may improve this later by
-- matching on photo similarity instead of just typed text.
-- ---------------------------------------------------------------------------
create table if not exists customer_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('out_of_stock', 'never_stocked', 'special_order')),
  fabric_id uuid references fabrics(id) on delete set null, -- set only when linked to a known out-of-stock fabric
  fabric_type text,     -- free text; may duplicate fabric_id's type, or stand alone for never-stocked items
  color_name text,
  width numeric,
  quantity_requested numeric,
  photo_url text,       -- swatch photo, stored in the 'customer-request-photos' Storage bucket (cheaper than storing data URLs in the DB — see README)
  customer_name text,
  customer_phone text,
  warehouse_id uuid references warehouses(id) on delete set null,
  notes text,
  request_count integer not null default 1,
  status text not null default 'open' check (status in ('open', 'fulfilled', 'dismissed')),
  first_requested_at timestamptz not null default now(),
  last_requested_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  notified_customer boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_requests_status on customer_requests(status);
create index if not exists idx_customer_requests_match on customer_requests(lower(fabric_type), lower(color_name))
  where status = 'open';

alter table customer_requests enable row level security;

create policy "customer_requests_staff_only" on customer_requests
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid())
  )
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid())
  );

-- Storage bucket for swatch photos attached to customer requests. Kept
-- private (not public) since these are internal shop records, not
-- storefront-facing images — the app fetches photos via signed URLs.
insert into storage.buckets (id, name, public)
select 'customer-request-photos', 'customer-request-photos', false
where not exists (select 1 from storage.buckets where id = 'customer-request-photos');

create policy "customer_request_photos_staff_read" on storage.objects
  for select using (
    bucket_id = 'customer-request-photos'
    and exists (select 1 from profiles where profiles.id = auth.uid())
  );

create policy "customer_request_photos_staff_write" on storage.objects
  for insert with check (
    bucket_id = 'customer-request-photos'
    and exists (select 1 from profiles where profiles.id = auth.uid())
  );

create policy "customer_request_photos_staff_delete" on storage.objects
  for delete using (
    bucket_id = 'customer-request-photos'
    and exists (select 1 from profiles where profiles.id = auth.uid())
  );
