# Changes — 2026-07-28 (part 2)

Six more things this round: cart persistence, fractional retail quantities,
Dashboard staleness after recording a sale, Purchase List cleanup after a
trip buys an item, supplier suggestions in Market Mode, and a real
double-counting bug when re-closing a trip.

**One database migration this time** — see step 0 below. Everything else is
client-side only.

---

## 0. Run this migration first

`supabase/migration_2026-07-28.sql` — adds a unique index that makes closing
a Market Mode trip safe to retry (see item 6). Run it once in the Supabase
SQL Editor before deploying the rest.

---

## 1. Cart was wiped on every refresh

The cart only ever lived in React state (`useState([])`), so any page reload
— accidental or not — silently emptied it. It now persists to
`localStorage` (`swatchbook_cart`) and rehydrates on load. It's still
cleared exactly where it already was: logging in/out (staff or wholesale
buyer), switching between retail/wholesale mode, and the manual "Clear
order" button. A refresh is no longer one of those triggers.

## 2. Cart now allows fractional meters (0.25m steps)

Retail quantities can go as low as **0.25m**, in quarter-meter steps —
covers the 50cm/25cm cuts you described. Wholesale is unchanged (whole
meters, 30m+ minimum recommendation). Added `0.25` and `0.5` as quick-tap
presets alongside the existing 1/3/5. This also plugs into last session's
backspace fix — the empty-while-typing behavior now clamps back to `0.25`
(retail) instead of `1` if you tab away with an invalid value.

## 3. Dashboard staleness after recording a sale

Dashboard already had a Realtime subscription meant to catch this, but that
depends on Supabase Realtime + RLS being configured correctly for the
`sales`/`sale_items` tables — not something the client can guarantee, and
not something worth staking "does the dashboard update" on alone.

Added a same-tab fallback that doesn't depend on Realtime at all: a shared
counter that bumps whenever a sale is recorded (or a Market Mode trip closes
and adds inventory), which Dashboard and Trends now both watch directly and
refetch on. This is what actually fixes it regardless of whether the
Realtime side is working.

## 4. Purchase List doesn't clean up after itself

Manually-added Purchase List entries (via "Add a fabric manually") used to
stick around forever until removed by hand, even after you'd actually gone
and bought that fabric on a trip. Closing a trip now removes any
manually-added entry whose fabric was actually purchased on that trip.

Auto-suggested entries didn't need equivalent work — they're derived live
from current stock levels (`stockMeters < 20`), so one already disappears on
its own once a purchase brings that fabric's stock back above the
threshold. If a purchase doesn't fully clear the low-stock condition, it
correctly stays on the list; manual removal (already there) is still the
way to dismiss one you don't want to act on.

## 5. Supplier suggestion + optional supplier field when confirming a purchase

The "Purchased" form in a trip now has a third, optional field: a supplier
dropdown, pre-filled with a suggestion based on purchase history —
specifically the supplier who's historically charged the **lowest price**
for that fabric (not just whoever you bought it from most recently). If
there's only one supplier on record, that's the suggestion; if there are
several, you'll see a note like "Best price previously: Al-Rahman Textiles
at 340/m." It's fully editable/clearable — this is a suggestion, not a
requirement, and doesn't block confirming without one.

Trip-seeding (pre-loading a trip from the Purchase List) got the same
upgrade: seeded items now default to the best-price supplier from history
rather than just the most recent one.

## 6. The actual bug: re-closing a trip could double inventory

This was a real bug, not a UI issue. Closing a trip used to check "does a
stock_movement already exist for this trip+fabric" with a plain SELECT
before creating a new stock_batch — a check-then-insert with no protection
against two overlapping writes both passing that check before either one
had actually written anything (a slow-connection double-tap on the close
button, or — as you described — closing, coming back later to add trip
details, and closing again). Two batches meant 30m purchased became 60m in
inventory.

Fixed at the database level, not just in the client: `stock_movements` now
has a unique index on `(reference_id, fabric_id)` for purchase-type rows
(see the migration), and `closeShoppingSession` claims that row **before**
creating the stock_batch rather than after. If a second close attempt (for
any reason) tries to claim the same trip+fabric again, the database itself
rejects it — the code treats that rejection as "already handled" and simply
skips it, instead of erroring or creating a duplicate. This is airtight
against the race regardless of how re-closing happens (double-tap, retry
after a timeout, or genuinely coming back later like you described).

The trip-close result also now reports which fabrics were actually
purchased (`purchasedFabricIds`), which is what powers the Purchase List
cleanup in item 4.

---

If you want the supplier suggestion note to be more visible (e.g. shown
before opening the purchase form, not just inside it), or want manually-
added Purchase List items to show a "buy at least X to clear the list"
hint, that's a reasonable follow-up — just say so next session.
