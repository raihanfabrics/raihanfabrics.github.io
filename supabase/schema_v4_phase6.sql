-- =============================================================================
-- The Swatch Book — Schema v4 / Phase 6: AI Fabric Matching
-- Run this AFTER schema.sql, schema_v2_phase0.sql, and schema_v3_phase4.sql,
-- once, in your Supabase project's SQL Editor.
--
-- IMPORTANT CONTEXT before running this: as of Phase 6's implementation,
-- the product catalog has NO real fabric photos — only flat hex swatch
-- colors (see `fabrics.hex` from schema.sql). SigLIP embeddings are only
-- as useful as the photos feeding them; a hex swatch has no texture,
-- weave, or lighting information for a visual model to learn from. This
-- schema and the matching pipeline built on it are real and functional,
-- but will not outperform the existing Delta-E color matching until real
-- fabric photos are actually uploaded per product. See README.
--
-- What this adds:
--   - fabrics.photo_url        a real product photo (separate from `hex`,
--                               which stays as the calibrated swatch color
--                               used for the storefront and Delta-E math)
--   - fabric_embeddings         one row per fabric, storing an AI visual
--                               embedding + which model/provider produced
--                               it, so the model is swappable later
--                               (SigLIP today, DINOv2 or newer tomorrow)
--                               without changing the rest of the app
--   - match_feedback             which suggested match a merchant actually
--                               picked, for a given search — used to
--                               evaluate/improve ranking quality later
--
-- Design notes:
--   - Embeddings are stored as a plain `float8[]` column, not pgvector.
--     At this shop's scale (thousands of products, not millions),
--     brute-force cosine similarity computed in the app is fast enough —
--     consistent with the "don't overbuild for this scale" decision made
--     earlier in this project. Revisit only if the catalog grows by
--     orders of magnitude.
--   - Product photos reuse the same private-Storage-bucket pattern as
--     Phase 2's customer-request photos, for consistency.
-- =============================================================================

-- fabrics.photo_url and the fabrics_secure view update now live in
-- schema_v7_fabric_photos.sql (a required file, not optional — see that
-- file for why). Run that one first if you haven't; the two statements
-- that used to be here are safe to have run twice, so nothing extra is
-- needed if you already ran schema_v7.

create table if not exists fabric_embeddings (
  id uuid primary key default gen_random_uuid(),
  fabric_id uuid not null references fabrics(id) on delete cascade,
  model text not null,             -- e.g. 'siglip-base-patch16-224' — identifies which model produced this vector, so a future model change doesn't silently mix incompatible embeddings
  embedding float8[] not null,
  created_at timestamptz not null default now(),
  unique (fabric_id, model)         -- one embedding per fabric per model version; re-embedding with a new model adds a new row rather than overwriting history
);

create index if not exists idx_fabric_embeddings_fabric on fabric_embeddings(fabric_id);

alter table fabric_embeddings enable row level security;

create policy "fabric_embeddings_staff_only" on fabric_embeddings
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid())
  )
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid())
  );

create table if not exists match_feedback (
  id uuid primary key default gen_random_uuid(),
  query_photo_url text,             -- the customer/staff swatch photo that was searched
  selected_fabric_id uuid references fabrics(id) on delete set null,
  selected_rank integer,            -- 1 = top suggestion was picked, 2 = second, etc. — useful for judging ranking quality over time
  ai_score numeric,                 -- the hybrid score the selected match had, for later analysis
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table match_feedback enable row level security;

create policy "match_feedback_staff_only" on match_feedback
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid())
  )
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid())
  );

-- Storage bucket for fabric product photos: this used to be created here,
-- but basic photo upload in the Inventory form isn't actually an "AI
-- matching" feature — it's needed regardless of whether you ever set up
-- embeddings. It now lives in schema_v7_fabric_photos.sql, which is a
-- required step (see README), not an optional one. If you already ran an
-- earlier version of this file, that bucket already exists and
-- schema_v7's "where not exists" guard will just skip re-creating it.
