// Pre-push scan of the whole git history for private information (run before every push).
//   node tools/scan-history.mjs [--repo <dir>]
// It reads every version of every file in every commit reachable from any local or remote branch, every file
// path, every commit message, and every commit's author and committer, and reports:
//   - private terms from the workspace's config/private-terms.json (never stored in this repo). Terms listed
//     in contactAllowed (the show rooms' street names, D-27) are allowed only in web/contact.json and inside
//     the <!--contact--> blocks of site/index.html, the same rule as the public check;
//   - local paths that would reveal a user folder (a drive letter followed by the Users folder);
//   - email addresses other than GitHub noreply addresses, the store's public emails (web/contact.json,
//     allowed in web/contact.json and site/index.html only) and reserved example/test domains (.invalid, …);
//   - commits whose author or committer email is not a GitHub noreply address.
// The original brand files in site/forms/ are not scanned: they are byte-exact copies of the originals and
// carry the store's imprint by decision (D-28). Terms are reported by their position in the list, never shown.
// Exit code 1 when anything is found.
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { locations, repoDir as defaultRepo } from "./lib/paths.mjs";
import { privatePatterns } from "./check-public.mjs";

const CONTACT_BLOCK = /<!--contact-->[\s\S]*?<!--\/contact-->/g;
const CONTACT_FILES = new Set(["web/contact.json", "site/index.html"]);
const SKIP = (path) => path.startsWith("site/forms/");
const USER_PATH = /[A-Za-z]:\\+Users\\+|\/c\/Users\/|\/Users\/[A-Za-z]/;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const NOREPLY = /^(noreply@|[^@]+@users\.noreply\.github\.com$)/i;
// Domains reserved for examples and tests (RFC 2606 / 6761): never a real mailbox, so allowed (used by the tests).
const RESERVED = /@([\w-]+\.)*(example\.(com|org|net)|example|invalid|test|localhost)$/i;

export function scanHistory(repo, workspace) {
  const git = (args, input) => execFileSync("git", ["-C", repo, ...args], { input, maxBuffer: 1 << 30 });
  const patterns = privatePatterns(workspace).map((re, i) => Object.assign(re, { label: `private term ${i + 1}` }));
  const contactPath = join(repo, "web", "contact.json");
  const storeEmails = new Set();
  if (existsSync(contactPath)) {
    const c = JSON.parse(readFileSync(contactPath, "utf8"));
    for (const s of c.stores ?? []) if (s.email) storeEmails.add(s.email.toLowerCase());
    if (c.email) storeEmails.add(c.email.toLowerCase());
  }
  const findings = new Map(); // key -> text (deduplicated per path and kind)
  const add = (key, text) => { if (!findings.has(key)) findings.set(key, text); };

  // 1. Every blob reachable from any branch, with the path(s) it appears under.
  const objects = git(["rev-list", "--objects", "--branches", "--remotes"]).toString().trim().split("\n")
    .filter(Boolean).map((l) => { const i = l.indexOf(" "); return i < 0 ? [l, null] : [l.slice(0, i), l.slice(i + 1)]; });
  const withPath = objects.filter(([, p]) => p);
  const types = git(["cat-file", "--batch-check=%(objectname) %(objecttype)"], withPath.map(([s]) => s).join("\n") + "\n")
    .toString().trim().split("\n").map((l) => l.split(" "));
  const blobs = withPath.filter((_, i) => types[i][1] === "blob");
  let scanned = 0, skipped = 0;
  for (const [sha, path] of blobs) {
    for (const re of patterns) if (re.test(path)) add(`${path}|path|${re.label}`, `${path}: the file path contains ${re.label}`);
    if (SKIP(path)) { skipped++; continue; }
    scanned++;
    const text = git(["cat-file", "blob", sha]).toString("utf8");
    const outsideContact = path === "site/index.html" ? text.replace(CONTACT_BLOCK, "") : path === "web/contact.json" ? "" : text;
    for (const re of patterns) {
      const where = re.contactOk ? outsideContact : text;
      if (re.test(where)) add(`${path}|${re.label}`, `${path}: ${re.label}${re.contactOk ? " outside the contact info" : ""} (blob ${sha.slice(0, 7)})`);
    }
    if (USER_PATH.test(text)) add(`${path}|userpath`, `${path}: a local path with a user folder (blob ${sha.slice(0, 7)})`);
    for (const m of text.match(EMAIL) ?? []) {
      const e = m.toLowerCase();
      if (NOREPLY.test(e) || RESERVED.test(e)) continue;
      if (storeEmails.has(e) && CONTACT_FILES.has(path)) continue;
      add(`${path}|email|${e}`, `${path}: email address ${m} (blob ${sha.slice(0, 7)})`);
    }
  }

  // 2. Every commit: message, author and committer.
  const SEP = "\x1e";
  const log = git(["log", "--branches", "--remotes", `--format=%H%x1f%an%x1f%ae%x1f%cn%x1f%ce%x1f%B${SEP}`]).toString();
  const commits = log.split(SEP).map((c) => c.replace(/^\n/, "")).filter((c) => c.trim());
  for (const c of commits) {
    const [hash, an, ae, cn, ce, body] = c.split("\x1f");
    const short = hash.slice(0, 7);
    const whole = [an, ae, cn, ce, body].join("\n");
    for (const re of patterns) if (re.test(whole)) add(`${short}|msg|${re.label}`, `commit ${short}: message or author contains ${re.label}`);
    for (const e of [ae, ce]) if (!/@users\.noreply\.github\.com$/i.test(e)) add(`${short}|author|${e}`, `commit ${short}: author or committer email ${e} is not a GitHub noreply address`);
    for (const m of body.match(EMAIL) ?? []) if (!NOREPLY.test(m)) add(`${short}|msgemail|${m}`, `commit ${short}: message contains email address ${m}`);
    if (USER_PATH.test(body)) add(`${short}|msgpath`, `commit ${short}: message contains a local path with a user folder`);
  }
  const authors = [...new Set(commits.map((c) => { const p = c.split("\x1f"); return `${p[1]} <${p[2]}> | ${p[3]} <${p[4]}>`; }))];
  return { findings: [...findings.values()], commits: commits.length, blobs: scanned, skipped, authors };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf("--repo");
  const repo = i > 0 ? resolve(process.argv[i + 1]) : defaultRepo;
  const r = scanHistory(repo, locations().workspace);
  console.log(`Scanned ${r.commits} commits and ${r.blobs} file versions (${r.skipped} original brand files in site/forms/ not scanned, D-28).`);
  console.log(`Authors and committers: ${r.authors.join("; ")}`);
  if (r.findings.length) { console.error("PRIVATE INFORMATION FOUND:\n  - " + r.findings.join("\n  - ")); process.exit(1); }
  console.log("No private terms, user paths, private emails or non-noreply authors in the history.");
}
