// D-27: at every screen width, each show room's address, phones and email must be visible in the page header or
// in the footer (wide screens show them in the header, phones in the footer). This reads the stylesheet and
// works out, per side, the widths at which a rule hides the show-room details; the two ranges must not overlap.
// Media queries are read by tools/lib/css-rules.mjs (width and color scheme only; anything else fails).
import { cssRules, splitSelectors } from "./css-rules.mjs";

// Classes that hold the show-room details, and the containers around them.
const DETAIL = /\.(stores|store|addr|phone|email|tel|mail)(?![\w-])/;
const CONTAINER = /(\.(contact|head-band|site-head|foot-contact|page-foot)|\bheader|\bfooter)(?![\w-])\s*$/;
const HEADER_SIDE = /\.(contact|head-band|site-head)(?![\w-])|\bheader\b/;
const FOOTER_SIDE = /\.(foot-contact|page-foot)(?![\w-])|\bfooter\b/;
const hides = (d) => (d.prop === "display" && /^none$/i.test(d.value)) || (d.prop === "visibility" && /^hidden$/i.test(d.value));

// Width ranges at which show-room details are hidden in the header and in the footer.
export function hiddenRanges(cssText) {
  const out = { header: [], footer: [] };
  for (const r of cssRules(cssText)) {
    if (r.media.never || !r.decls.some(hides)) continue;
    const range = [r.media.min, r.media.max];
    for (const sel of splitSelectors(r.selector)) {
      if (!DETAIL.test(sel) && !CONTAINER.test(sel)) continue;
      const h = HEADER_SIDE.test(sel), f = FOOTER_SIDE.test(sel);
      if (h || !f) out.header.push(range);
      if (f || !h) out.footer.push(range);
    }
  }
  return out;
}

// The company website is shown under the company name in the header at every width (D-33): width ranges at which
// a rule hides it (the link, its line, the company block, or a header container around it).
const WEBSITE = /(\.(website|company|contact|head-band|site-head)|\bheader)(?![\w-])(\s+a)?\s*$/;
export function headerWebsiteHidden(cssText) {
  const out = [];
  for (const r of cssRules(cssText)) {
    if (r.media.never || !r.decls.some(hides)) continue;
    for (const sel of splitSelectors(r.selector)) {
      if (WEBSITE.test(sel) && !FOOTER_SIDE.test(sel)) out.push([r.media.min, r.media.max]);
    }
  }
  return out;
}

// Problems: widths at which the details are hidden on both sides, or the website is hidden in the header.
export function contactVisibilityProblems(cssText) {
  const { header, footer } = hiddenRanges(cssText);
  const problems = [];
  for (const [lo, hi] of headerWebsiteHidden(cssText)) {
    problems.push(`styles.css: the company website is hidden in the header at widths ${lo}px to ${hi === Infinity ? "any" : hi + "px"}`);
  }
  for (const a of header) for (const b of footer) {
    const lo = Math.max(a[0], b[0]), hi = Math.min(a[1], b[1]);
    if (lo <= hi) problems.push(`styles.css: show-room details are hidden in both the header and the footer at widths ${lo}px to ${hi === Infinity ? "any" : hi + "px"}`);
  }
  return problems;
}
