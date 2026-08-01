# Changes — 2026-07-31 (part 4)

No SQL migration needed for this batch — code-only fixes.

## 1. Logo background reverted to white
The dark circular badge from last round didn't look good, so it's back
to a clean white circle (with a subtle border/shadow so it still
separates from the cream nav bar) instead of the dark ink background.
Text size stays at the larger 1.725rem from last time. The login-screen
logo was left exactly as it was — not touched.

## 2. Language dropdown clipping off-screen — fixed
Root cause: the dropdown was anchored with a hardcoded `right: 0` (LTR)
/ `left: 0` (RTL) rule, assuming the trigger button always sits on a
predictable physical side of the screen. That assumption breaks once the
nav bar wraps onto two rows — which now happens more often after the
logo/text got bigger last round — because a single wrapped-alone flex
item packs differently depending on text direction, and the dropdown's
"which side has room" logic no longer matched reality. That's why it
looked inconsistent — sometimes clipped left, sometimes right, depending
on screen width and language.

Fixed by having the dropdown center itself under its own button instead
of guessing a side, with a max-width capped to the viewport. This sidesteps
the whole left/right ambiguity rather than patching one more special
case that could break again under some other screen width — same fix
works for English, Pashto, and Dari alike.
