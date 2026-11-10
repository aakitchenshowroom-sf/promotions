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

rmSync(tmp, { recursive: true, force: true });
console.log(failures ? `\n${failures} FAILED` : "\nAll publish-rule tests passed.");
process.exit(failures ? 1 : 0);
