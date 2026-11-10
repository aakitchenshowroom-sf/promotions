// Self-test of the publish rules on a throwaway copy of the workspace. Never touches the real data.
// Builds into a temp copy of the repo's tools, so site/ in the repo is left alone.
//   node tools/test-public.mjs
import { mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync, appendFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { locations, repoDir } from "./lib/paths.mjs";

const real = locations();
const tmp = mkdtempSync(join(tmpdir(), "promo-test-"));
const ws = join(tmp, "workspace");
const repo = join(tmp, "repo");
mkdirSync(join(ws, "config"), { recursive: true });
mkdirSync(join(ws, "data"), { recursive: true });
cpSync(join(real.workspace, "config", "active.json"), join(ws, "config", "active.json"));
cpSync(join(real.workspace, "config", "private-terms.json"), join(ws, "config", "private-terms.json"));
cpSync(join(repoDir, "tools"), join(repo, "tools"), { recursive: true });
cpSync(join(repoDir, "web"), join(repo, "web"), { recursive: true });

const master = JSON.parse(readFileSync(real.promosPath, "utf8"));
const setVerified = (ids) => { for (const p of master.promos) p.verifiedAt = ids.includes(p.id) ? "2026-11-10" : null; };
const save = () => writeFileSync(join(ws, "data", "promos.json"), JSON.stringify(master, null, 2));
const run = (args) => {
  try {
    return { ok: true, out: execFileSync("node", [join(repo, "tools", "build.mjs"), ...args], { env: { ...process.env, PROMO_WORKSPACE: ws }, encoding: "utf8", stdio: "pipe" }) };
  } catch (e) { return { ok: false, out: (e.stdout || "") + (e.stderr || "") }; }
};
const check = () => {
  try {
    execFileSync("node", [join(repo, "tools", "check-public.mjs")], { env: { ...process.env, PROMO_WORKSPACE: ws }, encoding: "utf8", stdio: "pipe" });
    return { ok: true, out: "" };
  } catch (e) { return { ok: false, out: (e.stdout || "") + (e.stderr || "") }; }
};
let failures = 0;
const expect = (name, cond, detail = "") => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "\n      " + detail.trim().split("\n").join("\n      ")}`); if (!cond) failures++; };

// 1. Verified + not held + no open claim-form -> public, with its original file. Held / claim-form -> not public.
//    The held and flagged cases are forced here, so the test does not depend on today's data.
setVerified(["bluestar-bundle-save", "fulgor-italian-style", "robam-black-friday", "bosch-bf-delivery-install", "speed-queen-dryer"]);
master.promos.find((p) => p.id === "robam-black-friday").hold = true;
master.promos.find((p) => p.id === "bosch-bf-delivery-install").flags.push("claim-form");
save();
let r = run(["public"]);
expect("public build passes with 5 marked verified", r.ok, r.out);
const pub = JSON.parse(readFileSync(join(repo, "site", "promos.json"), "utf8"));
const ids = pub.promos.map((p) => p.id).sort();
expect("only verified, unheld, settled promos are public", ids.join(",") === "bluestar-bundle-save,fulgor-italian-style,speed-queen-dryer", ids.join(","));
const forms = execFileSync("node", ["-e", `console.log(require("fs").readdirSync(${JSON.stringify(join(repo, "site", "forms"))}).join(","))`], { encoding: "utf8" }).trim();
expect("forms/ holds exactly their originals", forms === "bluestar-bundle-save.pdf,fulgor-italian-style.pdf,speed-queen-dryer.pdf", forms);
const fulgor = pub.promos.find((p) => p.id === "fulgor-italian-style");
expect("download label for a terms PDF", fulgor.downloads[0].label === "Full terms (PDF)" && fulgor.downloads[0].href === "forms/fulgor-italian-style.pdf", JSON.stringify(fulgor.downloads));
expect("no review fields in public data", !JSON.stringify(pub).match(/verifiedAt|internalNotes|_preview|sources|flags|holdReason/));

// 2. Tampering is caught.
appendFileSync(join(repo, "site", "forms", "bluestar-bundle-save.pdf"), "x");
r = check(); expect("altered download file is caught", !r.ok && /differs from its original/.test(r.out), r.out);
run(["public"]);
writeFileSync(join(repo, "site", "forms", "stray.pdf"), "x");
r = check(); expect("stray file in forms/ is caught", !r.ok && /does not belong/.test(r.out), r.out);
run(["public"]);
master.promos.find((p) => p.id === "fulgor-italian-style").conditions.push("Must be purchased at UMRP.");
save();
r = run(["public"]); expect("internal term in card text is caught", !r.ok && /UMRP/.test(r.out), r.out);
master.promos.find((p) => p.id === "fulgor-italian-style").conditions.pop();
master.promos.find((p) => p.id === "speed-queen-dryer").summary += " See SpeedQueen_Dryer-Rebate.pdf";
save();
r = run(["public"]); expect("source file name in card text is caught", !r.ok && /source file name/.test(r.out), r.out);

master.promos.find((p) => p.id === "speed-queen-dryer").summary = master.promos.find((p) => p.id === "speed-queen-dryer").summary.replace(" See SpeedQueen_Dryer-Rebate.pdf", "");
const privateWord = JSON.parse(readFileSync(join(ws, "config", "private-terms.json"), "utf8")).anywhere[1];
master.promos.find((p) => p.id === "bluestar-bundle-save").conditions.push(`Dealer ${privateWord}.`);
save();
r = run(["public"]); expect("private term (from the workspace list) in card text is caught", !r.ok && /private term/.test(r.out), r.out);
master.promos.find((p) => p.id === "bluestar-bundle-save").conditions.pop();

// 3. Whirlpool + Maytag: one download for two identical sources (also needs claim-form settled to publish).
const wm = master.promos.find((p) => p.id === "whirlpool-maytag-black-friday");
master.promos.find((p) => p.id === "speed-queen-dryer").summary = master.promos.find((p) => p.id === "speed-queen-dryer").summary.replace(" See SpeedQueen_Dryer-Rebate.pdf", "");
wm.flags = []; wm.claimSteps = ["test step"]; wm.verifiedAt = "2026-11-10";
save();
r = run(["public"]);
const wmPub = JSON.parse(readFileSync(join(repo, "site", "promos.json"), "utf8")).promos.find((p) => p.id === "whirlpool-maytag-black-friday");
expect("identical Whirlpool/Maytag files offered once", r.ok && wmPub && wmPub.downloads.length === 1 && wmPub.downloads[0].label === "Claim form & full terms (PDF)", r.out + JSON.stringify(wmPub?.downloads));

// 4. Contact info (D-27): the show rooms' street names are allowed inside the header/footer contact blocks only.
const terms = JSON.parse(readFileSync(join(ws, "config", "private-terms.json"), "utf8"));
const streets = terms.contactAllowed ?? [];
expect("private-terms.json lists both show rooms' streets as contact exceptions", streets.length >= 2, JSON.stringify(Object.keys(terms)));
const pageNext = readFileSync(join(repo, "web", "index.html"), "utf8");
const shops = JSON.parse(readFileSync(join(repo, "web", "contact.json"), "utf8")).stores;
r = run(["public"]);
const html = r.ok ? readFileSync(join(repo, "site", "index.html"), "utf8") : "";
const blocks = html.match(/<!--contact-->[\s\S]*?<!--\/contact-->/g) ?? [];
expect("contact info with both street names passes", r.ok && blocks.length === 2 && blocks.every((b) => streets.every((s) => b.includes(s))), r.out);
const telCount = (b, p) => (b.match(new RegExp(`href="tel:${p}"`, "g")) ?? []).length;
expect("every phone number is a tel: link in the header and the footer", blocks.length === 2 &&
  shops.every((s) => s.phones.every((p) => blocks.every((b) => b.includes(`>${p}</a>`) && telCount(b, p) >= 1))), blocks.join("\n"));
expect("email is a mailto: link in the header and the footer", blocks.length === 2 &&
  blocks.every((b) => /href="mailto:[^"\s]+@[^"\s]+"/.test(b)) && (html.match(/href="mailto:/g) ?? []).length === 2, blocks.join("\n"));
const calls = [...(blocks[0] ?? "").matchAll(/<a class="call" href="tel:([0-9-]+)">([^<]+)<\/a>/g)].map((m) => `${m[2]}|${m[1]}`);
expect("header has one Call button per show room, dialing its first number", calls.join(",") === shops.map((s) => `Call ${s.name}|${s.phones[0]}`).join(","), calls.join(","));
expect("no contact markers left unfilled", !html.includes("<!--CONTACT:"), "");
const bluestar = master.promos.find((p) => p.id === "bluestar-bundle-save");
for (const street of streets) {
  bluestar.conditions.push(`Visit our store on ${street}.`);
  save();
  r = run(["public"]); expect(`street name ${streets.indexOf(street) + 1} in promotion text is caught`, !r.ok && /promos\.json: matches a private term .* outside the contact info/.test(r.out), r.out);
  bluestar.conditions.pop();
  save();
  writeFileSync(join(repo, "web", "index.html"), pageNext.replace('<p class="intro">', `<p class="intro">${street} `));
  r = run(["public"]); expect(`street name ${streets.indexOf(street) + 1} in page text outside the contact blocks is caught`, !r.ok && /index\.html: matches a private term .* outside the contact info/.test(r.out), r.out);
  writeFileSync(join(repo, "web", "index.html"), pageNext);
}
const contactPath = join(repo, "web", "contact.json");
const contact = JSON.parse(readFileSync(contactPath, "utf8"));
writeFileSync(contactPath, JSON.stringify({ ...contact, storeName: `${contact.storeName} ${terms.wholeWords[0]}` }));
r = run(["public"]); expect("other private terms inside the contact info are still caught", !r.ok && /private term .* in the contact info/.test(r.out), r.out);
writeFileSync(contactPath, JSON.stringify(contact));

// 5. Notices (D-29): the header notice must be on the public page, inside the header.
const notices = JSON.parse(readFileSync(join(repo, "web", "notices.json"), "utf8"));
r = run(["public"]);
const page5 = r.ok ? readFileSync(join(repo, "site", "index.html"), "utf8") : "";
const head5 = page5.slice(page5.indexOf("<header"), page5.indexOf("</header>"));
expect("header notice is in the page header, with the lead in bold", r.ok && head5.includes(`<strong>${notices.header.lead}</strong>`) && head5.includes(notices.header.text.replace(/'/g, "'")), r.out);
expect("footer Disclaimer and the download note are on the page", page5.includes(`>${notices.footer.title}</h2>`) && notices.footer.points.every((pt) => page5.includes(`<li>${pt}</li>`)) && page5.includes(notices.downloadNote), "");
writeFileSync(join(repo, "web", "index.html"), pageNext.replace("<!--NOTICE:head-->", ""));
r = run(["public"]); expect("a page without the header notice is caught", !r.ok && /header notice from web\/notices\.json is missing/.test(r.out), r.out);
writeFileSync(join(repo, "web", "index.html"), pageNext.replace("<!--NOTICE:head-->", "").replace("<!--NOTICE:foot-->", "<!--NOTICE:head--><!--NOTICE:foot-->"));
r = run(["public"]); expect("a header notice outside the header is caught", !r.ok && /not inside the page header/.test(r.out), r.out);
writeFileSync(join(repo, "web", "index.html"), pageNext);

rmSync(tmp, { recursive: true, force: true });
console.log(failures ? `\n${failures} FAILED` : "\nAll publish-rule tests passed.");
process.exit(failures ? 1 : 0);
