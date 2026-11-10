// Fingerprint every file in the active folders (minus exclusions): size, mtime, sha256.
//   node tools/fingerprint.mjs            -> print the list and the diff against data/fingerprints.json
//   node tools/fingerprint.mjs --save     -> also write data/fingerprints.json (only after the maintainer confirms)
// Cloud-only OneDrive files are listed and skipped; reading them would download them.
import { createHash } from "node:crypto";
import { readdirSync, statSync, createReadStream, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { join, relative, sep, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { locations, readJson } from "./lib/paths.mjs";

const { root, active, fingerprintsPath } = locations();
const save = process.argv.includes("--save");
const toRel = (p) => relative(root, p).split(sep).join("/");
const excluded = new Set(active.exclude ?? []);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (excluded.has(toRel(full))) continue;
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

// Windows attribute bits: RECALL_ON_DATA_ACCESS 0x400000, RECALL_ON_OPEN 0x40000, OFFLINE 0x1000
// Paths go through a UTF-8 temp file (stdin would mangle names like Robam_黑五_Promo.jpg); the
// result comes back as indexes so no file name has to survive console encoding.
function cloudOnly(paths) {
  if (process.platform !== "win32" || paths.length === 0) return new Set();
  const listFile = join(mkdtempSync(join(tmpdir(), "promo-fp-")), "paths.txt");
  writeFileSync(listFile, paths.join("\n"), "utf8");
  const script = `$ErrorActionPreference='Stop'; $i=0; foreach ($p in (Get-Content -LiteralPath '${listFile}' -Encoding UTF8)) { $a=[int](Get-Item -LiteralPath $p -Force).Attributes; if (($a -band 0x400000) -or ($a -band 0x40000) -or ($a -band 0x1000)) { $i }; $i++ }`;
  const out = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8" });
  rmSync(dirname(listFile), { recursive: true, force: true });
  return new Set(out.split(/\r?\n/).filter(Boolean).map((i) => paths[Number(i)]));
}

const hashFile = (p) => new Promise((resolve, reject) => {
  const h = createHash("sha256");
  createReadStream(p).on("data", (d) => h.update(d)).on("end", () => resolve(h.digest("hex"))).on("error", reject);
});

const files = active.activeFolders.flatMap((f) => walk(join(root, ...f.split("/")))).sort();
const cloud = cloudOnly(files);
const now = {};
for (const f of files) {
  if (cloud.has(f)) continue;
  const st = statSync(f);
  now[toRel(f)] = { size: st.size, mtime: st.mtime.toISOString(), sha256: await hashFile(f) };
}

const before = existsSync(fingerprintsPath) ? readJson(fingerprintsPath).files : {};
const added = Object.keys(now).filter((k) => !before[k]);
const changed = Object.keys(now).filter((k) => before[k] && before[k].sha256 !== now[k].sha256);
const removed = Object.keys(before).filter((k) => !now[k] && !cloud.has(join(root, ...k.split("/"))));

console.log(`Active folders: ${active.activeFolders.join(", ")}`);
console.log(`Files hashed: ${Object.keys(now).length}`);
const list = (label, items) => { console.log(`${label}: ${items.length}`); for (const i of items) console.log(`  - ${i}`); };
list("New", added);
list("Changed", changed);
list("Deleted", removed);
list("Cloud-only (skipped, not downloaded)", [...cloud].map(toRel));

if (save) {
  writeFileSync(fingerprintsPath, JSON.stringify({ savedAt: new Date().toISOString(), activeFolders: active.activeFolders, files: now }, null, 2) + "\n");
  console.log(`Saved ${fingerprintsPath}`);
}
