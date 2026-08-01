-- =============================================================================
-- The Swatch Book — Supabase schema
-- Run this once in your Supabase project's SQL Editor (Dashboard → SQL Editor
-- → New query → paste this whole file → Run).
-- =============================================================================

-- =============================================================================
-- PHASE 1: CREATE ALL TABLES (Ordered by dependency)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES (staff accounts — owner / staff roles)
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  name text not null,
  role text not null check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. FABRICS (products)
-- ---------------------------------------------------------------------------
create table if not exists fabrics (
  id uuid primary key default gen_random_uuid(),
  fabric_type text not null,
  color_name text not null,
  hex text not null,
  width integer not null,
  gsm integer not null,
  retail_price numeric not null,
  wholesale_price numeric not null,
  -- numeric, not integer: stock is measured in meters off a bolt and is
  -- routinely fractional (e.g. 45.5m). An integer column silently rejected
  -- any edit that saved a fractional value — see CHANGES readme.
  stock_meters numeric not null default 0,
  sku text not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. WHOLESALE ACCOUNTS
-- ---------------------------------------------------------------------------
create table if not exists wholesale_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  business_name text not null,
  owner_name text not null,
  phone text not null unique,
  address_line text,
  landmark text,
  lat double precision,
  lng double precision,
  requested_at date not null default current_date
);


-- =============================================================================
-- PHASE 2: ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================================================
alter table profiles enable row level security;
alter table fabrics enable row level security;
alter table wholesale_accounts enable row level security;


-- =============================================================================
-- PHASE 3: CREATE POLICIES, FUNCTIONS, AND VIEWS
-- =============================================================================

-- --- Profiles Policies -----------------------------------------------------
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

-- --- Fabrics Policies ------------------------------------------------------
-- Every visitor (including logged-out ones) can read fabric ROWS — this is
-- fine because the sensitive part is one COLUMN (wholesale_price), not row
-- existence. Column-level hiding is handled by the fabrics_secure view
-- below, which the app always queries instead of this base table for
-- reading. See the note further down for why this two-layer approach is
-- needed (RLS alone can only filter rows, not columns).
create policy "fabrics_select_all" on fabrics
  for select using (true);

-- Any signed-in staff account (owner or staff role) can add new fabric
-- intake to inventory.
create policy "fabrics_insert_staff" on fabrics
  for insert with check (
    exists (select 1 from profiles where profiles.id = auth.uid())
  );

-- Editing and deleting an existing inventory item is OWNER-ONLY. Staff
-- accounts can add stock but shouldn't be able to change or remove
-- existing items — this is enforced here, at the database, not just by
-- hiding the buttons in the UI (the UI also hides them, in AdminPanel, but
-- that alone would not stop a staff account from calling the API directly).
create policy "fabrics_update_owner_only" on fabrics
  for update using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'owner')
  )
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'owner')
  );

create policy "fabrics_delete_owner_only" on fabrics
  for delete using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'owner')
  );

-- --- Wholesale Accounts Policies -------------------------------------------
-- A buyer can insert their own account row right after signing up (their
-- auth session already exists at that point) and can always read their own
-- row (to check approval status when logging in).
create policy "wholesale_insert_own" on wholesale_accounts
  for insert with check (auth.uid() = auth_user_id);

create policy "wholesale_select_own" on wholesale_accounts
  for select using (auth.uid() = auth_user_id);

-- Staff (owner or staff role) can view every wholesale account.
create policy "wholesale_select_staff" on wholesale_accounts
  for select using (
    exists (select 1 from profiles where profiles.id = auth.uid())
  );

-- Only the OWNER role (not staff) can approve/reject — i.e. update status.
create policy "wholesale_update_owner_only" on wholesale_accounts
  for update using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'owner')
  );

-- --- Column-level protection for wholesale_price -------------------------
-- RLS filters ROWS, not individual columns, so a plain "select *" on the
-- base table would leak wholesale_price to every visitor even with the
-- policies above. To actually hide it, the app always reads through this
-- view instead of the raw table (see src/lib/supabaseApi.js — fetchProducts
-- queries `fabrics_secure`, never `fabrics` directly):
create or replace function is_wholesale_authorized()
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    exists (select 1 from profiles where profiles.id = auth.uid())
    or exists (
      select 1 from wholesale_accounts
      where wholesale_accounts.auth_user_id = auth.uid()
        and wholesale_accounts.status = 'approved'
    );
$$;

create or replace view fabrics_secure
with (security_invoker = true) as
select
  id, fabric_type, color_name, hex, width, gsm, retail_price, stock_meters, sku, created_at,
  case when is_wholesale_authorized() then wholesale_price else null end as wholesale_price
from fabrics;

grant select on fabrics_secure to anon, authenticated;


-- =============================================================================
-- PHASE 4: SEED DATA — sample fabrics so the storefront isn't empty on first run.
-- Delete or edit these once you've added your real inventory.
-- =============================================================================
insert into fabrics (fabric_type, color_name, hex, width, gsm, retail_price, wholesale_price, stock_meters, sku) values
  ('Cotton', 'Ivory Bone', '#EDE7D9', 44, 120, 180, 140, 320, 'CTN-IVB-44'),
  ('Cotton', 'Dust Rose', '#C9A29A', 44, 120, 190, 145, 210, 'CTN-DRS-44'),
  ('Georgette', 'Marigold', '#E3A028', 44, 60, 260, 205, 140, 'GRG-MRG-44'),
  ('Silk', 'Antique Gold', '#B8923F', 44, 80, 620, 510, 40, 'SLK-AGD-44'),
  ('Linen', 'Natural Flax', '#D8C9A3', 58, 160, 310, 245, 130, 'LIN-FLX-58')
on conflict (sku) do nothing;

-- =============================================================================
-- MANUAL STEP — creating your first staff (owner) account
-- =============================================================================
-- 1. In the Supabase Dashboard, go to Authentication → Users → Add user.
--    Email:    owner@staff.swatchbook.local   (this exact pattern matters —
--              see the note in src/lib/supabaseApi.js for why)
--    Password: choose a real password, not the demo one from before.
-- 2. Copy the new user's UUID (shown in the Users table).
-- 3. Run this, swapping in that UUID:
--
--    insert into profiles (id, username, name, role)
--    values ('<paste-uuid-here>', 'owner', 'Shop Owner', 'owner');
--
-- Repeat with a different email/username (e.g. staff1@staff.swatchbook.local)
-- and role 'staff' for additional staff logins.
-- =============================================================================
