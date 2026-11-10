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
- **D-27 Store contact info (updated 2026-11-10 for two show rooms, see D-31).** No logo. Phone and email
  matter equally.
  - Company name "AA Kitchen Appliance, Inc." and two show rooms, SF Show Room and San Mateo Show Room, each
    with its street, city, phone numbers ("T: …") and, for SF, the email; written exactly as the maintainer
    gave them.
  - Header, desktop: company name on the left; the two show rooms side by side on the right, each column under
    its own small heading. Header, phone (390px): only the company name and two buttons, "Call SF Show Room"
    and "Call San Mateo Show Room", each dialing that show room's first number, at least 48px high.
  - Footer: one card with both show rooms in full (side by side on desktop, stacked on phones), then the
    company website; on phones every phone number and the email are 48px tap targets.
  - Every phone number is a `tel:` link, the email a `mailto:` link, the website a plain link, addresses
    plain text.
  - (Before 2026-11-10: one store; phone and email side by side in a dark header band, the address below.)
  - The values live in `web/contact.json` (public information; one place to change them); the build writes
    them into the page at `<!--CONTACT:head-->` / `<!--CONTACT:foot-->`.
  - The public check allows the show rooms' street names (both of them, since 2026-11-10) only inside these
    contact blocks (listed as `contactAllowed` in the workspace's private-terms file); in promotion text and
    anywhere else on the page they are still blocked, and all other private terms stay blocked everywhere.
    `tools/test-public.mjs` tests each street name, every `tel:` link and the two call buttons.
- **D-28 Store imprint inside original files: a known, accepted exception.** Some brand claim forms carry
  the store's imprint (store name, dealer number, address), for example the Bosch and the Whirlpool + Maytag
  forms in batch 1. Under D-12 these originals are published byte-for-byte, imprint included; the maintainer
  confirmed this on 2026-11-09. The public check covers the page text only (index.html, app.js, styles.css,
  promos.json) and does not look inside the files in `site/forms/`; it only checks that each one is an
  exact copy of its original. Before each push, the maintainer is told which store information appears in
  each new file. The private terms list still applies to all page text.
- **D-29 Disclaimer and header notice (replaces the D-14 draft).** Final wording from the maintainer,
  2026-11-09, kept word for word in `web/notices.json` (one place to change it); the build writes it into
  the page.
  - Header notice: under the campaign name and intro, above the brand buttons; a light, bordered box;
    "Important:" in bold, the rest regular; always shown in full on desktop and phone. The public check
    fails the build if the notice is missing or not inside the page header.
  - Footer: "Disclaimer" with an intro sentence, six points and a closing sentence, above the listing note.
  - Under each promotion's download links: "See the official terms for full details."
  - The page intro no longer starts with "Manufacturer", so it does not repeat the notice.
- **D-30 Chinese version: cancelled.** A Simplified Chinese version was planned and drafted on 2026-11-09
  (language switch, translated text with its own checking status, number-consistency check). The
  maintainer cancelled it the same day: keeping translations accurate and checking them again after every
  English change costs more than it is worth. The page stays English only. The draft is kept on the local
  branch `zh-draft` (not pushed); the draft translations are kept in the private workspace notes. Nothing of
  it was published.

## Update round (2026-11-10)

- **D-31 Card layout (relaxes D-23 and D-26; replaces the look of version A).** The maintainer gave a reference
  for a modular card layout with clear edges between modules; only its layout and hierarchy are used, not its
  colors, logo or text.
  - Now allowed: larger rounded corners (cards 12px, buttons 8px, tags 6px), solid buttons, small tinted
    tags, a dark emphasis card.
  - Still not allowed: gradients, glow, large shadows, pill-shaped tags, emoji, marketing copy.
  - Header: white, company name in the store red, bold, 32px (24px on phones); contact as in D-27.
  - Below the header a dark navy rounded card holds the campaign name, the intro and the Important notice
    (D-29 text unchanged; the notice sits on a slightly lighter navy panel inside the card).
  - Page: very light grey; every module is a white rounded card: brand buttons, search and More filters, one
    card per brand, the footer contact card and the Disclaimer card. 24px between modules, 32px between brand
    cards (16px and 24px on phones). Content width stays about 960px.
  - Brand buttons: rounded, bordered; the chosen one solid dark with white text.
  - Brand card: brand name large and bold at the top; each promotion inside it is a light block, 16px apart.
    Amount in the store red and the largest text; "how you get it" and "Ending soon" as tinted tags;
    "Details" a solid dark button; downloads bordered secondary buttons; Details open inside the same block.
  - Footer: the two show rooms' card first, then the Disclaimer card, which stays last on the page.
  - Colors (all text reaches 4.5:1 on its own background):
    - Store red `#c43a2b` for the company name and the amounts: 5.27:1 on white, 4.83:1 on the light promotion
      block `#f4f5f7`. The maintainer's reference red `#d0402f` reaches 4.71:1 on white but only 4.32:1 on the
      block, so it was darkened slightly and one red is used for both.
    - Light mode: page `#f1f2f4`, cards white, dark navy `#16213a` for the emphasis card and solid buttons
      (white text 16:1), notice panel `#24314f` (12.9:1), secondary text `#555b66` (6.3:1 on the block).
      Tags: Instant `#17532d` on `#e2f1e7` (7.8:1), claim `#1d4479` on `#e3ebf7` (8.1:1), Ending soon
      `#6a3f00` on `#fbe9c8` (7.6:1).
    - Dark mode, same hierarchy: page `#0f1115`, cards `#181b21`, blocks `#22262e`; red `#ff8a7a` (6.6:1 on
      the block); emphasis card `#1a2744` with a 1px edge; solid buttons light `#e6e9ef` with dark text
      (15:1), the strongest emphasis on a dark page; tags on dark tints, all above 8:1.
  - Decided with the maintainer: the red above; width 960px; footer order contact card, then Disclaimer;
    light solid buttons in dark mode. At most one more visual adjustment after this round.
