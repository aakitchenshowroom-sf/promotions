// A small reader for this site's stylesheet: every rule with its declarations and the media conditions it sits
// in. Used by the contact visibility check and the contrast check. Supported media queries: (min-width: Npx),
// (max-width: Npx), (prefers-color-scheme: light|dark), "screen"/"all", joined with "and". Anything else throws,
// so a new kind of rule is looked at instead of being skipped.

export function mediaOf(prelude, outer) {
  const m = { ...outer };
  const rest = prelude.replace(/^@media\s*/i, "")
    .replace(/\(\s*(min|max)-width\s*:\s*(\d+(?:\.\d+)?)px\s*\)/gi, (x, kind, n) => {
      if (kind.toLowerCase() === "min") m.min = Math.max(m.min, Number(n)); else m.max = Math.min(m.max, Number(n));
      return "";
    })
    .replace(/\(\s*prefers-color-scheme\s*:\s*(light|dark)\s*\)/gi, (x, s) => {
      if (m.scheme && m.scheme !== s.toLowerCase()) m.never = true;
      m.scheme = s.toLowerCase();
      return "";
    })
    .replace(/\band\b/gi, "").replace(/\b(screen|all)\b/gi, "").trim();
  if (rest) throw new Error(`styles.css: media query not understood by the style checks: ${prelude}`);
  return m;
}

// Declarations of one rule body: [{ prop, value, important }].
export function declarations(body) {
  const out = [];
  let depth = 0, start = 0, quote = null;
  const push = (s) => {
    const i = s.indexOf(":");
    if (i < 0) return;
    let value = s.slice(i + 1).trim();
    const important = /!important\s*$/i.test(value);
    if (important) value = value.replace(/!important\s*$/i, "").trim();
    out.push({ prop: s.slice(0, i).trim().toLowerCase(), value, important });
  };
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quote) { if (c === "\\") i++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === ";" && depth === 0) { push(body.slice(start, i)); start = i + 1; }
  }
  push(body.slice(start));
  return out;
}

// Every style rule, in source order: { selector, body, decls, media: { min, max, scheme, never } }.
export function cssRules(cssText) {
  const css = cssText.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = [];
  (function walk(text, media) {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf("{", i);
      if (open < 0) break;
      let depth = 1, j = open + 1, quote = null;
      while (j < text.length && depth) {
        const c = text[j];
        if (quote) { if (c === "\\") j++; else if (c === quote) quote = null; }
        else if (c === '"' || c === "'") quote = c;
        else if (c === "{") depth++;
        else if (c === "}") depth--;
        j++;
      }
      const prelude = text.slice(i, open).trim();
      const body = text.slice(open + 1, j - 1);
      if (/^@media/i.test(prelude)) walk(body, mediaOf(prelude, media));
      else if (!prelude.startsWith("@")) out.push({ selector: prelude, body, decls: declarations(body), media });
      i = j;
    }
  })(css, { min: 0, max: Infinity, scheme: null, never: false });
  return out;
}

// Split a selector list on top-level commas.
export function splitSelectors(list) {
  const out = [];
  let depth = 0, start = 0, quote = null;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (quote) { if (c === "\\") i++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "," && depth === 0) { out.push(list.slice(start, i).trim()); start = i + 1; }
  }
  out.push(list.slice(start).trim());
  return out.filter(Boolean);
}
