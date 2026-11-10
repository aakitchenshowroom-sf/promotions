// Guard for the public build: nothing internal may reach the page text, and site/forms/ may hold only
// byte-exact copies of the originals of promos that are on the public page.
//   node tools/check-public.mjs   (also runs automatically at the end of `node tools/build.mjs public`)
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, basename, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { locations, readJson, repoDir, sourcePath } from "./lib/paths.mjs";
import { PUBLIC_FIELDS, publishable, downloadsOf, DOWNLOAD_EXT } from "./lib/publish.mjs";
import { readNotices, headerNoticeHtml } from "./lib/notices.mjs";
import { contactVisibilityProblems } from "./lib/contact-visibility.mjs";

// Card text (index.html, app.js, styles.css, promos.json) must never contain these. Personal and store
// identifiers are not listed here (this repo is public); they come from the workspace's
// config/private-terms.json and are added by privatePatterns().
const FORBIDDEN = [
  /\bUMRP\b/, /\bMAP\b/, /\bPMAP\b/, /\bSPIFF\b/i, /\bco-?op\b/i, /dealer cost/i, /MIDDLEBY/i,
  /full retail price/i, /regular price/i, /advertised price/i, /purchase order/i, /distributor/i,
  /internalNotes/, /_preview/, /verifiedAt/, /holdReason/, /"sources"/, /"flags"/, /preview\.js/, /Open original/, /NOT VERIFIED/,
  /OneDrive/i, /Promo info/i, /Promo site data/i, /[A-Z]:\\/, /file:\/\//i, /\/source\//,
];
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function privatePatterns(workspace) {
  const path = join(workspace, "config", "private-terms.json");
  if (!existsSync(path)) throw new Error(`Missing ${path}: the private word list for the public check.`);
  const t = readJson(path);
  // contactAllowed (D-27): the store's street name may appear inside the page's contact blocks only.
  const allowed = new Set(t.contactAllowed ?? []);
  const mark = (w, re) => Object.assign(re, { contactOk: allowed.has(w) });
  return [
    ...(t.wholeWords ?? []).map((w) => mark(w, new RegExp(`\\b${escape(w)}\\b`))),
    ...(t.anywhere ?? []).map((w) => mark(w, new RegExp(escape(w), "i"))),
  ];
}
// Contact blocks rendered by the build (tools/lib/contact.mjs), only in index.html.
const CONTACT_BLOCK = /<!--contact-->[\s\S]*?<!--\/contact-->/g;
const TEXT_FILES = new Set(["index.html", "app.js", "styles.css", "promos.json", ".nojekyll"]);
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

export function checkPublic(siteDir, master, root, workspace) {
  const problems = [];
  const priv = privatePatterns(workspace);
  for (const f of readdirSync(siteDir)) {
    if (f === "forms" && statSync(join(siteDir, f)).isDirectory()) continue;
    if (!TEXT_FILES.has(f)) problems.push(`unexpected file in site/: ${f}`);
  }

  const sourceNames = [...new Set(master.promos.flatMap((p) => p.sources.flatMap((s) => [s.file, basename(s.file)])))];
  for (const f of TEXT_FILES) {
    let text;
    try { text = readFileSync(join(siteDir, f), "utf8"); } catch { problems.push(`missing ${f}`); continue; }
    for (const re of FORBIDDEN) if (re.test(text)) problems.push(`${f}: matches ${re}`);
    // Outside the contact blocks every private term is blocked; inside them, only contactAllowed terms pass.
    const outside = f === "index.html" ? text.replace(CONTACT_BLOCK, "") : text;
    for (const re of priv) {
      if (re.test(outside)) problems.push(`${f}: matches a private term (config/private-terms.json)${re.contactOk ? " outside the contact info" : ""}`);
      else if (!re.contactOk && re.test(text)) problems.push(`${f}: matches a private term (config/private-terms.json) in the contact info`);
    }
    for (const name of sourceNames) if (text.includes(name)) problems.push(`${f}: contains source file name "${name}"`);
  }

  // D-29: the header notice must be on the public page, word for word from web/notices.json, inside the header.
  let index = "";
  try { index = readFileSync(join(siteDir, "index.html"), "utf8"); } catch { /* reported above */ }
  const notice = headerNoticeHtml(readNotices());
  const at = index.indexOf(notice);
  if (at < 0) problems.push("index.html: the header notice from web/notices.json is missing");
  else if (!(index.indexOf("<header") < at && at < index.indexOf("</header>"))) problems.push("index.html: the header notice is not inside the page header");
  if (/<!--(CONTACT|NOTICE):/.test(index)) problems.push("index.html: a contact or notice marker was left unfilled");
  // D-27: at every width, each show room's details are visible in the header or the footer.
  try { problems.push(...contactVisibilityProblems(readFileSync(join(siteDir, "styles.css"), "utf8"))); }
  catch (e) { problems.push(e.message); }

  const pub = JSON.parse(readFileSync(join(siteDir, "promos.json"), "utf8"));
  const byId = new Map(master.promos.map((p) => [p.id, p]));
  const expectedForms = new Map(); // public name -> source path
  for (const p of pub.promos) {
    const m = byId.get(p.id);
    if (!m) { problems.push(`public promo ${p.id} not in master data`); continue; }
    if (!publishable(m)) problems.push(`public promo ${p.id} is not publishable (verified ${m.verifiedAt}, hold ${m.hold}, flags ${m.flags})`);
    if (!p.claimSteps?.length) problems.push(`public promo ${p.id} has no claim steps`);
    const extra = Object.keys(p).filter((k) => !PUBLIC_FIELDS.includes(k));
    if (extra.length) problems.push(`public promo ${p.id} has non-public fields: ${extra.join(", ")}`);
    for (const d of downloadsOf(m)) expectedForms.set(d.publicName, sourcePath(root, d.source.folder, d.source.file));
    const hrefs = (p.downloads ?? []).map((d) => d.href);
    const want = downloadsOf(m).map((d) => `forms/${d.publicName}`);
    if (hrefs.join("|") !== want.join("|")) problems.push(`public promo ${p.id} download links ${hrefs} != ${want}`);
  }
  const extraTop = Object.keys(pub).filter((k) => !["campaignName", "publishedAt", "promos"].includes(k));
  if (extraTop.length) problems.push(`site/promos.json has extra top-level keys: ${extraTop.join(", ")}`);

  let forms = [];
  try { forms = readdirSync(join(siteDir, "forms")); } catch { /* no forms yet */ }
  for (const f of forms) {
    if (!DOWNLOAD_EXT.includes(extname(f).toLowerCase())) problems.push(`forms/${f}: file type not allowed`);
    const src = expectedForms.get(f);
    if (!src) { problems.push(`forms/${f} does not belong to a public promo`); continue; }
    if (sha(join(siteDir, "forms", f)) !== sha(src)) problems.push(`forms/${f} differs from its original`);
  }
  for (const name of expectedForms.keys()) if (!forms.includes(name)) problems.push(`forms/${name} missing`);
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { promosPath, root, workspace } = locations();
  const problems = checkPublic(join(repoDir, "site"), readJson(promosPath), root, workspace);
  if (problems.length) { console.error("PUBLIC CHECK FAILED:\n  - " + problems.join("\n  - ")); process.exit(1); }
  console.log("Public check passed.");
}
