# Starting this project folder in VS Code

This is the checklist to follow every time you get a new/updated copy of
this project folder (from me, or from anywhere else) and need to get it
running and deployed. Follow it in order — most of the confusion so far
has come from steps done out of order (deploying before `.env` was set
up, deploying before `git` was connected, etc.).

## 1. Open it and install

1. Unzip the project folder somewhere permanent (e.g. `C:\ReactProjects\textile-app-project`).
2. Open that folder in VS Code (**File → Open Folder**).
3. Open a terminal in VS Code (**Terminal → New Terminal**) — it should
   already be in the project folder.
4. Run:
   ```
   npm install
   ```
   This installs all dependencies fresh — it's normal for this to take a
   minute and print some warnings, that's fine.

## 2. Set up your environment file

If you're running against your real Supabase project (not local/demo
mode):

1. Copy `.env.example` to a new file named exactly `.env` (same folder).
2. Fill in your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (from
   your Supabase dashboard → Settings → API).

`.env` is in `.gitignore` on purpose — it never gets committed to GitHub,
so you'll re-do this step every time you get a fresh copy of the project
folder. That's expected, not a bug.

## 3. Test it locally before deploying anything

```
npm run dev
```

Opens the app at `http://localhost:5173` (or similar). Click around and
confirm things look right — the business details you edited, the
translations, whatever you changed — **before** pushing it live. This
step is free and catches most problems early.

Press `Ctrl+C` in the terminal to stop the dev server when you're done.

## 4. Connect this folder to your GitHub repo (first time only, per folder)

A fresh unzipped folder has no memory of your GitHub repo — you have to
tell it once. **Skip this whole step if you're editing your existing,
already-connected project folder** (check: does it have a hidden `.git`
folder already? If yes, skip to step 5).

```
git init
git remote add origin https://github.com/raihanfabrics/raihanfabrics.github.io.git
git add .
git commit -m "Update"
git branch -M main
git push -u origin main --force
```

The `--force` on that last line only matters the *first* time you connect
a brand-new folder — it overwrites whatever's on GitHub with what's in
this folder. Don't use `--force` on ordinary future commits once this
folder is your regular working copy; just `git add . && git commit -m "..."
&& git push`.

## 5. Check `vite.config.js` before every deploy

Open it and confirm the `base` line matches how the site is actually
served:
- `raihanfabrics.github.io` (a user page) → `base: '/'`
- Any other repo name, e.g. `some-project` → `base: '/some-project/'`

This only needs checking once really, but it's the single most common
cause of a deployed site going blank, so it's worth a glance if anything
looks wrong after a deploy.

## 6. Deploy

```
npm run deploy
```

This builds the app and pushes it to your `gh-pages` branch. Takes maybe
10–20 seconds. You should see `Published` at the end.

## 7. The step that's been catching you: hard-refresh after every deploy

**This app is a PWA — it installs a service worker that aggressively
caches the site so it keeps working offline.** That's a feature (it's
useful for a shop with patchy connectivity), but it means the browser
tab you already had open will often keep showing the *old* version even
after a successful deploy, and — worse — can show a half-old,
half-broken mix if the deploy changed file names, which looks exactly
like something is broken. It isn't; it's cached.

After every deploy:
1. Go to the live site.
2. Hard refresh: **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac).
3. If it *still* looks wrong after that: open dev tools (**F12**) →
   **Application** tab → **Service Workers** → click **Unregister** →
   then do a normal refresh.

This is exactly what happened a couple of steps back — the deploy had
actually worked, it was just cached. If you ever see something broken
right after a deploy, try this before assuming the deploy failed or
asking me to debug it — it's usually this.

(Your customers' browsers will pick up a new version automatically
within a little while on their own — `autoUpdate` is already configured
— this hard-refresh step is really only something *you* need to do right
after deploying, to check your own work.)

## Quick reference — the whole loop, once you're set up

```
npm run dev        # test locally
# ... make sure it looks right ...
npm run deploy      # build + push to gh-pages
# ... hard-refresh the live site to actually see the change ...
git add .
git commit -m "describe what changed"
git push            # keep GitHub's main branch (your source code) in sync too
```

Two separate things get pushed to two separate places, and it's easy to
forget one: `npm run deploy` pushes the **built site** to the `gh-pages`
branch (what visitors see). `git push` pushes your **source code** to the
`main` branch (so you don't lose your edits, and so I can work from an
up-to-date copy next time). Do both.
