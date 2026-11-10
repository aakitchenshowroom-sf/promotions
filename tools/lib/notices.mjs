// The page's notices, from web/notices.json (one place to change the wording, D-29):
//   <!--NOTICE:head-->      header notice ("Important: …"), under the campaign name and intro
//   <!--NOTICE:foot-->      footer Disclaimer (intro, points, closing)
//   <!--NOTICE:download-->  the line under each promotion's download links
// The public check requires the header notice on the public page (tools/check-public.mjs).
import { join } from "node:path";
import { readJson, repoDir } from "./paths.mjs";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const str = (v, name) => { if (!v || typeof v !== "string") throw new Error(`web/notices.json: "${name}" is missing`); return v; };

export function readNotices() {
  const n = readJson(join(repoDir, "web", "notices.json"));
  str(n.header?.lead, "header.lead"); str(n.header?.text, "header.text");
  str(n.footer?.title, "footer.title"); str(n.footer?.intro, "footer.intro"); str(n.footer?.closing, "footer.closing");
  if (!Array.isArray(n.footer.points) || !n.footer.points.length) throw new Error('web/notices.json: "footer.points" is missing');
  n.footer.points.forEach((p, i) => str(p, `footer.points[${i}]`));
  str(n.downloadNote, "downloadNote");
  return n;
}

// The header notice exactly as it appears in the page; the public check looks for this string.
export const headerNoticeHtml = (n) =>
  `<p class="notice" id="notice"><strong>${esc(n.header.lead)}</strong> ${esc(n.header.text)}</p>`;

export function noticeBlocks(n) {
  return {
    head: headerNoticeHtml(n),
    foot:
      `<section class="disclaimer" aria-labelledby="disclaimer-title"><h2 class="note-head" id="disclaimer-title">${esc(n.footer.title)}</h2>` +
      `<p>${esc(n.footer.intro)}</p><ul>${n.footer.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` +
      `<p>${esc(n.footer.closing)}</p></section>`,
    download: esc(n.downloadNote),
  };
}

// Replace the markers, if the page has them. A page without markers is returned unchanged.
export function withNotices(html) {
  if (!html.includes("<!--NOTICE:")) return html;
  const b = noticeBlocks(readNotices());
  return html.replace("<!--NOTICE:head-->", b.head).replace("<!--NOTICE:foot-->", b.foot).replace("<!--NOTICE:download-->", b.download);
}
