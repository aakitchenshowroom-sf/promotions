// Local preview server (127.0.0.1 only). Never deployed.
//   /             -> .preview/   (all promos with review info; build it with `node tools/build.mjs preview`)
//   /public/      -> site/       (exactly what would be published)
//   /source/...   -> the original file under the Promo folder, read-only, only inside the active folders
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, normalize, extname, sep, relative } from "node:path";
import { locations, repoDir } from "./lib/paths.mjs";

const port = Number(process.env.PORT || 4317);
const { root, active } = locations();
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };

function inside(base, rel) {
  const full = normalize(join(base, ...rel.split("/").map(decodeURIComponent)));
  return full.startsWith(normalize(base) + sep) || full === normalize(base) ? full : null;
}
function send(res, file) {
  if (!file || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404, { "content-type": "text/plain" }); res.end("Not found"); return; }
  res.writeHead(200, { "content-type": TYPES[extname(file).toLowerCase()] || "application/octet-stream", "cache-control": "no-store" });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (path.startsWith("/source/")) {
    // Resolve first, then check: the resolved file must sit inside an active folder and not be excluded.
    const full = inside(root, path.slice("/source/".length));
    const relResolved = full && relative(root, full).split(sep).join("/");
    const ok = relResolved && active.activeFolders.some((f) => relResolved.startsWith(f + "/"))
      && !(active.exclude ?? []).some((x) => relResolved === x || relResolved.startsWith(x + "/"));
    return send(res, ok ? full : null);
  }
  if (path === "/public" || path.startsWith("/public/")) {
    const rel = path.slice("/public".length).replace(/^\//, "") || "index.html";
    return send(res, inside(join(repoDir, "site"), rel.endsWith("/") ? rel + "index.html" : rel));
  }
  const rel = path.replace(/^\//, "") || "index.html";
  return send(res, inside(join(repoDir, ".preview"), rel));
}).listen(port, "127.0.0.1", () => {
  console.log(`Preview:      http://127.0.0.1:${port}/`);
  console.log(`Public build: http://127.0.0.1:${port}/public/`);
  console.log("Close this window (or press Ctrl+C) to stop.");
});
