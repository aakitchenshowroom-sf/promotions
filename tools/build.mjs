// Build the page from the workspace's data/promos.json.
//   node tools/build.mjs public   -> site/      (committed, published): verified, not held, consumer fields only,
//                                                plus site/forms/ with the original files of those promos
//   node tools/build.mjs preview  -> .preview/  (local only, never committed): every promo plus review info
// The public build runs the public check afterwards and fails if anything internal slipped through.
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { locations, readJson, repoDir, sourcePath } from "./lib/paths.mjs";
import { publishable, downloadsOf, pick } from "./lib/publish.mjs";
import { checkPublic } from "./check-public.mjs";

const mode = process.argv[2];
if (!["public", "preview"].includes(mode)) {
  console.error("Usage: node tools/build.mjs public|preview");
  process.exit(2);
}

const { active, promosPath, root, workspace } = locations();
const master = readJson(promosPath);
const web = (f) => readFileSync(join(repoDir, "web", f), "utf8");

function write(dir, files) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text.replace(/\r\n/g, "\n"));
}

const pub = master.promos.filter(publishable);

if (mode === "public") {
  const out = join(repoDir, "site");
  const promos = pub.map((p) => ({ ...pick(p), downloads: downloadsOf(p).map((d) => ({ label: d.label, href: `forms/${d.publicName}` })) }));
  write(out, {
    "index.html": web("index.html").replace("  <!--PREVIEW-->\n", "").replace("<!--PREVIEW-->", ""),
    "app.js": web("app.js"),
    "styles.css": web("styles.css"),
    "promos.json": JSON.stringify({ campaignName: active.campaignName, publishedAt: master.publishedAt ?? null, promos }, null, 1) + "\n",
    ".nojekyll": "",
  });
  // Only the files of promos on the public page are copied; nothing unverified goes out early.
  mkdirSync(join(out, "forms"), { recursive: true });
  let copied = 0;
  for (const p of pub) for (const d of downloadsOf(p)) {
    copyFileSync(sourcePath(root, d.source.folder, d.source.file), join(out, "forms", d.publicName));
    copied++;
  }
  console.log(`Public build: ${pub.length} of ${master.promos.length} promos, ${copied} download files -> site/`);
  const problems = checkPublic(out, master, root, workspace);
  if (problems.length) {
    console.error("PUBLIC CHECK FAILED:");
    for (const p of problems) console.error("  - " + p);
    process.exit(1);
  }
  console.log("Public check passed.");
} else {
  const out = join(repoDir, ".preview");
  const href = (s) => "/source/" + [...s.folder.split("/"), ...s.file.split("/")].map(encodeURIComponent).join("/");
  const promos = master.promos.map((p) => ({
    ...pick(p),
    downloads: downloadsOf(p).map((d) => ({ label: d.label, href: href(d.source) })),
    _preview: {
      n: p.n, verifiedAt: p.verifiedAt, hold: p.hold, holdReason: p.holdReason, flags: p.flags,
      internalNotes: p.internalNotes,
      sources: p.sources.map((s) => ({ label: `${s.file}${s.pages === "image" ? "" : ` · p${s.pages}`}${s.download === "duplicate" ? " (identical copy, not offered twice)" : ""}`, href: href(s) })),
    },
  }));
  const builtAt = new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" });
  write(out, {
    "index.html": web("index.html").replace("<!--PREVIEW-->", '<script src="preview.js"></script>'),
    "app.js": web("app.js"),
    "styles.css": web("styles.css"),
    "preview.js": web("preview.js"),
    "promos.json": JSON.stringify({ campaignName: active.campaignName, publishedAt: master.publishedAt ?? null, _builtAt: builtAt, _publicCount: pub.length, promos }, null, 1) + "\n",
  });
  console.log(`Preview build: ${promos.length} promos (${pub.length} would be public) -> .preview/`);
}
