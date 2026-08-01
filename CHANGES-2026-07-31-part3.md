# Changes — 2026-07-31 (part 3)

## ⚠️ Run this SQL migration
`supabase/migration_2026-07-31.sql` has one new section (#3 below) added
to the same file from last time. It's all idempotent — safe to run again
even if you already ran it once.

---

## 1. Settle Balance (Credit Ledger)
Each approved wholesaler row now has a **Settle Balance** button next to
View Ledger (owner-only — staff accounts won't see it).

- Tapping it asks you to **type your own login password** to confirm —
  this is the only action in the app that erases history outright rather
  than archiving/reversing it, so it gets a stronger check than the usual
  "are you sure?" dialog.
- On confirmation, it permanently deletes every charge/payment entry for
  that wholesaler — their balance goes back to zero, as if there were no
  history at all. This can't be undone, by design (that's the point of
  the password step).
- Restricted at the database level too, not just in the UI: migration
  section 3 makes deleting ledger entries an owner-only operation even if
  someone bypassed the app entirely.

## 2. Logo fix + bigger wordmark
Tracked down why the logo "didn't look nice": it's a transparent PNG
whose ring and lettering are **white**, and they were disappearing
against the nav bar's cream background — only the faint dark linework
was visible. Fixed by giving the logo a dark circular badge background
(reusing your existing dark ink color) with a thin accent border, so the
white details show up properly. Also increased "Raihan Fabrics" text
size by 50%.

On your layout question — logo-left, name-right is already how it's
built, and I'd keep it that way; it's the standard, most legible
treatment and will scale fine onto physical signage too. What looked
like "the whole row" is just the nav buttons wrapping onto their own line
underneath on narrower screens, which is normal and not a problem.

**One thing I noticed but didn't touch:** the same white-on-white issue
exists on the login screens' logo (smaller, top of the Staff/Wholesaler
login cards) since it's the same image file. Say the word if you'd like
that given the same badge treatment for consistency.

## 3. Save wholesaler/supplier contacts
Important constraint first: **no website can silently write into your
phone's contacts** — there's no browser API for that, for privacy
reasons (any site could otherwise spam your address book). What's
actually possible, and what I built: a **Save to Contacts** button that
downloads a standard contact file (.vcf) with name, business name,
phone, and address already filled in. Tapping the downloaded file opens
your phone's own "Add Contact" screen, pre-filled — one more tap to save
it for real.

- **Wholesalers**: button added next to Delete on each account card
  (owner-only).
- **Suppliers**: small contact-card icon added next to Edit/Delete on
  each row (only shown if the supplier has a phone number on file).

On "groups": I tagged each contact with a category label ("Raihan
Fabrics Wholesalers" / "Raihan Fabrics Suppliers"). Android's Google
Contacts shows this as a label/group on import — iOS Contacts
unfortunately ignores it, since there's no vCard field every phone
treats as a group the same way. So on Android this'll land in a group
automatically; on iPhone, it saves fine but you'd still sort it into a
group by hand afterward if you use groups there.
