# Changes — 2026-07-31 (part 2)

## ⚠️ Run this SQL migration first
`supabase/migration_2026-07-31.sql` in your Supabase SQL Editor — it:
- adds `sales.amount_paid` (needed for partial payments, #9 below)
- adds `wholesale_accounts` and `account_transactions` to the realtime
  publication (needed for #6 below)

Nothing else here needs a migration.

---

## 1. Add Fabric: photo → color picker flow
The swatch color field used to sit near the top of the form, disconnected
from the photo upload lower down. Now:
- Upload the photo first.
- The moment it loads, the app auto-suggests a starting swatch color
  (average of the photo's center region — same logic the AI matcher
  already used).
- Tap/click anywhere on the photo to sample that *exact* pixel instead —
  useful for pulling the true fabric color rather than a shadow or
  background blend.
- A manual color input stays next to the photo as a fallback / fine-tune
  option, and still works even if no photo is uploaded at all.

## 2. `.gitignore` added
Covers `node_modules/`, `dist/`, `.env` and variants, editor/OS files,
logs, and Vite's cache dir. Wasn't present before, so none of this was
being excluded from git.

## 3. Header logo doubled
`.brand-mark` (the icon beside "Raihan Fabrics" in the top nav): 52px →
104px. (The separate logo on the login screens was left as-is since you
only mentioned the one beside the wordmark.)

## 4. Login-page flash on refresh — fixed
Root cause: `adminUser` starts out `null` while the session-restore check
(`api.getSession()`) is still in flight, so a refresh briefly rendered the
login screen for an already-signed-in staff member before the real
session loaded a moment later.

Added an `authChecked` flag that starts `false` and flips to `true` once
that check resolves. The login screen (and the footer "Staff login" link)
now waits for it — showing a brief loading state instead — so a valid
session never flashes through the login page anymore.

## 5. Wholesaler phone number → WhatsApp format
On signup, if the phone number is exactly 10 digits and starts with `0`
(e.g. `0701234567`), it's now saved as `+93701234567`. Anything already
international, or an unusual length, is left exactly as typed rather than
guessed at — this only fires for that specific local-dialing shape.

## 6. Mobile: Record Sale name/SKU field
On narrow screens, the name/SKU search input now takes its own full-width
row; meters and price/m flow onto the next row together, where they have
room to be comfortably tappable.

## 7. "Still shows stale data until refresh" — several more spots fixed
This was previously only solved for Inventory/Dashboard. Extended the
same realtime-subscription pattern to:
- **Wholesale account requests** — a new signup, or an approval/rejection
  made elsewhere, now updates the admin panel and the pending-count badge
  live.
- **Credit Ledger** — an entry logged from another device/tab now shows
  up without a manual refresh.

If you notice this pattern anywhere else (a specific tab, not "the app in
general"), point me at it and I'll wire up the same fix — this is a
per-table thing, not a one-shot global fix.

## 8. Credit Ledger button spacing
"Send Balance" and "View Ledger" were being squeezed into fixed 28×28px
icon-button boxes meant for a different part of the app (`.row-actions`),
which is what made them look cramped/overlapping. Gave the ledger its own
`.ledger-row-actions` class with proper `gap: 14px` and wrapping, so
there's real breathing room on any screen size.

## 9. Credit Ledger charge/payment dropdown
Was hard-resetting to "Charge" after every submission. Now preserves
whatever was selected.

## 10. Partial payments on Record Sale
When payment status is set to "Partial," an "Amount paid" field appears,
with a live "Remaining" readout underneath. The receipt (and the
downloadable image) now shows Total / Paid / Remaining instead of just
the total, so the receipt tells the full story — e.g. "Total: 5,000 · Paid:
3,000 · Remaining: 2,000." Requires the `amount_paid` column from the
migration above.

## 11. SKU on the dashboard
The four bottom Dashboard sections — Best Selling Fabrics, Most
Profitable Fabrics, Reorder Suggestions, Dead Stock — each now show the
fabric's SKU alongside its color/type.

---

### A note on #7
"Still updates only appear after a refresh" is a symptom that can come
from any table that isn't wired into realtime yet — I found and fixed the
two you mentioned testing (wholesale signup, credit ledger), but there
could be other tabs with the same gap I haven't hit yet. Cheapest way
forward: if it happens again, tell me exactly which tab/action, and I'll
add that table to the subscription list the same way.
