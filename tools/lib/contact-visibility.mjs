// D-27: at every screen width, each show room's address, phones and email must be visible in the page header or
// in the footer (wide screens show them in the header, phones in the footer). This reads the stylesheet and
// works out, per side, the widths at which a rule hides the show-room details; the two ranges must not overlap.
// Supported media queries: (min-width: Npx), (max-width: Npx), and features that do not depend on width
// (prefers-color-scheme), joined with "and". Anything else fails the check, so a new kind of rule is looked at.

// Classes that hold the show-room details, and the containers around them.
const DETAIL = /\.(stores|store|addr|phone|email|tel|mail)(?![\w-])/;
const CONTAINER = /(\.(contact|head-band|site-head|foot-contact|page-foot)|\bheader|\bfooter)(?![\w-])\s*$/;
const HEADER_SIDE = /\.(contact|head-band|site-head)(?![\w-])|\bheader\b/;
const FOOTER_SIDE = /\.(foot-contact|page-foot)(?![\w-])|\bfooter\b/;
const HIDES = /(^|;)\s*(display\s*:\s*none|visibility\s*:\s*hidden)\s*(!important)?\s*(;|$)/i;

function mediaRange(cond, outer) {
  let [min, max] = outer;
  const rest = cond.replace(/^@media\s*/i, "").replace(/\(\s*(min|max)-width\s*:\s*(\d+(?:\.\d+)?)px\s*\)/gi, (m, kind, n) => {
    if (kind.toLowerCase() === "min") min = Math.max(min, Number(n)); else max = Math.min(max, Number(n));
    return "";
  }).replace(/\(\s*prefers-color-scheme\s*:\s*(light|dark)\s*\)/gi, "").replace(/\band\b/gi, "").replace(/\b(screen|all)\b/gi, "").trim();
  if (rest) throw new Error(`styles.css: media query not understood by the contact visibility check: ${cond}`);
  return [min, max];
}

// Every rule as { selector, decls, range: [minWidth, maxWidth] }.
function rules(css, range = [0, Infinity], out = []) {
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open < 0) break;
    let depth = 1, j = open + 1;
    while (j < css.length && depth) { if (css[j] === "{") depth++; else if (css[j] === "}") depth--; j++; }
    const prelude = css.slice(i, open).trim();
    const body = css.slice(open + 1, j - 1);
    if (/^@media/i.test(prelude)) rules(body, mediaRange(prelude, range), out);
    else if (!prelude.startsWith("@")) out.push({ selector: prelude, decls: body, range });
    i = j;
  }
  return out;
}

// Width ranges at which show-room details are hidden in the header and in the footer.
export function hiddenRanges(cssText) {
  const css = cssText.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = { header: [], footer: [] };
  for (const r of rules(css)) {
    if (!HIDES.test(r.decls)) continue;
    for (const sel of r.selector.split(",").map((x) => x.trim())) {
      if (!DETAIL.test(sel) && !CONTAINER.test(sel)) continue;
      const h = HEADER_SIDE.test(sel), f = FOOTER_SIDE.test(sel);
      if (h || !f) out.header.push(r.range);
      if (f || !h) out.footer.push(r.range);
    }
  }
  return out;
}

// Problems: widths at which the details are hidden on both sides.
export function contactVisibilityProblems(cssText) {
  const { header, footer } = hiddenRanges(cssText);
  const problems = [];
  for (const a of header) for (const b of footer) {
    const lo = Math.max(a[0], b[0]), hi = Math.min(a[1], b[1]);
    if (lo <= hi) problems.push(`styles.css: show-room details are hidden in both the header and the footer at widths ${lo}px to ${hi === Infinity ? "any" : hi + "px"}`);
  }
  return problems;
}
