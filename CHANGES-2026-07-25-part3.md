# Changes — 2026-07-25 (part 3)

Same format as before — grouped by what you reported, in order.

---

## "Could not find the 'photo_url' column of 'fabrics'" — blocking ALL fabric saves

My mistake from the last round: `schema_v7_fabric_photos.sql` only created
the Storage *bucket* for photos, not the actual `photo_url` *column* on
the `fabrics` table that the app writes to on every single save — with or
without a photo attached. Every add/edit was hitting this.

**Fixed** in `schema_v7_fabric_photos.sql` for future fresh setups, and
you already ran the urgent standalone fix I gave you directly in chat
(also saved as `supabase/migration_2026-07-25-part3-urgent.sql` in this
folder for reference). Nothing further needed here.

## Purchase List "add fabric" suggestions box too short

The dropdown's own CSS was fine — its *container* had `overflow: hidden`
(inherited from the general `.table-wrap` style, which is correct for an
actual table but wasn't meant for this particular box), which was
clipping the suggestion list to a sliver. Fixed by letting this specific
box overflow visibly.

## Browser back button exiting the site

This was a real regression I introduced with the hash-routing fix a
couple of rounds back — I deliberately used `replaceState` everywhere
specifically to *avoid* adding browser history entries, not realizing
that meant there was nothing for the back button to step back *to*, so
the very first press exited the site entirely.

Fixed: real navigation (tapping a nav item, opening Admin, switching
Admin tabs) now uses `pushState`, so each is a real step in your
browser's history — pressing back steps back through the app one screen
at a time, the way it should. A `popstate` listener keeps the app's own
state in sync when you do that, without re-pushing a duplicate entry.

## "Become a Buyer" — intermittent 422

Checked the code path carefully — the app already distinguishes this
into a specific, correct message ("This phone number is already
registered") rather than a generic failure, so if you saw that exact
text on screen, that's working as intended, not a bug. The raw 422 in
the browser console is just normal network-level noise any time the
server returns a non-success status; it shows up even when the app
handles the error gracefully.

The most likely explanation for "sometimes works, sometimes doesn't":
**leftover test accounts from before the "Confirm email" fix.** Any
phone number you tried to sign up with *before* that setting was turned
off got stuck as a half-created, permanently-unconfirmed account —
Supabase now correctly refuses to let that same phone number sign up
again ("already registered"), but there's no way to finish or recover
that old attempt either.

**To clean this up:** in your Supabase dashboard, go to
**Authentication → Users**, look for entries ending in
`@buyer.swatchbook.local`, and delete any that don't correspond to a
real approved buyer in your Wholesale Buyers admin screen. Then retest
with a phone number you haven't tried before — if that goes through
cleanly, the underlying flow is confirmed working and it really was just
old test data in the way.

Also added: a client-side check for a too-short password (Supabase
requires 6+ characters) with an immediate, specific message, instead of
letting that reach the server as a generic-looking 422 too.

## Purchase List items disappearing when you navigate away

Root cause: manually-added items only ever lived in memory for as long as
that screen stayed mounted — leaving the screen and coming back threw
them away, matching exactly what you described. Fixed by persisting them
(just the list of which fabrics, not a full copy of their data — quantity
and pricing get freshly recalculated from current stock/supplier data
each time, same as before) so they survive navigating away and back, and
a refresh.

## Purchase List items not appearing in Market Mode despite "pre-load"

Separate but related bug: pre-loading a new trip from the Purchase List
never actually looked at what was on the Purchase List screen — it
independently re-ran the same automatic recommendation calculation from
scratch, which is why anything you'd typed in manually never showed up
in the trip; it wasn't being ignored, it was never being read in the
first place. Fixed — trip creation now merges in the same persisted
manual items described above (skipping anything that's already in the
automatic list, so nothing shows up twice).

## Closing a trip said "0 items were added to inventory"

This was the most involved one, and had two layers:

**Why it happened:** a "discovered item" (added on the spot with just a
fabric type and color, since it wasn't already in your catalog) has no
matching product to attach a purchase to — creating a stock entry
requires a real `fabrics` row, which a freshly-discovered item doesn't
have yet. Closing the trip silently skipped anything like this with no
explanation, which is why it looked like nothing happened even after
marking things purchased.

**Fixed, in two parts:**
1. Marking a discovered item "Purchased" now asks for the handful of
   extra details a new catalog product needs (color swatch, width, GSM,
   retail price, SKU) right there in the trip, and creates it as a real
   inventory item at that moment — from then on it behaves exactly like
   any other fabric.
2. If something still gets skipped for any reason (e.g. you left "meters
   bought" blank), closing the trip now tells you exactly how many items
   were skipped instead of just reporting 0 with no context — and a
   closed trip can now be safely re-closed after fixing a skipped item,
   without double-counting anything already added.

## Delete Wholesale Account — CORS error

Confirmed and fixed. None of your four Edge Functions
(`delete-wholesale-account`, `embed-fabric`, `match-fabric`,
`generate-insights`) were sending the CORS headers browsers require for
this kind of cross-origin call — `delete-wholesale-account` is just the
one you happened to trigger first. Fixed all four the same way, so this
won't resurface when you eventually use the other three (AI matching /
insights).

**Action needed:** redeploy this one function so the fix takes effect:
```
npx supabase functions deploy delete-wholesale-account
```
(The other three don't need redeploying yet if you're not using them,
but the fix is already in place in the code for whenever you do.)

---

## What you need to do

1. ~~Run the urgent `photo_url` fix~~ — you already have this from earlier
   in this conversation. If you haven't run it yet, it's at the top of
   this file and also saved as
   `supabase/migration_2026-07-25-part3-urgent.sql`.
2. Redeploy the Edge Function: `npx supabase functions deploy delete-wholesale-account`
3. Clean up orphaned test buyer accounts in Supabase (Authentication →
   Users) if you want to confirm "Become a Buyer" end-to-end.
4. Everything else in this batch is a pure code fix already in this
   project folder — follow `SETUP.md` to test locally, then deploy.
5. Hard-refresh after deploying, as always.
