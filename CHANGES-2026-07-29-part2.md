# Changes — 2026-07-29 (part 2)

Follow-up to the same day's earlier session (see CHANGES-2026-07-29.md).

## 1. Fabric photos now actually display

Previously the uploaded photo was stored but never shown anywhere except
the upload preview itself — every swatch tile, product drawer, and
inventory row rendered the flat `hex` color only. Fixed on the
customer-facing surfaces and the main Inventory table:
- Storefront swatch tiles (grid)
- Product detail drawer (the big hero image)
- Inventory table rows (main list + the new archived section)

If a fabric has no uploaded photo, it still falls back to the flat hex
swatch exactly as before — nothing breaks for fabrics you haven't
photographed yet. (Left the small 22px swatch chips in a few
search-dropdown/typeahead spots — like the manual purchase-list search —
as flat color, since a photo doesn't add much at that size; say the word
if you want those too.)

## 2. WhatsApp order messages now include SKU

Both the "quick order" button (product drawer) and full cart checkout
build their WhatsApp message through the same function, so this one fix
covers both: each line now reads e.g. `1. Ivory Bone (Cotton, 44") — SKU:
CTN-IVB-44 — 12m` instead of leaving the SKU out.

## 3. Removed the placeholder-address note on Contact

The "Placeholder address — update SHOP_INFO in the code..." line at the
bottom of the Contact page is gone — your real shop address in
`SHOP_INFO` was already correct, that note was just leftover scaffolding
text nobody removed once you filled it in.

## 4. Supplier rating (1-10, owner only)

New "Rating (1-10)" column on the Suppliers table — a plain editable
number box, visible only when signed in as owner. Type a number and tab/
click away to save. Blank means un-rated (shows as "—", not 0). Staff
logins don't see the column at all.

Needs a small DB migration — see `supabase/schema_v8_supplier_rating.sql`
(adds a nullable `rating smallint` column with a 1–10 check constraint;
no new RLS policy needed since the existing owner-only update policy from
schema_v6 already covers it). Run it in Supabase's SQL Editor before
this build goes live, same as the other `schema_v*.sql` files.

## 5. Price trend flag per supplier

Suppliers table now flags a supplier if the price on any fabric you've
bought from them rose between their two most recent purchases of it —
shown as a small "▲ 13%" badge next to their purchased total, with a
tooltip. Only fires on an actual increase for a repeat fabric purchase;
a supplier you've only bought one batch from, or whose prices have held
steady or dropped, shows no flag. This only compares a fabric against
its own purchase history from that specific supplier — it doesn't
compare supplier to supplier.

---

No other files changed this round.
