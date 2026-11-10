# Handoff

A one-page site listing manufacturer promotions and rebates for AA Kitchen's customers, built from the
brand material the maintainer keeps in OneDrive. Start a new session with: "Read docs/HANDOFF.md".

## Status (2026-11-10)

- **Live:** https://aakitchenshowroom-sf.github.io/promotions/ (GitHub Pages, deployed by
  `.github/workflows/pages.yml` on every push to `main`).
- 26 promotions in the workspace data; **25 verified and published** (batch 1: 3 on 2026-11-09; batch 2:
  20 on 2026-11-09; first update: #25 Bosch Kitchen Sales Event and #26 Fulgor Sofia Instant Rebate on
  2026-11-10). **1 on hold:** #10 KitchenAid (purchase dates to be checked by the maintainer).
- Page design: version A (D-26), store contact info (D-27), header notice and final disclaimer (D-29).
- **Updates:** when brand files are added or changed, follow `docs/UPDATE.md` ("Read docs/UPDATE.md and run
  the update").
- English only. A Chinese version was drafted and cancelled (D-30); do not restart it without the
  maintainer. Its draft is on the local branch `zh-draft`, which is never pushed.
- **Next:** #10 KitchenAid once the maintainer answers; further updates per `docs/UPDATE.md`.
- Git operations that need the maintainer's OK first: see D-25. Commits need no OK, but list their files first.
- Items waiting for the maintainer: see the workspace file `notes/open-items.md`. They are not written in
  this public repo.

## Where things are

- **This repo** (public): `%USERPROFILE%\Projects\promotions`, outside OneDrive. The page source (`web/`), the
  published build (`site/`), the tools (`tools/`) and these docs. Nothing internal is committed here.
- **Workspace** (OneDrive, private): `%OneDrive%\Work\AA Kitchen Workplace\Promo site data\`
  - `config/active.json`: Promo root folder, active folders, campaign name, permanent exclusions
  - `config/private-terms.json`: personal and store identifiers the public check blocks
  - `data/promos.json`: the single source of truth for every promotion, including review fields
  - `data/fingerprints.json`: sha256 of every source file read so far
  - `notes/open-items.md`: open questions and internal notes
  - `archive/<year>/<campaign>/`: promotions moved out when a folder is deactivated
- **Source material** (read-only, never modified): the Promo folder in OneDrive.
- `local.config.json` (not committed) tells the tools where the workspace is.

## How it works

- `node tools/build.mjs preview` → `.preview/` (local only): every promotion with its number, verification
  status, hold, flags, a link to open the original, and internal notes behind "Notes".
- `node tools/build.mjs public` → `site/`: only promotions that are verified, not on hold and have no open
  blocking flag; only consumer fields; plus `site/forms/` with byte-exact copies of those promotions' original
  files for download. The build ends with `tools/check-public.mjs` and fails if anything internal is found.
- `web/contact.json`: the store's name, phone, address, website and email, written into the page header and
  footer by the build (D-27). Change contact details only there.
- `web/notices.json`: the header notice, the footer Disclaimer and the line under the downloads (D-29).
  Change that wording only there. The public check fails if the header notice is missing.
- `.github/workflows/pages.yml`: on every push to `main` (or by hand), uploads the committed `site/` folder,
  and nothing else, to GitHub Pages. It does not build anything.
- `node tools/test-public.mjs`: publish-rule self-test on a throwaway copy (run after any change to tools or web).
- `node tools/fingerprint.mjs`: new, changed, deleted and cloud-only source files against the saved
  fingerprints; `--save` records them (only after the maintainer confirms a change list).
- `node tools/serve.mjs`: preview at http://127.0.0.1:4317/, public build at `/public/`, originals at
  `/source/…` (active folders only). Preview-only URL options: `?today=YYYY-MM-DD` (pretend date),
  `?review=1` (only items not ready to publish), `?only=id1,id2` (just those items).
- `preview.bat` (double-click): rebuilds both and opens the preview in the maintainer's browser.

### Starting the preview in a session (fixed method, D-22)

The app's preview tool does not read this repo's `.claude/launch.json`, and other repositories are never
edited to work around it (D-17).

1. Build: `node tools/build.mjs preview` (and `public` when needed).
2. Run `node tools/serve.mjs` in the background from this repo.
3. Use the browser pane on http://localhost:4317/, or headless Edge for screenshots when the pane is hidden.
4. Stop the background server as soon as the screenshots are taken, and check that port 4317 is free.

## How to verify a batch

1. Build the preview and show only the batch: `http://127.0.0.1:4317/?only=<id>,<id>,…`
   (ids are in `data/promos.json`; for example `speed-queen-dryer,bosch-bf-delivery-install,whirlpool-maytag-black-friday`).
2. The maintainer checks each item against the original ("Open original") and says, for example,
   "#20, #2, #13 verified" or what to change.
3. Write the date into `verifiedAt` for exactly those items in the workspace `data/promos.json`. Change
   nothing else. If an item's amount, dates or models change later, set its `verifiedAt` back to `null`.
4. Rebuild `public`; the public check must pass. Show the public build at `/public/` for confirmation.

## Before every push (round 3 and each later batch)

1. **Settings:** confirm the GitHub setup still holds (D-10): repository `aakitchenshowroom-sf/promotions`,
   `geesonchan` as collaborator, Pages source "GitHub Actions". Remote `origin` is set in this repo.
2. **Author email:** every commit to be pushed has author and committer email
   `20552271+geesonchan@users.noreply.github.com`; no private address anywhere
   (`git log --format='%an <%ae> | %cn <%ce>' origin/main..HEAD`, or all commits before the first push).
3. **Public file list:** list every tracked file (`git ls-files`) and every file in `site/` and `site/forms/`
   for the maintainer to review. No source document outside `site/forms/`, no `local.config.json`, nothing
   from the workspace.
4. **Store information in new files:** for each new file in `site/forms/`, tell the maintainer which store
   information it carries (D-28). Text-extract PDFs; look at image-only files page by page.
5. **Tests:** `node tools/build.mjs public` and `node tools/test-public.mjs` pass.
6. Push only after the maintainer confirms.
7. **After the push:** confirm the Actions run started by itself and succeeded (if not, it can be started
   with `gh workflow run pages.yml`). Download each published file from the live site and compare its sha256
   with the local `site/` file; check the new download and claim links. Report any mismatch.
   Missing paths on Pages sometimes answer 503 ("Unicorn!") instead of 404; that page is GitHub's, not a file.

## Round plan

1. Round 1: read-only inventory (done)
2. Round 2: local repo, data, page, visual design, local preview (done)
3. Round 3: deploy in batches (D-16). Each batch: verify → build → preview → maintainer confirms → push →
   check live hashes.
4. Round 4: `docs/UPDATE.md` (done, first update 2026-11-10); folder-selection script still to do

Each round: read-only plan → maintainer confirms → work → local preview → maintainer confirms → commit, push,
and check the live files' hashes against local.
