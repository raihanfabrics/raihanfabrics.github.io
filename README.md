# The Swatch Book — Textile Merchant App

**Starting a new copy of this project folder in VS Code?** Read
[`SETUP.md`](./SETUP.md) first — it's the step-by-step checklist
(install → env file → test locally → connect git → deploy → the
hard-refresh-after-deploy gotcha that's caught us a couple of times).

A web app for a textile merchant: customer storefront, staff swatch matcher
(camera-based color matching), a B2B wholesale account system with
approval-gated pricing, and an installable offline-capable PWA.

## Product direction

This project is evolving from a storefront + color-matching app into a full
textile business intelligence and procurement platform — sales/profit
dashboards, product/customer/supplier analytics, demand tracking (what
customers wanted but couldn't buy), a smart purchase list, a market-mode
shopping assistant, and eventually AI-based fabric image matching. See
**Roadmap** below for the current phase and what's built vs. planned.

The plan is being built in phases on top of a reliable data foundation
rather than all at once — see `supabase/schema_v2_phase0.sql` for the first
step of that foundation.

## Quick start (works immediately, no setup needed)

1. Make sure [Node.js](https://nodejs.org) (LTS version) is installed. Check with:
   ```
   node --version
   npm --version
   ```

2. Open this folder in VS Code (`File → Open Folder…`, or from a terminal
   inside this folder run `code .`).

3. Open a terminal in VS Code (`Terminal → New Terminal`) and install
   dependencies:
   ```
   npm install
   ```

4. Start the dev server:
   ```
   npm run dev
   ```

5. Open the URL it prints (usually `http://localhost:5173`) in your browser.

**This works right away** without any Supabase setup — the app automatically
runs on a local, offline data layer (see "Two ways this app runs" below).

## Demo login credentials (local mode)

**Staff / admin** (click "Staff Login" in the footer):
- Owner (full access): username `owner`, password `owner123`
- Staff (inventory only, no wholesale approval): username `staff1`, password `staff123`

**Wholesale buyer** (click "Wholesale Login" on the storefront):
- Phone `+93 70 123 4567`, password `meera123` (Meera Boutique — pre-approved demo account)

These only exist in **local mode** (see below) — once you connect Supabase,
you create your own real accounts instead.

## Two ways this app runs

This app has two interchangeable backends, switched automatically based on
whether you've added Supabase credentials:

### 1. Local mode (default, zero setup)
Data lives in your browser's `localStorage`. Fully functional, fully
offline, resets only if you clear browser data. Good for trying the app,
demos, or single-device use. This is what runs if you skip the Supabase
section below entirely.

Local mode also seeds one opening stock batch per demo product (cost
approximated as 80% of wholesale price, since the original demo data never
recorded a real purchase cost) so the Phase 1 Dashboard has real numbers to
show immediately, without needing to record a sale first.

### 2. Supabase mode (real backend, free tier)
A real Postgres database + authentication, so data is shared across
devices/staff and actually persists properly. Setup:

**If you've never used the Supabase CLI before**, do this first — steps 7
and onward below need it. In the same terminal/folder where you already
ran `npm install` for this app:
```
npm install supabase --save-dev
```
This installs the CLI as a project tool, not a global command — so from
here on, every `supabase ...` command (here and in the "Optional" sections
further down) needs `npx` in front of it, e.g. `npx supabase functions
deploy delete-wholesale-account`. Then:
```
npx supabase login
```
opens a browser tab to sign in with your Supabase account (one-time). Then
link this folder to your actual project — find `YOUR_PROJECT_REF` in the
dashboard under **Settings → General → Reference ID** (it's also the
random string in your project's dashboard URL):
```
npx supabase link --project-ref YOUR_PROJECT_REF
```
You do **not** need Docker installed for any of this — deploying a
function falls back to Supabase's API automatically if Docker isn't on
your machine. Docker's only needed for running functions *locally*, which
this project doesn't require.

1. Create a free project at [supabase.com](https://supabase.com).
2. **Turn off "Confirm email"** — go to **Authentication → Providers →
   Email**, and switch **Confirm email** off, then save. This is required,
   not optional: staff logins and wholesale buyer logins both use a
   synthetic internal email address (see "Auth note" below) that nobody
   can actually receive mail at, so if confirmation is required, nobody
   can ever get a real session — which is what was making "Become a
   Buyer" fail with "Something went wrong" (the signup itself succeeded,
   but the follow-up step that creates the buyer's account record needs
   an active session, and there wasn't one yet).
3. In your project dashboard, go to **SQL Editor → New query**, paste the
   entire contents of `supabase/schema.sql` from this project, and run it.
4. Then run `supabase/schema_v2_phase0.sql` the same way (New query, paste,
   run). This adds the suppliers/warehouses/stock-batch/sales/customer-
   request tables that the BI and demand-intelligence features read from,
   and creates a private Storage bucket (`customer-request-photos`) for
   swatch photos — no separate Storage setup needed.
5. Then run `supabase/schema_v3_phase4.sql` (same New query → paste → run
   process). This adds the `shopping_sessions` / `shopping_items` tables
   Market Mode uses.
6. Then run `supabase/schema_v5_supplier_gps.sql` (same process). Adds
   `lat`/`lng` columns to `suppliers` so a supplier's location can be
   pinned the same way wholesale buyer addresses already are.
7. Then run `supabase/schema_v6_supplier_owner_only.sql` (same process).
   Tightens supplier permissions so only the owner role can edit or
   delete a supplier (any staff can still add one).
8. Then run `supabase/schema_v7_fabric_photos.sql` (same process). Creates
   the `fabric-photos` Storage bucket that the Inventory photo upload
   field needs — without this step, uploading a product photo fails with
   "Could not upload photo."
9. Deploy the wholesale-account delete Edge Function so the **Delete
   account** button in Wholesale Buyers works:
   ```
   npx supabase functions deploy delete-wholesale-account
   ```
   No extra secrets needed beyond what Supabase provides automatically —
   unlike `embed-fabric`/`match-fabric`/`generate-insights` below, this
   one doesn't call any external API.
10. Go to **Settings → API** and copy your **Project URL** and **anon
    public key**.
11. In this project folder, copy `.env.example` to a new file named
    `.env`, and paste in those two values:
    ```
    VITE_SUPABASE_URL=https://your-project.supabase.co
    VITE_SUPABASE_ANON_KEY=your-anon-key-here
    ```
12. Create your first staff (owner) login — follow the instructions at the
    bottom of `supabase/schema.sql` (Authentication → Users → Add user,
    then one SQL insert into `profiles`).
13. Restart `npm run dev`. The app now talks to your real Supabase
    project.

**Why wholesale pricing is actually hidden, not just UI-hidden:** the schema
includes a `fabrics_secure` view that has Postgres itself null out the
wholesale price column for anyone who isn't staff or an approved wholesale
buyer. Even someone reading raw API responses in browser dev tools won't
see wholesale prices unless they're genuinely authorized — this is real
database-level security, not a hidden button.

**Auth note:** to keep staff usernames and wholesale phone-number logins
free (no SMS/Twilio cost), both are mapped internally to a synthetic email
address for Supabase's free email+password auth. You and your buyers never
see this — you type a username or phone number as normal. Details in
`src/lib/supabaseApi.js` if you're curious.

### Optional: AI fabric matching (Phase 6)

Everything else in this app runs the moment you follow the steps above.
**AI fabric matching does not** — it needs real setup and, more
importantly, real fabric photos before it's worth turning on at all. Skip
this section entirely until you're ready for both; the app works fully
without it (Delta-E color matching keeps working exactly as before).

1. Run `supabase/schema_v4_phase6.sql` (same New query → paste → run
   process as the other schema files). Adds `fabrics.photo_url`, the
   `fabric_embeddings` and `match_feedback` tables, and a `fabric-photos`
   Storage bucket.
2. Create a [Replicate](https://replicate.com) account (or another hosted
   SigLIP inference provider — Replicate is what the current code is
   written against, see `src/lib/embeddingProvider.js`) and get an API
   token.
3. Find a SigLIP model version on Replicate and copy its version hash.
   Replace `REPLACE_WITH_ACTUAL_REPLICATE_MODEL_VERSION` with that hash in
   **both** `supabase/functions/embed-fabric/index.ts` and
   `supabase/functions/match-fabric/index.ts`. This was deliberately left
   as a placeholder rather than guessed — a wrong-looking-right hash fails
   silently with bad embeddings instead of a clear error.
4. Set the token as a secret on your Supabase project:
   ```
   npx supabase secrets set REPLICATE_API_TOKEN=your-token-here
   ```
5. Deploy both Edge Functions:
   ```
   npx supabase functions deploy embed-fabric
   npx supabase functions deploy match-fabric
   ```
6. **Upload real fabric photos.** In the Inventory admin tab, edit a
   fabric and use the new "Fabric photo" field (separate from the swatch
   color) to upload an actual photo of the fabric, then click "Generate
   AI embedding." Repeat for as many fabrics as you want AI matching to
   cover — fabrics without a photo/embedding will keep using Delta-E-only
   matching automatically, with the Swatch Matcher UI saying so plainly.

Without real photos, this pipeline is fully functional but has nothing
meaningful to compare — a hex swatch has no texture or weave information
for a visual model to use, so results won't beat plain color matching
until genuine photos exist.

### Optional: AI business insights (Phase 7)

Much lighter setup than Phase 6 — no model hosting or photos needed, just
an API key. Skip this and the Dashboard's Insights panel will show plain
(already-true) fact sentences instead of AI-phrased ones; nothing else in
the app depends on this.

1. Get an API key from [console.anthropic.com](https://console.anthropic.com).
2. Set it as a secret on your Supabase project:
   ```
   npx supabase secrets set ANTHROPIC_API_KEY=your-key-here
   ```
3. Deploy the Edge Function:
   ```
   npx supabase functions deploy generate-insights
   ```

That's it — the Dashboard tab's Insights panel will start using it
automatically. It also needs a shop with at least a few weeks of real
recorded sales before it has anything to say at all; see Roadmap → Phase 7
for why that's by design, not a bug.

## Installing as an app (PWA)

Once running (`npm run dev` or a deployed build), most browsers show an
"Install" option (desktop: address bar icon; mobile: "Add to Home Screen").
Installed, it opens like a native app and the catalog stays browsable
offline after the first load — good for spotty shop wifi.

**What works offline:**
- Browsing previously-loaded fabrics, colors, and prices
- Color matching (Delta-E math + camera) — always fully offline, no network involved
- The cart — stored locally
- **Market Mode** (Phase 4) — the one admin screen built to expect a
  dropped connection: updating an item's status, adding a discovered
  item, and editing trip notes all queue locally and sync automatically
  once back online. See Roadmap → Phase 4 for how.

**What needs a connection:**
- First load of the app
- Submitting a wholesale request, admin edits, approving/rejecting accounts
  (in Supabase mode)
- Sending an order via WhatsApp (opens WhatsApp itself)
- Every other admin screen (Dashboard, Record Sale, Log Request, etc.) —
  these assume a live connection and don't queue writes offline. Starting
  a new Market Mode trip and closing a trip also need a connection; only
  the day-to-day status updates within an already-started trip work
  offline.

## Roadmap

Development is happening in phases, each building on a reliable foundation
rather than jumping straight to the most visible features. Sized for a
single shop with a catalog of thousands of products — not a
multi-tenant or millions-of-products deployment, so no vector database,
job queue, or pre-aggregation layer is used until/unless it's actually
needed.

- **Phase 0 — Data foundation (done).** Added suppliers, warehouses,
  batch-level stock with real purchase cost, a full stock-movement audit
  trail, and real sales/sale-item records, with auto-generated invoice
  numbers (`INV-000001`, ...). See `supabase/schema_v2_phase0.sql`.
- **Phase 1 — Core BI dashboard (done).** A staff-only **Record Sale**
  form and a **Dashboard** tab, both under Admin. *Dashboard* is
  **owner-only** — see Notes → "Owner vs. staff access" — *Record Sale*
  remains open to any staff login, since recording a sale is routine
  day-to-day work, not something that needs owner-level access.
  - *Record Sale* is the only way sales enter the system — it deliberately
    does **not** happen automatically from the WhatsApp checkout flow,
    since a WhatsApp order reflects intent to order, not a confirmed,
    paid sale. Staff enter what was actually sold, for how much, and how
    it was paid; cost is resolved automatically from stock batches
    (oldest purchase first) so profit is calculated against what was
    actually paid for those meters.
  - *Dashboard* shows today/week/month/year revenue, total profit, profit
    margin, average invoice value, inventory valuation, active customers,
    low/out-of-stock/dead-stock counts, a 14-day revenue trend, best
    sellers, most profitable fabrics, dead stock, and reorder suggestions
    ranked by recent sales velocity.
  - Dead stock is currently defined as "no sale in 90+ days" and low
    stock as "under 20 meters" — both are simple constants in
    `Dashboard` in `TextileApp.jsx` for now rather than a settings UI;
    worth revisiting once real sales data shows whether those thresholds
    make sense for this shop.
  - All aggregation happens in the app, not in SQL views — reasonable at
    this data volume (single shop, thousands of products) and simpler to
    read; revisit if it ever needs to scale further.
- **Phase 2 — Demand intelligence (done).** Two new admin tabs: **Log
  Request** and **Demand**.
  - *Log Request* lets staff record a fabric a customer wanted but
    couldn't buy — out of stock, never stocked, or special order — with
    an optional photo, quantity, width, and customer contact info.
  - Repeated requests for the same fabric type + color (case-insensitive)
    automatically increment a count instead of creating a duplicate row,
    rather than requiring staff to search for an existing entry first.
    This is a simple rule-based text match, not AI — it will miss
    inconsistent spelling (e.g. "Navy" vs "Dark Blue" for the same
    fabric), which is an acceptable tradeoff for this phase.
  - *Demand* shows open-request counts, a most-requested list, and an
    **estimated lost revenue** figure (quantity × retail price × times
    requested — an explainable sizing estimate, not a precise number, and
    labeled as such in the UI). Staff can mark a request Fulfilled or
    Dismiss it.
  - The Dashboard's reorder suggestions now factor in open customer
    requests alongside sales velocity, so a product with little sales
    history but real customer demand still surfaces as worth reordering.
  - Swatch photos are stored in a private Supabase Storage bucket
    (`customer-request-photos`), not in the database — cheaper at scale
    than storing images as data URLs in a table, and keeps the database
    lean. The app fetches them via short-lived signed URLs. **Local mode
    has no Storage bucket**, so it falls back to storing photos as data
    URLs directly in `localStorage` — fine for a single-device demo, but
    it's exactly the tradeoff Supabase mode avoids; don't rely on local
    mode for a real photo library.
- **Phase 3 — Procurement intelligence (done).** Two new admin tabs:
  **Purchase List** and **Suppliers**.
  - *Suppliers* is simple CRUD (name, phone, address, notes) over the
    `suppliers` table added in Phase 0 — it had no UI until now. Any
    staff can add a supplier; only the **owner** can edit or delete an
    existing one (`schema_v6_supplier_owner_only.sql`), mirroring the
    same owner-only rule wholesale accounts already use. Each supplier
    can also have a **GPS pin** captured with one tap (same
    "stand there and tap the button" pattern as the wholesale buyer
    signup form), shown as an "Open in Maps" link in the table instead of
    just a typed address line. Requires `schema_v5_supplier_gps.sql` in
    Supabase mode (see Setup); optional per-supplier, not required.
  - *Purchase List* auto-generates a ranked list of what to buy, combining
    stock urgency, sales velocity (last 30 days), open customer requests
    (Phase 2), and profit margin into an explainable **priority score**.
    Each row shows the score, a plain-language reason (e.g. "out of
    stock · 40m sold in last 30 days · 2 customer requests"), a suggested
    quantity, an estimated budget, and — from **supplier memory** — the
    preferred supplier and last price/date, derived from each fabric's
    most recent `stock_batches` row rather than a separate table. Staff
    can also add any fabric manually via a **type-to-search** field (by
    SKU, color, or fabric type) rather than a single long dropdown —
    matters once the catalog is in the hundreds of SKUs, where scrolling
    a `<select>` stops being practical.
  - **Deliberately not included**: lead time and seasonality, which the
    original spec lists as scoring factors. Lead time would need real
    purchase-order history (there's no PO tracking yet, just batches
    recorded after the fact), and seasonality needs a year+ of sales
    history this shop doesn't have yet. Adding placeholder values for
    either would make the score look more sophisticated than it actually
    is — both are natural additions once that data exists (Phase 5 is
    where seasonality is meant to be tackled).
- **Phase 4 — Market mode (done, partial scope).** A new **Market Mode**
  admin tab: named shopping trips with a live item list, status tracking,
  progress summary, collection completion, and trip notes.
  - **Scope note:** the original Phase 4 spec also included budget
    tracking and smart alternatives (suggesting a similar fabric when one
    is unavailable). Both were deliberately left out of this pass —
    budget tracking needs a clearer definition of "planned budget" than
    the data currently supports, and smart alternatives is real design
    work that fits more naturally once Phase 6's fabric-matching exists.
    Worth a dedicated look later rather than bolting on now.
  - A trip can be **seeded from the current Purchase List** (Phase 3) —
    same priority-score logic, so the pre-loaded list matches what that
    screen already recommends — or started empty. Staff can also add
    "discovered" items on the spot for anything not pre-planned.
  - Each item's status is **planned → purchased / partial / unavailable /
    skipped**. Marking something purchased or partial prompts for the
    actual quantity and price paid.
  - **Closing a trip** is a deliberate, separate action — only then do
    purchased/partial items become real inventory (new `stock_batches` +
    `stock_movements` rows, using the actual price paid). Status changes
    while shopping do **not** silently touch real inventory data, so a
    correction mid-trip never has side effects; verified end-to-end
    (seed → mark purchased with actuals → close trip → inventory and a
    new batch both update correctly, and skipped/unavailable items
    correctly create no batch).
  - **Collection completion** shows, for a chosen fabric type, which
    known colors are covered (in stock or on this trip) vs. missing. This
    uses the catalog's own existing colors as the reference set — there's
    no separate "official collection" concept yet, so it really means
    "colors we've carried before that aren't currently covered," not a
    fixed canonical list. Labeled as such in the UI.
  - **Offline handling**: Market Mode is the one screen where a dropped
    connection is expected, not just possible — staff use it while
    physically at a wholesaler. Per the earlier scale discussion, this
    uses a simple **outbox pattern** (`src/lib/marketOutbox.js`), not a
    full sync library like ElectricSQL/RxDB: writes make an optimistic
    local update and queue in `localStorage` while offline, then replay
    against Supabase in order once back online (stopping and re-queuing
    the remainder if any single replay fails, rather than risking
    out-of-order writes). This is only wired into Market Mode's
    mutations — reads, and every other admin screen, still assume a live
    connection, since only this one workflow needs to tolerate real
    connectivity loss. Verified with a simulated flush failure: 3 queued
    writes with the 2nd failing correctly replay only the 1st, then
    re-queue exactly the unflushed remainder. **Local mode doesn't use
    the outbox at all** — it's already fully offline by definition, so
    there's nothing to queue.
- **Phase 5 — Seasonal analytics & forecasting (done).** A new **Trends**
  admin tab, **owner-only** (staff logins don't see this tab — see Notes
  → "Owner vs. staff access").
  - **This shop has little to no real sales history yet** (Phases 1–4
    just went live), so this was built to be honest about that rather
    than waiting: every comparison checks whether there's enough data
    first. With no sales at all, it says so plainly instead of showing a
    misleading `0%` or an empty chart. It fills in naturally as real
    sales accumulate — verified both states directly (0 sales → correct
    "no history" messaging; ~10 weeks of simulated sales → year-over-year
    correctly stays hidden since that needs 395+ days of history, while
    the forecast correctly activates once there are 6+ weeks with sales).
  - **This month vs last month** and **this year vs last year** revenue
    comparisons, each showing the underlying numbers alongside the
    percentage so the comparison is checkable, not just a headline figure.
  - **Custom date range** — pick any two dates and see revenue, meters
    sold, sale count, and the top-selling fabrics/fabric types in exactly
    that window. Sits alongside the three fixed comparisons above rather
    than replacing them, for whenever "this month vs last month" isn't
    the comparison that's actually useful (e.g. checking a specific
    wedding-season week from last year).
  - **Revenue by season** (Winter/Spring/Summer/Fall, pooled across all
    history so far) with each season's top-selling fabric type or color.
    Season boundaries are fixed Northern Hemisphere calendar quarters —
    a reasonable default for Kabul, but explicitly **not** aligned to
    demand-driving events like Ramadan, Eid, or wedding season, which
    shift dates every year and would need a separate lunar/event
    calendar to track properly. That's a real gap from the original
    spec's wishlist, called out rather than faked with a fixed-date
    approximation that would quietly be wrong most years. The **Custom
    date range** section above is the practical stand-in for now — if you
    know Eid fell on a particular date last year, you can just type that
    range in directly.
  - **Forecasting** is a simple exponential-smoothing estimate (not ML)
    over the last 16 weeks of revenue, projecting one week ahead. Only
    shown once there are 6+ weeks with actual sales; before that, the
    screen says what's missing instead of guessing from too little data.
- **Phase 6 — AI fabric matching (done, with an important caveat — read
  this before expecting AI results).**
  - **The catalog has no real fabric photos.** Every seed product has
    only a flat hex swatch color (`fabrics.hex`), which is what the
    existing Delta-E color matching has always used. SigLIP is a *visual*
    model — it needs a real photo showing texture, weave, and lighting to
    add anything over color alone. Until real photos are uploaded per
    product, AI matching has nothing meaningful to work with, and search
    results will fall back to color-only matching automatically (see
    below) — this is expected, not a bug.
  - **What was actually built, and it's real, working code**: a
    `fabrics.photo_url` field (separate from `hex`) with an upload flow
    in the product form; a `fabric_embeddings` table storing one vector
    per fabric per model (so switching models later doesn't silently mix
    incompatible vectors); two Supabase Edge Functions
    (`supabase/functions/embed-fabric` and `.../match-fabric`) that do
    embedding generation and hybrid-ranked similarity search
    **server-side**, per the original spec's explicit architecture
    requirement (PWA never runs the model itself — no multi-hundred-MB
    model shipped to a phone, and the paid API token never reaches the
    browser); and a `match_feedback` table recording which suggested
    match a merchant actually picked, for future ranking evaluation.
  - **Embedding provider is swappable by design**: `embedImage()`'s
    signature is the only thing the rest of the app depends on — see
    `src/lib/embeddingProvider.js`. The current implementation calls a
    hosted API (Replicate) rather than self-hosting, since no specific
    hosting decision had been made when this was built and a hosted API
    needs zero infrastructure to try; swapping to self-hosted inference
    later means writing one new function with the same signature, not
    touching the ranking or UI code.
  - **Honest fallback, not a silent one**: `match-fabric` computes a
    hybrid score (70% AI visual / 20% Delta-E / 10% metadata, per spec)
    **only** for fabrics that have a stored embedding. Any fabric without
    one — which, right now, is all of them — is ranked using Delta-E +
    metadata alone, renormalized so the missing AI weight doesn't just
    suppress its score. The Swatch Matcher UI shows plainly whether AI
    matching was actually used (`AI matching active`) or not (`AI
    matching not available for these fabrics yet — showing color-only
    results`) rather than presenting every result as AI-matched
    regardless of what really happened.
  - **AI matching is opt-in, not automatic**: the fast, fully
    client-side Delta-E matching remains the default the moment a color
    is picked. A "Try AI visual match" button appears once a photo is
    uploaded, since that's a deliberate action with a real server
    round-trip — verified the Delta-E math the Edge Functions duplicate
    (Deno can't import the React bundle) produces floating-point-identical
    results to the existing client implementation, so rankings are
    consistent whichever path is used.
  - **Not yet deployed or usable end-to-end**: this needs a real
    Replicate account, an actual SigLIP model version hash (currently a
    placeholder in both `embeddingProvider.js` and the Edge Functions —
    a wrong-looking-right hash fails silently with bad embeddings, so it
    wasn't guessed at), the `REPLICATE_API_TOKEN` secret set on the
    Supabase project, both Edge Functions deployed
    (`supabase functions deploy embed-fabric` /
    `... match-fabric`), and — most importantly — real fabric photos
    uploaded before any of this produces results better than what
    Delta-E already gives you today. See **Setup** below.
- **Phase 7 — AI business insights (done).** A new **Insights** panel at
  the top of the Dashboard tab.
  - **Facts and phrasing are deliberately separate steps, done by
    different things.** `src/lib/insightFacts.js` decides WHAT is true —
    pure arithmetic reusing the same tested math as Phases 1 and 5
    (revenue trends, per-fabric velocity, dead stock, low-stock runout
    projections), with minimum-evidence thresholds so a fact like "demand
    is increasing" never fires on a couple of noisy data points. The
    `generate-insights` Edge Function only decides HOW to phrase those
    already-true facts into readable sentences — it is explicitly
    instructed not to add any number, trend, or claim beyond what it's
    given, and the function sanity-checks its own output length and fails
    loudly rather than pass through unexpected additions. This split
    exists because letting an LLM freely infer trends from raw sales data
    would risk a hallucinated "demand is rising" reaching a merchant's
    real purchasing decisions — same class of risk as Phase 6's AI
    matching, addressed the same way: verified math decides truth, AI
    only decides wording.
  - Verified with direct tests across three scenarios: **zero sales**
    (correctly shows "not enough history yet" rather than an empty or
    fabricated panel), **10 days of thin history** (correctly produces
    zero facts — below every evidence threshold), and **rich synthetic
    history** (correctly surfaces a genuine rising-demand fabric, a
    genuine 120-day dead-stock fabric, and a genuine imminent-runout
    fabric — each fact checked against the actual test data, not just
    "some text appeared").
  - Dead-stock facts specifically exclude fabrics that have **never**
    sold (only ones with a real last-sale date beyond the cutoff) — "has
    not sold in 90 days" implies something that used to move and stopped,
    which isn't true for a fabric that was always slow. Dashboard's
    separate dead-stock *list* still includes never-sold items; this
    distinction only applies to the narrated insight text.
  - **Honest fallback**: if no LLM is configured, the call fails, or
    there simply aren't enough facts yet, the panel shows the plain
    (already-true) facts as a bulleted list with "plain summary — AI
    phrasing not available" rather than hiding the section or presenting
    unphrased data as if it were the polished version.
  - Uses the Claude API directly via `fetch` from the Edge Function (no
    SDK, kept dependency-free like the Phase 6 functions) — see Setup
    below for the API key this needs.

This section is kept up to date as phases are completed or the plan
changes — check back here for what's actually built vs. still planned.

## Business details to update before going live

All placeholders — search for these in `src/TextileApp.jsx`:

- `SHOP_WHATSAPP_NUMBER` — your real WhatsApp number (digits only, country code, no `+`)
- `SHOP_INFO` — your real shop address, coordinates, and displayed phone numbers (shown on the Contact page)
- `CURRENCY_SYMBOL` — currently `؋` (Afghani); change if needed

## Notes

- **Camera capture and GPS location** (used in "Match a Swatch", "Become
  a Buyer", and capturing a supplier's location in **Suppliers**) only
  work over HTTPS or on `localhost`. They'll work fine while developing
  here, but a deployed server needs HTTPS or these features will silently
  fail.
- **Wholesale accounts can now be deleted from the UI** (owner-only —
  see "Owner vs. staff access" below), via a **Delete account** button on
  each wholesale card plus a confirm dialog. This removes both the
  `wholesale_accounts` row and the buyer's Supabase Auth login, using a
  new `delete-wholesale-account` Edge Function with the service-role key
  (same reasoning as `embed-fabric`/`match-fabric`/`generate-insights` —
  deleting an `auth.users` row can't be done from the browser with the
  anon key). **There's still no self-service "forgot password" flow** for
  wholesale buyers (they sign in with phone + password, mapped internally
  to a synthetic email — see "Auth note" above); a forgotten password
  still has to be reset directly in the Supabase dashboard
  (Authentication → Users) for now.
- **Owner vs. staff access.** A few sections are owner-only — the
  **Dashboard** and **Trends** tabs aren't reachable by a staff login at
  all, and in **Suppliers** and **Inventory**, staff can add a new
  supplier or a new fabric but only the owner can edit or delete an
  existing one (mirrors the existing owner-only rule for
  approving/rejecting/deleting wholesale accounts). This is enforced in
  two places: the UI hides the relevant buttons/tabs for staff, and — the
  part that actually matters for security — Supabase Row Level Security
  policies also reject the underlying update/delete calls server-side
  even if someone tried to call the API directly (see
  `schema_v6_supplier_owner_only.sql`, the `wholesale_update_owner_only`
  policy, and the `fabrics_update_owner_only` / `fabrics_delete_owner_only`
  policies in `schema.sql`). Local mode enforces the UI half only, since
  there's no server to enforce the other half against.
- **Staff (owner/employee) accounts have no in-app UI to add or delete
  them either** — same situation as wholesale accounts used to be in.
  Adding one is a manual two-step process (see "Manual step" at the
  bottom of `schema.sql`): create the Supabase Auth user, then insert a
  matching row into `profiles` with a role of `'owner'` or `'staff'`.
  There's no delete policy on `profiles` yet, so removing a staff login
  today means deleting the `auth.users` row from the Supabase dashboard
  directly. In local mode, staff logins are just the `seedStaffUsers`
  array in `src/lib/localStore.js` — edited directly in code, not
  through any UI.
- **Form styling is now consistent app-wide.** Every text/number/date/
  password input, select, and textarea shares one look (padding, border
  radius, focus ring) via a single global CSS rule, rather than each
  screen styling its own inputs — several screens (Record Sale, Log
  Request, Market Mode) previously had no input styling at all and fell
  back to bare browser defaults, which is what made them look
  inconsistent with the rest of the app.
- **Deleting things asks first.** Deleting a fabric from Inventory, a
  supplier from Suppliers, or a wholesale account all show a
  confirm/cancel dialog before anything is actually removed, specifically
  so a stray tap on the trash icon can't silently destroy a row. There's
  currently no "undo" after confirming — the dialog is the only safety
  net, so double-check the name in the dialog before confirming.
- **There's no calendar/events feature in this app**, and this hasn't
  changed — see Roadmap → Phase 5 for the **custom date-range trending**
  section added to Trends instead (pick any two dates, see what sold in
  between). That's a deliberately simpler alternative to a real
  Hijri/Shamsi-aware calendar, which would still be new scope if wanted
  later — a date-conversion library, a way to enter/track lunar/solar
  events, not just a labeled Gregorian season.
- Pashto and Dari translations for the customer-facing storefront (the 187
  strings in `STRINGS`) have been reviewed and corrected by a native
  speaker as of 2026-07-25 — see CHANGES-2026-07-25.md. The admin-only
  screens listed just below are a separate, still-unreviewed piece of work.
- The **Dashboard**, **Trends**, **Record Sale**, **Log Request**,
  **Demand**, **Purchase List**, **Suppliers**, and **Market Mode** admin
  screens (Phases 1–5) are English-only for now — they were not added to
  the trilingual `STRINGS` system yet, unlike the rest of the app. This is
  a deliberate call for now (staff-facing screens, lower priority than
  the customer-facing storefront), not an oversight — worth revisiting if
  non-English-speaking staff need to use them directly.
- Phase 6's additions to the **existing, already-trilingual** Swatch
  Matcher (the "Try AI visual match" button and its status messages) and
  the new **Fabric photo** field in the Inventory admin form are also
  English-only, for the same reason as above.
- Phase 7's **Insights** panel (on the Dashboard tab) is also
  English-only, same reason.
- The PWA icons in `public/icons/` are simple placeholders — swap them for
  real branded icons (192×192, 512×512, and a 512×512 maskable version)
  before a real launch.
- The production build emits a "chunk larger than 500 kB" warning from
  Vite, since `TextileApp.jsx` has grown a lot across Phases 1–7. In
  practice this isn't a real problem yet — gzipped it's ~152 kB, which
  loads quickly on any connection and is cached after the first load as a
  PWA — so it's not worth a code-splitting refactor right now. Worth
  revisiting if the file keeps growing substantially or if load time is
  ever actually reported as an issue.

## Project structure

```
textile-app-project/
├── index.html              — HTML entry point, loads fonts, PWA meta tags
├── package.json             — dependencies
├── vite.config.js           — build tool + PWA plugin config
├── .env.example              — copy to .env for Supabase credentials
├── supabase/
│   ├── schema.sql            — run this first, in Supabase's SQL Editor
│   │                            (fresh projects only — see migration file
│   │                            below if you already have data)
│   ├── migration_2026-07-25.sql — run this instead of schema.sql if you
│   │                            already have a live database; see
│   │                            CHANGES-2026-07-25.md
│   ├── schema_v2_phase0.sql  — run this second (suppliers, warehouses,
│   │                            stock batches/movements, sales, customer
│   │                            requests, and the swatch-photo Storage
│   │                            bucket — the data foundation for BI/
│   │                            demand/procurement features; see Roadmap)
│   ├── schema_v3_phase4.sql  — run this third (shopping_sessions and
│   │                            shopping_items, for Market Mode)
│   ├── schema_v4_phase6.sql  — optional, run only if setting up AI fabric
│   │                            matching (fabrics.photo_url,
│   │                            fabric_embeddings, match_feedback, and
│   │                            the fabric-photos Storage bucket)
│   ├── schema_v5_supplier_gps.sql — adds lat/lng columns to suppliers
│   │                            for the GPS-pin feature (see Roadmap →
│   │                            Phase 3)
│   ├── schema_v6_supplier_owner_only.sql — restricts supplier edit/
│   │                            delete to the owner role (any staff can
│   │                            still add one)
│   └── functions/
│       ├── embed-fabric/       — Edge Function: generates + stores a
│       │                          SigLIP embedding for one fabric photo
│       ├── match-fabric/       — Edge Function: embeds a query swatch and
│       │                          returns hybrid-ranked matches
│       ├── generate-insights/  — Edge Function: phrases pre-computed
│       │                          facts into natural-language sentences
│       └── delete-wholesale-account/ — Edge Function: owner-only delete
│                                  of a wholesale account + its linked
│                                  Supabase Auth login
├── public/icons/              — real branded PWA icons (from fav-icon.png)
├── public/logo-mark.png       — compact monogram, used in the nav bar
├── public/logo-full.png       — full logo lockup, used on the login screens
└── src/
    ├── main.jsx                — mounts the app into the page
    ├── TextileApp.jsx           — the entire UI (components + styles)
    └── lib/
        ├── api.js                — unified data layer (picks backend automatically)
        ├── supabaseClient.js      — Supabase connection setup
        ├── supabaseApi.js         — real backend implementation
        ├── localStore.js          — offline/local fallback implementation
        ├── marketOutbox.js        — offline write-queue for Market Mode only
        │                            (Phase 4) — see Roadmap
        ├── embeddingProvider.js   — swappable embedding-model interface
        │                            (Phase 6) — see Roadmap
        └── insightFacts.js        — decides WHAT is true for AI insights;
                                     the LLM only decides HOW to phrase it
                                     (Phase 7) — see Roadmap
```

## Building for deployment

```
npm run build
```
This creates a `dist/` folder with static files you can upload to any static
host (Vercel, Netlify, Cloudflare Pages, GitHub Pages, etc. — all have free
tiers that are enough for this app). There's no server-side code to deploy
for the app itself — `dist/` is plain HTML/JS/CSS. The only server-side
pieces are the optional Supabase Edge Functions (Phases 6–7), deployed
separately via the Supabase CLI as covered earlier in this README.

**Before your first deploy, decide which backend you're shipping with:**
- **Local mode** — nothing to configure. `npm run build` and deploy `dist/`
  as-is. Fine for a single-device demo, but remember data lives in that
  one browser's `localStorage` — it won't be there on a different device,
  and clearing browser data wipes it. Not recommended for a real shop with
  more than one person needing the same data.
- **Supabase mode** — make sure `.env` has real values locally before you
  build (`npm run build` bakes `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` into the built files at build time, not at
  runtime), **and** set the same two variables in your hosting provider's
  environment variable settings so future rebuilds on that host also pick
  them up.

### Deploying to GitHub Pages (this project's setup)
This project is wired for GitHub Pages via the `gh-pages` package —
`npm run deploy` builds the app and pushes `dist/` to a `gh-pages` branch,
which Pages then serves.

1. Push this project to a GitHub repo (create it on GitHub first, then
   `git remote add origin <your-repo-url>` and push).
2. Open `vite.config.js` and set `REPO_NAME` to your repo's exact name
   (case-sensitive) — GitHub Pages serves a project site from
   `https://<you>.github.io/<repo-name>/`, not the domain root, so the
   build needs to know that subpath. If you're using a user/org page repo
   (literally named `<your-username>.github.io`), set it to `'/'` instead.
3. If you're running Supabase mode, make sure your local `.env` has real
   values — `npm run deploy` builds locally, so whatever's in `.env` on
   your machine at that moment is what gets baked into the deployed site.
   (This is a local build-and-push flow, not GitHub Actions, so there are
   no CI secrets to configure.)
4. Run:
   ```
   npm install
   npm run deploy
   ```
   This runs `predeploy` (`npm run build`) automatically, then publishes
   `dist/` to the `gh-pages` branch.
5. In your GitHub repo, go to **Settings → Pages**, and under **Build and
   deployment → Source**, choose **Deploy from a branch**, branch
   `gh-pages`, folder `/ (root)`. Save.
6. Your site goes live at `https://<you>.github.io/<repo-name>/` within a
   few minutes. Re-run `npm run deploy` any time you want to push a new
   version — there's no auto-deploy on push with this setup, it's a manual
   command each time.

**Vercel, Netlify, or Cloudflare Pages instead:** all three work too and
are simpler for auto-deploy-on-push (connect the repo, build command
`npm run build`, output directory `dist`, set `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` in their dashboard). If you switch to one of
these later, set `REPO_NAME`'s conditional in `vite.config.js` back to
`base: '/'` first, since those hosts serve from the domain root.

### HTTPS is required, not optional
This app uses the device camera (Swatch Matcher) and GPS (wholesale buyer
signup, supplier locations — see "Notes" above) via browser APIs that
**only work on HTTPS or `localhost`**. Every host listed above gives you
HTTPS automatically on its default domain; if you point a custom domain
at your host, make sure its SSL certificate is issued and active before
relying on camera/GPS features in production — they'll fail silently on
plain HTTP.

### PWA installability after deploying
The "Install app" prompt (desktop address-bar icon / mobile "Add to Home
Screen") needs the service worker and manifest that `vite-plugin-pwa`
already generates into `dist/` — no extra deploy step. Just confirm after
your first deploy that `https://your-site/manifest.webmanifest` and
`https://your-site/sw.js` both load; if either 404s, your host is likely
not serving files directly out of `dist/`'s root.

### Quick pre-launch checklist
- [x] Replaced the placeholders in **Business details to update before
      going live** (above) — `SHOP_WHATSAPP_NUMBER`, `SHOP_INFO`,
      `CURRENCY_SYMBOL`.
- [x] Ran all required `supabase/schema*.sql` files against your real
      Supabase project, in order (skip `schema_v4_phase6.sql` if you're
      not using AI fabric matching yet).
- [x] Created your real owner login (see step 7 of the Supabase setup
      above) — the demo `owner`/`owner123` credentials only exist in
      local mode.
- [x] Set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in your hosting
      provider's environment variables (Supabase mode only).
- [x] Confirmed the deployed URL is HTTPS (needed for camera + GPS).
- [x] Swapped the placeholder PWA icons in `public/icons/` for real
      branded ones (done 2026-07-25 — see CHANGES-2026-07-25.md).
- [x] Had a native Pashto/Dari speaker review the storefront translations
      (done 2026-07-25 — see CHANGES-2026-07-25.md). The 8 admin-only
      screens listed in "Notes" above are still English-only.
