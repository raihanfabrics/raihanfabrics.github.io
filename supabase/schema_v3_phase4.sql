-- =============================================================================
-- The Swatch Book — Schema v3 / Phase 4: Market Mode
-- Run this AFTER schema.sql and schema_v2_phase0.sql, once, in your
-- Supabase project's SQL Editor.
--
-- What this adds:
--   - shopping_sessions   a named market trip ("July 22 - Kabul Market
--                          run"), open or closed, with a free-text notes
--                          field for the trip as a whole
--   - shopping_items       each planned/discovered item within a trip, with
--                          a status (planned/purchased/partial/unavailable/
--                          skipped) and actual quantity/price once bought
--
-- Design notes:
--   - Shopping items intentionally do NOT automatically create
--     stock_batches rows. A trip can be edited/corrected while shopping;
--     turning "purchased" items into real inventory (new stock_batches +
--     stock_movements) happens as a deliberate "close out trip" action in
--     the app, not silently on every status change. This avoids partial or
--     mistaken entries polluting real inventory/cost data.
--   - This table set is intentionally offline-friendly in shape: every
--     item has a client-generated id-friendly structure and simple status
--     enum, since the app layer queues writes locally while offline and
--     replays them when back online (see README — Phase 4 uses a simple
--     outbox pattern, not a full sync library, appropriate for a single
--     shop's scale).
-- =============================================================================

create table if not exists shopping_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  notes text,
  created_by uuid references profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_shopping_sessions_status on shopping_sessions(status);

alter table shopping_sessions enable row level security;

create policy "shopping_sessions_staff_only" on shopping_sessions
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid())
  )
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid())
  );

create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references shopping_sessions(id) on delete cascade,
  fabric_id uuid references fabrics(id) on delete set null, -- null for a genuinely new "discovered" product
  fabric_type text,   -- free text, mirrors customer_requests' approach for discovered/unlinked items
  color_name text,
  planned_quantity numeric,
  status text not null default 'planned' check (
    status in ('planned', 'purchased', 'partial', 'unavailable', 'skipped')
  ),
  actual_quantity numeric,
  actual_price_per_meter numeric,
  supplier_id uuid references suppliers(id) on delete set null,
  reason text,          -- carried over from the Purchase List's priority-score reason, if seeded from there
  is_discovered boolean not null default false, -- true if added ad-hoc during the trip, not pre-planned
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shopping_items_session on shopping_items(session_id);
create index if not exists idx_shopping_items_status on shopping_items(session_id, status);

alter table shopping_items enable row level security;

create policy "shopping_items_staff_only" on shopping_items
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid())
  )
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid())
  );
