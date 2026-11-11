# Update

How to bring the site up to date when brand files in the active folders are added, changed or removed.
The maintainer starts it with: "Read docs/UPDATE.md and run the update" (读 docs/UPDATE.md，执行更新).

Read `docs/HANDOFF.md` first for where things are, and `docs/decisions.md` for the standing rules. In
particular: git operations listed in D-25 need the maintainer's OK first (commit does not, but list its files
first); nothing internal goes into this public repo; write `verifiedAt` only for the items the maintainer
names; the Chinese version is cancelled (D-30).

The steps below stop twice for the maintainer: after the change list (step 3) and after the preview
(step 5). Do not go past a stop without an answer.

## 1. Fingerprint comparison

```
node tools/fingerprint.mjs
```

It hashes every file in the active folders (`config/active.json` in the workspace) and compares them with
`data/fingerprints.json`. Report the four lists exactly as printed: **new**, **changed**, **deleted**,
and **cloud-only** (OneDrive placeholders not downloaded; they are skipped, never downloaded by the tool).
Do not save the fingerprints yet.

If nothing is new, changed or deleted, say so and stop.

## 2. Reread only the files that changed

- Read only the new and changed files. Do not reread unchanged files.
- For a changed file, compare it with what the data says now (`sources[].file` in `data/promos.json`) and
  list each difference.
- For a deleted file, list the promotions whose `sources` use it.
- Text: `pdftotext -layout` for the page as a whole, and `pdftotext -raw` (reading order) for tables.
- **Multi-column tables (model lists, amount tables) must be checked against a rendered image of the page.**
  Text extraction can shift a column by one row (the Bosch model list did this in 2026-11). Render the page
  with the Windows PDF renderer (Windows.Data.Pdf, read-only), cut it into one image per column, and compare
  every line of the extraction with the image: model, amount, blanks and dashes. Count the lines per column
  and in total. List any difference first.
- Image-only files (JPG, scanned PDFs): read them page by page from the image.
- Note anything addressed to dealers rather than customers (reimbursement, dealer conditions, contacts,
  store imprints, distributor logos). It stays off the card, and the maintainer decides about downloads.

## 3. Change list (stop)

Per promotion, report:

- the number (`#n`), id and title; whether it is new, changed or affected by a deleted file;
- what changed, field by field (amounts, dates, models, conditions, claim steps, links);
- which file and page it comes from;
- open questions for the maintainer (dealer eligibility, combining with other offers, unclear dates).

Stop and wait for the maintainer's answers.

## 4. Apply the answers to the workspace data

- Back up `data/promos.json` to the scratchpad before writing.
- New promotions get the next free `n`, `verifiedAt: null` and `hold` as the maintainer says.
- A changed promotion gets `verifiedAt: null` again when its amount, dates or models change.
- Card text uses only what the file states; nothing inferred (for example sizes read from model numbers).
- Downloads: `sources[].download` is `claim-form-terms`, `terms`, `flyer`, `duplicate` or `null` (not
  public). The labels are in `tools/lib/publish.mjs`.
- Open questions go to the workspace `notes/open-items.md`, not to this repo.
- Show the diff of the data (which promotions and which fields changed) and nothing else.

## 5. Preview for verification (stop)

```
node tools/build.mjs preview
node tools/serve.mjs            (in the background)
```

Show only the new and changed items: `http://127.0.0.1:4317/?only=<id>,<id>`. For long model lists, give the
maintainer the list one line per model ("model → amount"), grouped under the original headings, with the
differences found in step 2 first. Stop and wait.

## 6. After the maintainer verifies

1. Write today's date into `verifiedAt` for exactly the items named. Change nothing else.
2. Save the fingerprints: `node tools/fingerprint.mjs --save`, then run it again and confirm 0 new,
   0 changed, 0 deleted.
3. Rebuild: `node tools/build.mjs public` (the public check runs at the end and must pass) and
   `node tools/build.mjs preview`.
4. Report the number of published promotions and download files, and confirm that each new file in
   `site/forms/` is byte-identical (sha256) to its original.

## 7. Before the push

1. **Store information in new files (D-28):** for each new file in `site/forms/`, extract its text and
   search it for the store's name, phone, address, email, website and dealer number, and the private terms
   in the workspace `config/private-terms.json`. Look at each page as an image too (stamps, imprints).
   Read the file properties (author, creator, producer, title). Report what was found per file.
2. **Commits:** usually three, each with its file list shown before it is made:
   - data and files: `site/promos.json` and the new or changed `site/forms/` files;
   - code or style fixes, if any (`web/`, `tools/`, and the matching `site/` files);
   - docs (`docs/`).
   Author and committer: `geesonchan <20552271+geesonchan@users.noreply.github.com>`.
3. **History scan (private terms and author email):** `node tools/scan-history.mjs`. It reads every version
   of every file in every commit (all branches), every file path, every commit message and every author and committer, and must end with "No
   private terms, user paths, private emails or non-noreply authors in the history." It checks the private
   terms from the workspace `config/private-terms.json` (the street names only allowed in `web/contact.json`
   and inside the page's contact blocks, as in the public check), local user paths, email addresses other
   than GitHub noreply and the store's public email (in the contact files only), and that every author and
   committer email is a GitHub noreply address. It prints the authors it found: they must all be
   `geesonchan <20552271+geesonchan@users.noreply.github.com>`. The original
   brand files in `site/forms/` are not scanned (D-28). Terms are reported by number, never shown.
4. **Tests:** `node tools/build.mjs public` and `node tools/test-public.mjs` pass. The public build includes the
   contact visibility check and the contrast check (D-32): any text below 4.5:1 in any state, light or dark,
   fails the build.
5. **Screenshots when the page's look changed (styles, template, contact info):** light and dark mode, phone
   (390px) and desktop (1440px). They must include, in dark mode, every interactive state: a chosen brand
   button, the collapsed brand button on a phone ("Brand ✕"), Details open, More filters open, the search box
   while typing, a search hit in the model list, links on hover and when pressed, and the keyboard focus ring.
   The contrast check (D-32) covers the colors of these states in the build; the screenshots are the visual
   check of the same states.
6. **Public file list:** `git ls-files` and the files in `site/` and `site/forms/`.
7. Push only when the maintainer says so (D-25): `git push origin main`.

## 8. After the push: compare with the live site

1. Confirm the Actions run (`.github/workflows/pages.yml`) started by itself and succeeded
   (`gh run list --workflow pages.yml`). If it did not start, `gh workflow run pages.yml` (ask first).
2. Download every file in `site/` from https://aakitchenshowroom-sf.github.io/promotions/ and compare its
   sha256 with the local file. Pages can take a minute to serve the new version; retry before reporting.
3. Check that the new download links and the new claim links open (HTTP 200, the right file or site).
4. Report any mismatch.

## 9. Finish

- Stop the preview server and check that port 4317 is free (D-22).
- Update the status in `docs/HANDOFF.md` when the count of published promotions changes.
