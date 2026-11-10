# Handoff

A one-page site listing manufacturer promotions and rebates for AA Kitchen's customers, built from the
brand material the maintainer keeps in OneDrive. Start a new session with: "Read docs/HANDOFF.md".

## Status (2026-11-09, end of round 2)

- Visual design is final (decisions D-23, D-24).
- 24 promotions are in the workspace data. **3 verified** (round 3, first batch: #2 Bosch, #20 Speed Queen,
  #13 Whirlpool + Maytag); the public build shows those 3.
- **4 on hold**, waiting for the maintainer's answers.
- Committed locally; **nothing pushed**. The GitHub repository exists (D-10) but is still empty.
- **Push paused** for a style-only round (D-26) and the store contact info (D-27). Version A is now the real
  page (with dark mode). **Next:** the maintainer confirms the screenshots of `/public/` → back to "Before
  every push".
- Git operations that need the maintainer's OK first: see D-25.
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
   `geesonchan` as collaborator, Pages source "GitHub Actions". Add the Pages workflow on the first deploy.
2. **Author email:** every commit to be pushed has author and committer email
   `20552271+geesonchan@users.noreply.github.com`; no private address anywhere
   (`git log --format='%an <%ae> | %cn <%ce>' origin/main..HEAD`, or all commits before the first push).
3. **Public file list:** list every tracked file (`git ls-files`) and every file in `site/` and `site/forms/`
   for the maintainer to review. No source document outside `site/forms/`, no `local.config.json`, nothing
   from the workspace.
4. **Tests:** `node tools/build.mjs public` and `node tools/test-public.mjs` pass.
5. Push only after the maintainer confirms.
6. **Live check:** after the Pages deploy, download each published file from the live site and compare its
   sha256 with the local `site/` file. Report any mismatch.

## Round plan

1. Round 1: read-only inventory (done)
2. Round 2: local repo, data, page, visual design, local preview (done)
3. Round 3: deploy in batches (D-16). Each batch: verify → build → preview → maintainer confirms → push →
   check live hashes.
4. Round 4: folder-selection script and `docs/UPDATE.md` ("read docs/UPDATE.md and run the update")

Each round: read-only plan → maintainer confirms → work → local preview → maintainer confirms → commit, push,
and check the live files' hashes against local.
