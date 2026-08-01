# Changes — 2026-07-26 (part 2)

## Why "needs a refresh" kept happening

The short version: several actions change stock on the server correctly,
but the app running in your browser has its own in-memory copy of the
product list, and nothing was telling that copy "hey, go check again" —
so the screen kept showing what it had loaded when you first opened it,
until a full page reload forced it to ask the server from scratch.

This is a general pattern, not a one-off bug, so rather than patch just
the Market Mode case, I traced every place that changes stock and made
sure each one tells the app to refresh its product list afterward:

- Closing a Market Mode trip → now refreshes immediately (this was your
  specific report).
- Turning a "discovered item" into a real catalog product mid-trip → also
  refreshes right away, so it shows up in Inventory without waiting for
  the trip to close.
- Record Sale already refreshed correctly (it had its own version of this
  fix from an earlier round) — cleaned it up to use the same shared
  function as the other two, so there's exactly one place this logic
  lives instead of three slightly-different copies.

I also checked the other admin screens (Suppliers, Wholesale Buyers,
Inventory add/edit/delete) — those already update correctly without a
refresh; they were never affected by this particular bug. Dashboard and
Trends refresh on their own every time you switch to that tab, so
between that and the fix above, they should now show current numbers
without a page reload in the situations you've hit so far.

If you run into another spot where something changes but doesn't show up
until you refresh, that's useful to know specifically — tell me which
action and which screen, and I'll trace that one the same way.

No database changes in this one — pure code fix, already in this project
folder.

---

## Admin screen translations

Attached: `admin-translations.xlsx` — every piece of English text I could
find across the 8 admin-only screens (Dashboard, Trends, Record Sale, Log
Customer Request, Demand, Suppliers, Purchase List, Market Mode), pulled
out of the code automatically. 169 entries total. Same process as the
storefront translation pass — fill in Pashto/Dari, send it back, and I'll
wire it into the code the same way.

This was extracted by scanning the code for text patterns rather than
typed out by hand, so it should be thorough, but if you spot something
in the admin screens missing from the list, just tell me and I'll add it
next round.
