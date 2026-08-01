# Changes — 2026-07-25 (part 2)

Everything below is in response to your last two messages — the "blank
page" resolution, and the full bug list. Grouped the same way you listed
them.

---

## The blank page (recap, now resolved)

Confirmed as a service-worker caching issue, not a code bug — hard
refresh fixed it, as expected. See the new **`SETUP.md`** for the
step-by-step on this so it doesn't cause confusion again; short version:
this app is a PWA, so the browser aggressively caches it, and a normal
refresh after deploying often isn't enough — you need `Ctrl+Shift+R`, and
occasionally an explicit service-worker unregister in dev tools.

## Mobile-first / navbar overflow

The nav bar has five tab buttons (Storefront/Matcher/Become a
Buyer/Contact/Admin) plus session info, language switcher, and cart —
more than fits on a narrow screen at their natural width. Flexbox items
don't shrink below their content's natural width by default, so that
strip was forcing the *entire page* wider than the viewport, which is
what pushed things off the right edge.

Fixed by making that tab strip scroll horizontally within itself
(swipeable, like a native app tab bar) instead of stretching the page,
plus two general safety nets: `overflow-x: hidden` on the page shell, and
letting form inputs shrink below their default minimum width (the same
underlying flexbox issue was very likely also what made the Purchase
List "Add" button hard to reach — see that section below).

This is a targeted fix for the reported issue, not a full mobile-design
pass — if you spot other cramped/overflowing spots on a phone, tell me
which screen and I'll look at that one specifically.

## Tab title + metadata

- Browser tab title: "Raihan Fabrics" (was "The Swatch Book — Textile
  Merchant App").
- PWA install name (what shows on a phone's home screen / app switcher):
  also "Raihan Fabrics".
- Added a proper meta description, and Open Graph tags (title,
  description, image, url) so a link to the site posted in WhatsApp,
  Facebook, etc. shows a proper preview card instead of nothing.
- Theme color updated to match the logo's green (`#0B3B32`) instead of
  the old placeholder brown.

## Product photo upload — "Could not upload photo. Please try again."

Root cause: the Storage bucket (`fabric-photos`) that photos upload into
only got created by `schema_v4_phase6.sql` — which the README (wrongly)
labeled *optional*, since it was bundled with the AI fabric-matching
feature. But uploading a plain product photo in the Inventory form isn't
an AI feature — it was just accidentally scoped behind an optional
migration file.

Fixed:
- Moved bucket creation into a new, required file:
  `supabase/schema_v7_fabric_photos.sql`.
- Also fixed the bucket's visibility — it was being created as *private*,
  but the app fetches photos back via a public URL, which only works on
  a public bucket. Even if you had run the old optional file, photos
  would have uploaded "successfully" but never actually displayed.
- Cleaned up the filename used for the upload — a photo straight from a
  phone can have spaces, apostrophes, or other characters that Storage
  keys don't like; these get stripped now instead of possibly causing a
  failed upload on some file names.
- The error alert now includes the actual error message (not just a
  generic line), so if this happens again for a different reason, you'll
  see why instead of a dead end.

**Action needed:** run `supabase/migration_2026-07-25-part2.sql` against
your live database (see bottom of this file).

## "Become a Buyer" — "Something went wrong — please try again."

Root cause: your Supabase project almost certainly has **"Confirm
email"** turned on, which is Supabase's default for a new project. A
wholesale buyer's phone number gets mapped internally to a fake email
address (so buyers can log in with just a phone number, no real email
needed) — but that means there's no real inbox for a confirmation link to
land in. With confirmation required, the signup call itself succeeds,
but the person doesn't get an active login session immediately after —
and the very next step (creating their buyer account record) requires
one, so it gets rejected.

**Action needed:** in your Supabase dashboard, go to **Authentication →
Providers → Email** and turn **off** "Confirm email." This isn't a code
bug I can fix from this end — it's a one-time setting. Full explanation
is now also in the README's setup steps (step 2), so it's not missed on
a future fresh project setup.

## Record Sale / Log Request submit / Market Mode "close trip"

All three had the exact same bug, which is good news — one fix covers
all three. Three places in the code hardcoded the shop's warehouse as the
literal text `"wh1"`. That's harmless in local/demo mode (plain
localStorage doesn't care what an ID looks like), but in your real
Supabase database `warehouse_id` is a proper `uuid` column — sending it
the text `"wh1"` is invalid input, so the database flatly rejected it
every time, with no useful error surfaced to you.

Fixed by looking up your shop's actual warehouse ID from the database
instead of hardcoding it (cached after the first lookup, so it's not an
extra network round-trip on every save). This is a pure code fix, no
database change needed — your `warehouses` table already has the one row
it needs.

This also explains **"image upload works in Log Request but submit
doesn't"** exactly — the photo upload is a separate step from the form
submit, so it succeeded on its own, then the actual "save this request"
step hit the same `"wh1"` bug.

## Purchase List "Add" button not working

I reviewed this button's code directly and didn't find a logic bug in
it — my best read is that this was the same mobile-overflow issue as the
nav bar (see above): on a narrow screen, the search box next to it could
force the row wider than the screen, pushing the button out of reach
without it looking obviously "broken." The general fixes above should
resolve it. **Please double check this one specifically after the
update** — if it's still not responding to taps, tell me exactly what
happens (does anything visibly react when you tap it?) and I'll dig
further; I don't want to claim a fix I haven't been able to fully
confirm.

## "Add discovered item" — sometimes 7 items, sometimes 1; feels slow

Two related things, both fixed:
- The "Add to List" button had no loading/disabled state. On a slow
  connection (which is the exact situation Market Mode is built for —
  shopping at a supplier with patchy signal), tapping it with no visible
  response is a very natural thing to do more than once — and each tap
  fired its own database insert. It now disables itself and shows a
  spinner the moment you tap it, so a second tap while it's still saving
  does nothing.
- Separately, every single item action (checking one thing off, adding
  one discovered item) was re-fetching the *entire* list of shopping
  trips from the server, not just refreshing that one trip's items —
  unnecessary extra network traffic on every step, which is what "loads
  much on every step" was almost certainly describing. Now only the
  current trip's items are re-fetched after an item-level action; the
  full trip list only re-fetches when you actually navigate back to it.

## The unusual URL (`.../staff-login/admin/suppliers#/admin/market-mode`)

I traced through everything the app itself ever does to the browser's
address bar, and it never writes a real path like `/staff-login` or
`/admin/suppliers` — only ever the part after `#`. My best explanation is
that this was your browser's own address-bar autocomplete stitching
together fragments of pages you'd visited before while you were typing
(a normal, if confusing-looking, browser behavior) — not something the
app actually navigated to.

That said, I added a small defensive check on load: if the address bar
ever does show a path other than `/` for this site, the app quietly
straightens it back to `/` (keeping whatever hash/page you were on)
without a real page reload. Cheap insurance either way.

## Clear VS Code startup instructions

Written — see the new **`SETUP.md`** at the project root, and it's now
linked at the very top of `README.md` too. Covers, in order: install →
`.env` setup → testing locally before deploying → connecting a fresh
folder to your GitHub repo (only needed once per folder) → the
`vite.config.js` base-path check → deploying → the hard-refresh-after-
deploy step that's caused confusion twice now.

---

## What you need to do

1. **Turn off "Confirm email"** in Supabase: Authentication → Providers →
   Email. (Fixes "Become a Buyer".)
2. **Run `supabase/migration_2026-07-25-part2.sql`** in your Supabase SQL
   Editor. (Fixes product photo upload.)
3. Everything else (Record Sale, Log Request, Market Mode, mobile nav,
   title/metadata, Add Discovered Item) is a pure code fix — already in
   this updated project folder, nothing extra needed in Supabase.
4. Follow `SETUP.md` to get this folder running, tested locally, and
   deployed.
5. **After deploying, hard-refresh** (`Ctrl+Shift+R`) before checking
   anything — see `SETUP.md` if you forget why.
6. Please specifically re-check the Purchase List "Add" button and let me
   know if it's still unresponsive — that's the one fix in this batch I
   wasn't able to fully confirm.
