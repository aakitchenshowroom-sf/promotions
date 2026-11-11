// Contrast check (D-32): every text on the page, in every interactive state, in light and dark mode, at phone and
// desktop width, must reach 4.5:1 against the background it sits on. Keyboard focus rings must reach 4.5:1
// against the background around the element. It reads the stylesheet and resolves the cascade itself:
// selectors, specificity, !important, inheritance, custom properties (var() with fallbacks), media queries.
//
// The page's elements are described below (STATES) as chains from <html> down to the element, written like
// selectors: "nav.brands.card#brands", "button.brand-btn[aria-pressed=true]", "input#q::placeholder".
// Interactive elements (a, button, summary, input, select) are also checked in :hover, :active and
// :focus-visible, and links in :visited.
//
// Fails safe: a rule that sets a color or background with a selector this reader does not understand (sibling
// combinators, :not(), :has(), unknown pseudo-classes), a color it cannot read, or a form control or
// placeholder whose colors the stylesheet does not set, is reported as a problem instead of being skipped.
import { cssRules, splitSelectors } from "./css-rules.mjs";

export const MIN_RATIO = 4.5;
const WIDTHS = [390, 1440];
const SCHEMES = ["light", "dark"];
const DEFAULTS = { light: { color: "#000000", bg: "#ffffff" }, dark: { color: "#ffffff", bg: "#121212" } };
const COLOR_PROPS = new Set(["color", "background", "background-color", "outline", "outline-color"]);
const STATE_PSEUDO = new Set(["hover", "active", "focus", "focus-visible", "visited"]);
const FORM_CONTROLS = new Set(["button", "input", "select", "textarea"]);
const INHERITED = (p) => p === "color" || p.startsWith("--");

// ---------- the page, as element chains ----------
const ROOT = ["html", "body"];
const HEAD = [...ROOT, "header.site-head", "div.head-band", "div.wrap", "div.contact"];
const HEAD_STORE = [...HEAD, "div.stores", "section.store"];
const HERO = [...ROOT, "header.site-head", "div.wrap", "div.hero"];
const MAIN = [...ROOT, "main.wrap"];
const BRANDS = [...MAIN, "nav.brands.card#brands"];
const FILTERS = [...MAIN, "form.filters.card"];
const GROUP = [...MAIN, "div.list#list", "section.group"];
const ITEM = [...GROUP, "article.item", "div.item-grid"];
const MAINCOL = [...ITEM, "div.col-main"];
const DETAILS = [...MAINCOL, "div.details"];
const FOOT = [...ROOT, "footer.page-foot.wrap"];
const FOOT_CONTACT = [...FOOT, "section.foot-contact.card"];
const NOTES = [...FOOT, "div.card.foot-notes"];

export const STATES = [
  // Header and hero
  ["Company name (header)", [...HEAD, "p.store-name"]],
  ["Show room heading (header)", [...HEAD_STORE, "p.store-title"]],
  ["Show room address (header)", [...HEAD_STORE, "p.addr"]],
  ["Phone link (header)", [...HEAD_STORE, "p.phone", "a.tel"]],
  ["Email link (header)", [...HEAD_STORE, "p.email", "a.mail"]],
  ["Call button (phone header)", [...HEAD, "p.call-buttons", "a.call"]],
  ["Campaign name", [...HERO, "div.head-row", "h1#campaign"]],
  ["Last updated", [...HERO, "div.head-row", "p.updated#updated"]],
  ["Intro", [...HERO, "p.intro"]],
  ["Important notice", [...HERO, "p.notice#notice"]],
  ["Important notice lead", [...HERO, "p.notice#notice", "strong"]],
  // Brand buttons
  ["Brand button", [...BRANDS, "div.brand-grid#brand-grid", "button.brand-btn[aria-pressed=false]"]],
  ["Brand button, chosen", [...BRANDS, "div.brand-grid#brand-grid", "button.brand-btn[aria-pressed=true]"]],
  ["Chosen brand, collapsed (phone)", ["html", "body", "main.wrap", "nav.brands.card.has-choice#brands", "p.brand-chosen", "button#brand-clear"]],
  // Search and filters
  ["Search box, typed text", [...FILTERS, "label.f-search", "input#q[type=search]"]],
  ["Search box, placeholder", [...FILTERS, "label.f-search", "input#q[type=search]", "::placeholder"]],
  ["More filters, closed", [...FILTERS, "details.more-filters#more-filters", "summary#more-summary"]],
  ["More filters, open", [...FILTERS, "details.more-filters#more-filters[open]", "summary#more-summary"]],
  ["More filters, field label", [...FILTERS, "details.more-filters#more-filters[open]", "div.more-body", "label.f-select", "span"]],
  ["More filters, select", [...FILTERS, "details.more-filters#more-filters[open]", "div.more-body", "label.f-select", "select#category"]],
  ["More filters, checkbox label", [...FILTERS, "details.more-filters#more-filters[open]", "div.more-body", "label.f-check"]],
  ["Count", [...MAIN, "p.count#count"]],
  ["Search hint", [...MAIN, "p.hint#hint"]],
  ["No results message", [...MAIN, "p.empty#empty"]],
  // Brand cards and promotions
  ["Brand name", [...GROUP, "h2.brand"]],
  ["See-under line", [...GROUP, "p.xref"]],
  ["See-under link", [...GROUP, "p.xref", "a"]],
  ["Amount", [...ITEM, "div.col-amount", "p.amount"]],
  ["Ending soon tag", [...ITEM, "div.col-amount", "p.tag"]],
  ["Title", [...MAINCOL, "h3.title"]],
  ["Summary", [...MAINCOL, "p.summary"]],
  ["Claim tag", [...MAINCOL, "p.meta", "span.how-get.claim"]],
  ["Instant tag", [...MAINCOL, "p.meta", "span.how-get.instant"]],
  ["Buy by / Claim by", [...MAINCOL, "p.meta", "span"]],
  ["Details button, closed", [...MAINCOL, "p.actions", "button.toggle[aria-expanded=false]"]],
  ["Details button, open", [...MAINCOL, "p.actions", "button.toggle[aria-expanded=true]"]],
  ["Download button", [...MAINCOL, "p.actions", "span.downloads", "a"]],
  ["Official terms line", [...MAINCOL, "p.official-note"]],
  // Inside open Details
  ["Details: tier label", [...DETAILS, "dl.rows.tiers", "dt"]],
  ["Details: tier value", [...DETAILS, "dl.rows.tiers", "dd"]],
  ["Details: date label", [...DETAILS, "dl.rows.dates", "dt"]],
  ["Details: heading", [...DETAILS, "section.block.how", "h4"]],
  ["Details: claim step", [...DETAILS, "section.block.how", "ol.steps", "li"]],
  ["Details: claim link", [...DETAILS, "section.block.how", "p.claim-link", "a.ext"]],
  ["Details: offer code", [...DETAILS, "section.block.how", "dl.rows.claim-facts", "dd"]],
  ["Details: condition", [...DETAILS, "section.block.conds", "ul.conditions", "li"]],
  ["Details: translation toggle", [...DETAILS, "details.translation", "summary"]],
  ["Details: translation line", [...DETAILS, "details.translation[open]", "ul.translation-lines", "li"]],
  ["Details: models toggle", [...DETAILS, "details.models[open]", "summary"]],
  ["Details: models note", [...DETAILS, "details.models[open]", "div.model-groups", "p.note"]],
  ["Details: model group heading", [...DETAILS, "details.models[open]", "div.model-groups", "div.model-group", "h5"]],
  ["Details: model", [...DETAILS, "details.models[open]", "div.model-groups", "div.model-group", "ul.model-list", "li"]],
  ["Details: model, search hit", [...DETAILS, "details.models[open]", "div.model-groups", "div.model-group", "ul.model-list", "li.hit"]],
  ["Details: model bonus", [...DETAILS, "details.models[open]", "div.model-groups", "div.model-group", "ul.model-list", "li", "span.amt"]],
  // Footer
  ["Company name (footer)", [...FOOT_CONTACT, "h2.store-name#foot-store"]],
  ["Show room heading (footer)", [...FOOT_CONTACT, "div.stores", "section.store", "h3.store-title"]],
  ["Phone link (footer)", [...FOOT_CONTACT, "div.stores", "section.store", "p.phone", "a.tel"]],
  ["Email link (footer)", [...FOOT_CONTACT, "div.stores", "section.store", "p.email", "a.mail"]],
  ["Website link (footer)", [...FOOT_CONTACT, "p.website", "a"]],
  ["Disclaimer heading", [...NOTES, "section.disclaimer", "h2.note-head#disclaimer-title"]],
  ["Disclaimer text", [...NOTES, "section.disclaimer", "ul", "li"]],
  ["Listing note", [...NOTES, "p.listing-note"]],
];

// ---------- parsing ----------
function parseCompound(s) {
  const node = { tag: null, id: null, classes: [], attrs: [], pseudo: [], pe: null, unsupported: false };
  const re = /^(\*|[a-zA-Z][\w-]*)|#([\w-]+)|\.([\w-]+)|\[\s*([\w-]+)\s*(?:=\s*"?([^"\]]*)"?\s*)?\]|::([\w-]+)|:([\w-]+)(\([^)]*\))?/g;
  let m, pos = 0;
  while ((m = re.exec(s)) && m.index === pos) {
    pos = re.lastIndex;
    if (m[1]) node.tag = m[1] === "*" ? null : m[1].toLowerCase();
    else if (m[2]) node.id = m[2];
    else if (m[3]) node.classes.push(m[3]);
    else if (m[4]) node.attrs.push([m[4], m[5] ?? null]);
    else if (m[6]) node.pe = m[6];
    else if (m[7]) { if (m[8] || !(STATE_PSEUDO.has(m[7]) || m[7] === "root")) node.unsupported = true; node.pseudo.push(m[7]); }
  }
  if (pos !== s.length) node.unsupported = true;
  return node;
}

// "a > b c" -> [{ c: compound, comb: null }, { c, comb: ">" }, { c, comb: " " }]
function parseSelector(sel) {
  const parts = [];
  let unsupported = /[+~]|:not\(|:has\(|:is\(|:where\(/.test(sel);
  const tokens = sel.trim().replace(/\s*>\s*/g, " > ").split(/\s+/);
  let comb = null;
  for (const t of tokens) {
    if (t === ">") { comb = ">"; continue; }
    const c = parseCompound(t);
    if (c.unsupported) unsupported = true;
    parts.push({ c, comb: parts.length ? (comb || " ") : null });
    comb = null;
  }
  const spec = [0, 0, 0];
  for (const { c } of parts) {
    spec[0] += c.id ? 1 : 0;
    spec[1] += c.classes.length + c.attrs.length + c.pseudo.length;
    spec[2] += (c.tag ? 1 : 0) + (c.pe ? 1 : 0);
  }
  return { parts, spec, unsupported, pe: parts.length ? parts[parts.length - 1].c.pe : null };
}

// A chain entry: "button.brand-btn[aria-pressed=true]" or "::placeholder".
function parseNode(s) {
  if (s.startsWith("::")) return { pseudoElement: s.slice(2) };
  const c = parseCompound(s);
  return { tag: c.tag, id: c.id, classes: c.classes, attrs: c.attrs, states: new Set() };
}

function compoundMatches(c, n) {
  if (c.tag && c.tag !== n.tag) return false;
  if (c.id && c.id !== n.id) return false;
  if (!c.classes.every((k) => n.classes.includes(k))) return false;
  for (const [a, v] of c.attrs) {
    const has = n.attrs.find(([x]) => x === a);
    if (!has || (v !== null && has[1] !== v)) return false;
  }
  for (const p of c.pseudo) {
    if (p === "root") { if (n.tag !== "html") return false; }
    else if (p === "focus") { if (!n.states.has("focus") && !n.states.has("focus-visible")) return false; }
    else if (!n.states.has(p)) return false;
  }
  return true;
}

// Does the selector match element chain[idx] (pe: the pseudo-element being styled, or null)?
function matches(sel, chain, idx, pe) {
  if ((sel.pe || null) !== (pe || null)) return false;
  const p = sel.parts;
  const step = (pi, ci) => {
    if (!compoundMatches(p[pi].c, chain[ci])) return false;
    if (pi === 0) return true;
    if (p[pi].comb === ">") return ci > 0 && step(pi - 1, ci - 1);
    for (let k = ci - 1; k >= 0; k--) if (step(pi - 1, k)) return true;
    return false;
  };
  return step(p.length - 1, idx);
}

// ---------- colors ----------
const NAMED = { white: "#ffffff", black: "#000000" };
function hex(v) {
  const s = String(v).trim().toLowerCase();
  if (NAMED[s]) return NAMED[s];
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  if (/^#[0-9a-f]{3}$/.test(s)) return "#" + [...s.slice(1)].map((x) => x + x).join("");
  return null;
}
const lum = (h) => {
  const c = h.slice(1).match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// ---------- the checker ----------
export function contrastReport(cssText) {
  const problems = [];
  const rules = [];
  cssRules(cssText).forEach((r, order) => {
    for (const s of splitSelectors(r.selector)) {
      const sel = parseSelector(s);
      const decls = r.decls.filter((d) => COLOR_PROPS.has(d.prop) || d.prop.startsWith("--"));
      if (!decls.length) continue;
      if (sel.unsupported) {
        if (/::(before|after)s*$/.test(s)) continue; // decorative marks (arrows, separators)
        problems.push(`styles.css: "${s}" sets ${decls.map((d) => d.prop).join(", ")} but the contrast check cannot read this selector`);
        continue;
      }
      rules.push({ sel, decls, media: r.media, order, text: s });
    }
  });

  const rows = [];
  for (const scheme of SCHEMES) for (const width of WIDTHS) {
    const active = rules.filter((r) => !r.media.never && width >= r.media.min && width <= r.media.max && (!r.media.scheme || r.media.scheme === scheme));
    for (const [name, chainSpec] of STATES) {
      for (const variant of variantsOf(chainSpec)) {
        const res = evaluate(active, chainSpec, variant, scheme);
        if (res.error) { problems.push(`${name}${variant ? " :" + variant : ""} (${scheme}, ${width}px): ${res.error}`); continue; }
        const row = { name, state: variant || "", scheme, width, text: res.color, bg: res.bg, ratio: ratio(res.color, res.bg) };
        rows.push(row);
        if (row.ratio < MIN_RATIO) problems.push(`${name}${variant ? " :" + variant : ""} (${scheme}, ${width}px): text ${res.color} on ${res.bg} is ${row.ratio.toFixed(2)}:1, below ${MIN_RATIO}:1`);
        if (variant === "focus-visible") {
          if (!res.outline) problems.push(`${name} :focus-visible (${scheme}, ${width}px): no visible focus outline`);
          else {
            const fr = { name, state: "focus ring", scheme, width, text: res.outline, bg: res.around, ratio: ratio(res.outline, res.around) };
            rows.push(fr);
            if (fr.ratio < MIN_RATIO) problems.push(`${name} focus ring (${scheme}, ${width}px): outline ${res.outline} on ${res.around} is ${fr.ratio.toFixed(2)}:1, below ${MIN_RATIO}:1`);
          }
        }
      }
    }
  }
  return { rows, problems: [...new Set(problems)] };
}

export const contrastProblems = (cssText) => contrastReport(cssText).problems;

function variantsOf(chainSpec) {
  const last = chainSpec[chainSpec.length - 1];
  if (last.startsWith("::")) return [null];
  const tag = parseNode(last).tag;
  if (tag === "a") return [null, "hover", "active", "focus-visible", "visited"];
  if (["button", "summary", "input", "select"].includes(tag)) return [null, "hover", "active", "focus-visible"];
  return [null];
}

function evaluate(rules, chainSpec, variant, scheme) {
  let pe = null;
  const spec = chainSpec.slice();
  if (spec[spec.length - 1].startsWith("::")) pe = spec.pop().slice(2);
  const chain = spec.map(parseNode);
  const target = chain[chain.length - 1];
  if (variant) { target.states.add(variant); if (variant === "focus-visible") target.states.add("focus"); }
  if (variant === "active" || variant === "focus-visible") target.states.add("hover");

  const computed = [];
  const cascade = (idx, prop, pseudo) => {
    let best = null;
    for (const r of rules) {
      if (!matches(r.sel, chain, idx, pseudo)) continue;
      for (const d of r.decls) {
        if (d.prop !== prop) continue;
        const key = [d.important ? 1 : 0, ...r.sel.spec, r.order];
        if (!best || cmp(key, best.key) > 0) best = { key, value: d.value };
      }
    }
    return best ? best.value : null;
  };
  const resolveVars = (value, idx, depth = 0) => {
    if (depth > 10) throw new Error("var() nesting too deep");
    return value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*((?:[^()]|\([^()]*\))*))?\)/g, (m, name, fb) => {
      const v = customProp(idx, name);
      if (v != null) return resolveVars(v, idx, depth + 1);
      if (fb != null) return resolveVars(fb, idx, depth + 1);
      throw new Error(`${name} is not defined`);
    });
  };
  const customProp = (idx, name) => {
    for (let i = idx; i >= 0; i--) { const v = cascade(i, name, null); if (v != null) return v; }
    return null;
  };
  const colorAt = (idx) => {
    if (computed[idx]) return computed[idx];
    let v = cascade(idx, "color", null);
    let out;
    if (v == null || /^inherit$/i.test(v)) out = idx === 0 ? DEFAULTS[scheme].color : colorAt(idx - 1);
    else { const h = hex(resolveVars(v, idx)); if (!h) throw new Error(`color "${v}" cannot be read`); out = h; }
    return (computed[idx] = out);
  };
  const ownBg = (idx, pseudo) => {
    let v = cascade(idx, "background-color", pseudo) ?? cascade(idx, "background", pseudo);
    if (v == null) return null;
    v = resolveVars(v, idx).trim().toLowerCase();
    if (v === "none" || v === "transparent") return null;
    if (/url\(|gradient/.test(v)) throw new Error(`background "${v}" cannot be checked`);
    const h = hex(v);
    if (!h) throw new Error(`background "${v}" cannot be read`);
    return h;
  };
  const bgBehind = (fromIdx) => {
    for (let i = fromIdx; i >= 0; i--) { const b = ownBg(i, null); if (b) return b; }
    return DEFAULTS[scheme].bg;
  };

  try {
    const idx = chain.length - 1;
    let color;
    if (pe) {
      const v = cascade(idx, "color", pe);
      if (v == null) return { error: `::${pe} color is not set in styles.css (browser defaults differ)` };
      color = /^inherit$/i.test(v) ? colorAt(idx) : hex(resolveVars(v, idx));
      if (!color) return { error: `::${pe} color "${v}" cannot be read` };
    } else color = colorAt(idx);
    if (FORM_CONTROLS.has(target.tag) && ownBg(idx, null) == null) return { error: `<${target.tag}> background is not set in styles.css (browser defaults differ)` };
    const bg = bgBehind(idx);
    let outline = null;
    const o = cascade(idx, "outline-color", null) ?? cascade(idx, "outline", null);
    if (o && !/^none\b|^0\b/i.test(o)) {
      const tokens = resolveVars(o, idx).split(/\s+/);
      outline = tokens.map(hex).find(Boolean) || (tokens.includes("currentcolor") ? color : null);
    }
    return { color, bg, outline, around: bgBehind(idx - 1) };
  } catch (e) {
    return { error: e.message };
  }
}

function cmp(a, b) { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; }
