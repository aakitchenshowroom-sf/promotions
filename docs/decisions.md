# Decisions

General decisions only. Brand-specific notes live in the private workspace.

## Round 1 (2026-11-09)

- **D-1 Data location.** `promos.json`, config and fingerprints live in a private OneDrive workspace, not in
  this public repo. The repo holds the page, the tools and the consumer-only public data.
- **D-2 Docs are public.** This file and HANDOFF.md hold process and general decisions only, and name no
  person; they say "the maintainer" or "store staff".
- **D-3 Two fields for the offer type.** `benefit` (what the customer gets) and `redemption` (what the customer
  does: taken off at checkout, claim online/mail, register in an app, free item with the order).
- **D-4 Shared programs.** One promotion offered for several brands is one card listing all of them; an
  identical file stored twice is offered once.
- **D-5 Price clauses.** Clauses about the price the product must be sold at are never written on a card. The
  card says: "Cannot be combined with other discounts — ask our team for details."
- **D-6 Holds.** A promotion with an open question stays in the data, unverified or on hold, and off the page.
- **D-7 Ending soon** = last purchase day within 7 days. Expired promotions hide by the Pacific date in the
  browser, without republishing.
- **D-8 "Last updated"** shows the date the data was last published, not the build time.
- **D-9 Fixed address.** The page lives at `/promotions/`, independent of the campaign.

## Round 2 (2026-11-09)

- **D-10 Deployment.**
  - The company GitHub account `aakitchenshowroom-sf` (a personal account) owns the public repository
    `promotions`; `geesonchan` is a collaborator and pushes with its existing login. No company-account
    credentials are set up or stored on this machine.
  - Pages source: GitHub Actions. The maintainer reported the repository, the collaborator invitation and the
    Pages setting done on 2026-11-09; round 3 confirms this again before the first push.
  - Commit author: `geesonchan`'s GitHub noreply address, set in this repository only. Before the first push,
    every commit's author and committer email is checked; no private address may appear.
  - Before pushing, the maintainer gets the full list of public files to review.
- **D-11 Only verified, settled promotions are public.** Published = verified, not on hold, no open
  `claim-form` question, and has claim steps. The public build checks this and fails otherwise.
- **D-12 Original files are downloadable.** The original brand files may be public, including store-imprinted
  claim forms and flyers. The build copies to `site/forms/` only the files of promotions on the public page,
  renamed by promotion id, and checks each copy byte-for-byte. Link text: "Claim form & full terms (PDF)",
  "Full terms (PDF)", or "Promotion flyer" for images. Card text rules (D-5, no dealer terms or routing notes)
  are unchanged.
- **D-13 Translations.** A non-English flyer gets an English translation on its card; it stays unverified until
  the maintainer checks the translation in the preview.
- **D-14 Disclaimer.** The draft text is in use until the maintainer and the owner approve the final wording.
- **D-15 Repo location.** `%USERPROFILE%\Projects\promotions`, outside OneDrive (moved from Downloads before the
  first commit).
- **D-16 Batches.** Verified promotions go live in batches, without waiting for all of them. Each batch:
  build → preview → maintainer confirms → push → check the live files' hashes against local.
- **D-17 Other repositories are never touched.** Not even a temporary edit that is reverted right after. The
  app's preview tool uses only this repo's `.claude/launch.json`; if it cannot read it, the maintainer is told
  and `preview.bat` is the fallback.
- **D-18 Claim steps (plain English, one action per sentence).** Nothing the store does is promised.
  - Online link in the file: "Claim online at <link from the file> by <claim date>. The claim form and full
    terms are below."
  - Mail-in only: "Download the claim form below. Fill it in and mail it as the form says, by <claim date>.
    Keep a copy of your invoice."
- **D-19 Brand upgrade prices.** Upgrade prices printed on a brand's own flyer may show on the card.
- **D-20 Campaign name** on the page: "Black Friday & Holiday Savings 2026" (set in the workspace config).
- **D-22 Preview in a session.** Run this repo's `tools/serve.mjs` in the background, take the screenshots,
  stop it at once and check the port is free (see HANDOFF).
- **D-23 Visual rules (redesign, first pass).**
  - A list grouped by brand. Desktop: a fixed 176px left column holds the amount (and at most one status tag,
    "Ending soon"); the right column holds the rest. All amount columns share one left edge. Phone: one
    column, amount first.
  - Item order: amount | title → summary → how you get it → tiers → dates → how to claim (offer code and
    payout inside) → conditions → translation → eligible models (collapsed) → downloads. Empty rows are
    not shown.
  - Dates: "Buy by" and "Claim by" in a fixed label column, "Dec 2, 2026" format; "Starts", "Delivered by"
    and "Serial numbers by" only when present.
  - How you get it: two functional colors only. Green: "Instant — taken off at checkout" and "Included
    when you order" (gift with order). Blue: "You claim it after purchase". Both reach WCAG AA (4.5:1) in
    light and dark mode.
  - One promotion for several brands appears in full under its first brand; the other brands get a
    one-line pointer. With a brand filter set, it appears in full under that brand.
  - No shadows, gradients or filled boxes; 1px lines only. Radius 2px on form controls, 0 elsewhere.
    One font, sizes 28/20/16/14, tabular numbers, bold only on brand names and amounts, spacing in
    multiples of 8px. Accent color: near-black ink until the company color is set.
  - The review strip in the preview sits above an item's two columns and does not affect alignment.
- **D-24 Visual rules (redesign, second and last pass).** Replaces the item layout in D-23; the other
  D-23 rules stand.
  - Brand buttons at the top: "All", then the brands with current promotions, A–Z. Desktop: a wrapping row
    (two lines at most). Phone: a 3-column grid that collapses to one "Brand ✕" button once a brand is
    picked. Picked state uses the accent color. A promotion for several brands shows under each brand's
    button.
  - Search under the brand buttons. Product, how you get it and Ending soon sit in a "More filters"
    section, closed by default; its label shows how many are on.
  - Each item shows a summary only: left column amount (+ at most "Ending soon"); right column title,
    one-line summary, "how you get it · Buy by · Claim by", then "Details" and the download links.
    Details hold tiers, other dates, how to claim, conditions, translation and the eligible models
    (collapsed again). A model search hit opens Details and the model list and marks the model.
  - Inside Details on desktop, tiers, dates and claim facts share one value edge.
  - Preview review strip: one line (number, status, Open original); "Notes" opens the rest.
  - Left-column headlines: Viking "Up to $5,318" (the MSRP basis is in the summary), Fulgor "Up to $5,368".
  - Final touch: brand buttons show the brand name only, no count; "Fulgor Milano" reads "Fulgor" on its
    button. On a 390px phone every button is one line and all have the same height.
- **D-21 Private terms.** Personal and store identifiers that the public check blocks are listed in the
  workspace (`config/private-terms.json`), so the public repo does not contain them.

## Round 3 (2026-11-09)

- **D-25 Git operations that need the maintainer's OK.** Before running any of these, ask the maintainer
  first and say why and what it changes: push, stash, reset, rebase, clean, checkout or restore of files,
  deleting a branch, rewriting history, and anything with `--force`. Commit needs no OK, but before every
  commit list the files it contains.
- **D-26 Style round (relaxes two D-23 rules).** The first batch is verified, but the push waits for one
  style-only round.
  - Now allowed: a very light page background and 1px borders to separate blocks; the accent color on amounts.
  - Still not allowed: gradients, large shadows, pill-shaped tags, emoji, marketing copy.
  - Goals: a real header with a prominent store name, clearly separated from the content; brand names as
    full-width group bars that cannot be mistaken for amounts; each promotion (and each "see under" pointer)
    in its own white, bordered block, 16px apart inside a group and 48px between groups; the amount one size
    above the title and in the accent color. Content width about 960px.
  - Two versions were compared in the preview; the maintainer chose **version A**: a near-black header band
    with the store name (28px bold), phone and address; the campaign name and intro just below it. Version B
    (light header) and the preview's style switch were removed.
  - Amount accent: deep red `#8c1c22` (9.1:1 on white). Blue and green are already the two functional colors
    ("You claim it after purchase", "Instant"), so a blue amount would read as one of them. Dark mode uses
    a lighter red `#f4847e` (6.8:1 on the dark block background); the header band turns black with a 1px
    edge against the dark page.
- **D-27 Store contact info.** No logo. Phone and email matter equally.
  - Header band: store name, phone, email, address. Desktop: phone and email side by side, same size and
    weight; address on the next line, one size smaller. Phone (390px): phone and email on their own lines,
    each a 48px tap target, 8px apart, same size (20px), never wrapped; address below.
  - Footer, above the disclaimer: store name, phone, address, then the website and the email.
  - Phone is a `tel:` link, email a `mailto:` link, website a plain link, address plain text.
  - The values live in `web/contact.json` (public information; one place to change them); the build writes
    them into the page at `<!--CONTACT:head-->` / `<!--CONTACT:foot-->`.
  - The public check allows the store's street name only inside these contact blocks (listed as
    `contactAllowed` in the workspace's private-terms file); in promotion text and anywhere else on the page
    it is still blocked, and all other private terms stay blocked everywhere.
- **D-28 Store imprint inside original files: a known, accepted exception.** Some brand claim forms carry
  the store's imprint (store name, dealer number, address), for example the Bosch and the Whirlpool + Maytag
  forms in batch 1. Under D-12 these originals are published byte-for-byte, imprint included; the maintainer
  confirmed this on 2026-11-09. The public check covers the page text only (index.html, app.js, styles.css,
  promos.json) and does not look inside the files in `site/forms/`; it only checks that each one is an
  exact copy of its original. Before each push, the maintainer is told which store information appears in
  each new file. The private terms list still applies to all page text.
