/* AA Kitchen promotions page: a list grouped by brand. Data: promos.json next to this file. No dependencies.
   Each item shows a summary: amount | title, one-line summary, how you get it · Buy by · Claim by, then
   "Details" and the downloads. Details hold: tiers, other dates, how to claim, conditions, translation,
   eligible models (collapsed again). Rows without data are not shown. */
(function () {
  "use strict";

  // Two kinds only, for the two functional colors.
  var KIND = {
    "instant-in-store": ["instant", "Instant — taken off at checkout"],
    "in-store-order": ["instant", "Included when you order"],
    "online": ["claim", "You claim it after purchase"],
    "online-or-mail": ["claim", "You claim it after purchase"],
    "mail-only": ["claim", "You claim it after purchase"],
    "app": ["claim", "You claim it after purchase"]
  };
  var SOON_DAYS = 7;
  // Shorter text on a brand button only; headings keep the full brand name.
  var BUTTON_LABEL = { "Fulgor Milano": "Fulgor" };

  var state = { q: "", brand: "", category: "", how: "", soon: false };
  var data = null;
  var hooks = window.__promoHooks || (window.__promoHooks = []);

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function norm(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }

  // Today's date in San Francisco, as YYYY-MM-DD.
  function todayPacific() {
    if (window.__todayOverride) return window.__todayOverride;
    var parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    var get = function (t) { return parts.filter(function (p) { return p.type === t; })[0].value; };
    return get("year") + "-" + get("month") + "-" + get("day");
  }
  function toDate(iso) { var p = iso.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function daysBetween(a, b) { return Math.round((toDate(b) - toDate(a)) / 86400000); }
  // One date format everywhere: "Dec 2, 2026".
  function fmt(iso) { return toDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

  function kindOf(p) { return KIND[p.redemption] || KIND.online; }
  function isExpired(p, today) { return p.purchaseEnd && today > p.purchaseEnd; }
  function endingSoon(p, today) {
    if (!p.purchaseEnd || isExpired(p, today)) return false;
    var d = daysBetween(today, p.purchaseEnd);
    return d >= 0 && d <= SOON_DAYS;
  }
  function modelHits(p, q) {
    if (q.length < 3) return [];
    var hits = [];
    (p.eligible || []).forEach(function (g) {
      g.items.forEach(function (it) { if (norm(it.model).indexOf(q) !== -1) hits.push(it.model); });
    });
    return hits;
  }

  // Everything except the brand (the brand decides where an item is shown, see render()).
  function matches(p, today) {
    if (isExpired(p, today)) return false;
    if (state.category && p.categories.indexOf("*") === -1 && p.categories.indexOf(state.category) === -1) return false;
    if (state.how && kindOf(p)[0] !== state.how) return false;
    if (state.soon && !endingSoon(p, today)) return false;
    if (state.q.length >= 3 && modelHits(p, state.q).length === 0) return false;
    return true;
  }

  function rows(dl, pairs) {
    pairs.forEach(function (pair) {
      if (!pair[1]) return;
      dl.appendChild(el("dt", null, pair[0]));
      dl.appendChild(el("dd", null, pair[1]));
    });
  }
  function link(href, text, cls) {
    var a = el("a", cls || null, text);
    a.href = href; a.target = "_blank"; a.rel = "noopener";
    return a;
  }

  function renderItem(p, today) {
    var node = $("item-tpl").content.firstElementChild.cloneNode(true);
    node.id = p.id;
    var kind = kindOf(p);
    var hits = modelHits(p, state.q);

    // Left column: amount and at most one tag.
    node.querySelector(".amount").textContent = p.amountHeadline;
    if (endingSoon(p, today)) node.querySelector(".tag").hidden = false;
    else node.querySelector(".tag").remove();

    // Summary rows.
    node.querySelector(".title").textContent = p.title;
    var summary = node.querySelector(".summary");
    if (p.summary) summary.textContent = p.summary; else summary.remove();
    var meta = node.querySelector(".meta");
    meta.appendChild(el("span", "how-get " + kind[0], kind[1]));
    if (p.purchaseEnd) meta.appendChild(el("span", null, "Buy by " + fmt(p.purchaseEnd)));
    if (p.claimBy) meta.appendChild(el("span", null, "Claim by " + fmt(p.claimBy)));
    var dl = node.querySelector(".downloads");
    (p.downloads || []).forEach(function (d) { dl.appendChild(link(d.href, d.label)); });
    if (!dl.children.length) dl.remove();

    // Details.
    var details = node.querySelector(".details");
    var toggle = node.querySelector(".toggle");
    details.id = p.id + "-details";
    toggle.setAttribute("aria-controls", details.id);
    function setOpen(open) { details.hidden = !open; toggle.setAttribute("aria-expanded", String(open)); }
    toggle.addEventListener("click", function () { setOpen(details.hidden); });

    var tiers = node.querySelector(".tiers");
    rows(tiers, (p.tiers || []).map(function (t) { return [t.label, t.value]; }));
    if (!tiers.children.length) tiers.remove();

    var dates = node.querySelector(".dates");
    rows(dates, [
      ["Starts", p.purchaseStart && today < p.purchaseStart ? fmt(p.purchaseStart) : null],
      ["Delivered by", p.deliverBy && fmt(p.deliverBy)],
      ["Serial numbers by", p.serialBy && fmt(p.serialBy)]
    ]);
    if (!dates.children.length) dates.remove();

    var steps = node.querySelector(".steps");
    var claimBlock = node.querySelector(".how");
    if (p.claimNote && (p.claimSteps || []).indexOf(p.claimNote) === -1) claimBlock.insertBefore(el("p", "note", p.claimNote), steps);
    (p.claimSteps || []).forEach(function (s) { steps.appendChild(el("li", null, s)); });
    if (!steps.children.length) steps.remove();
    var cl = node.querySelector(".claim-link");
    if (p.claimUrl) cl.appendChild(link(p.claimUrl, (kind[0] === "claim" ? "Claim at " : "Go to ") + (p.claimUrlLabel || p.claimUrl), "ext"));
    if (p.infoUrl) cl.appendChild(link(p.infoUrl, "Offer details", "ext"));
    var facts = node.querySelector(".claim-facts");
    rows(facts, [["Offer code", p.offerCode], ["Paid as", p.payout]]);
    if (!facts.children.length) facts.remove();

    var conds = node.querySelector(".conditions");
    (p.conditions || []).forEach(function (c) { conds.appendChild(el("li", null, c)); });
    if (!conds.children.length) node.querySelector(".conds").remove();

    var tr = node.querySelector(".translation");
    if (p.translation && p.translation.lines && p.translation.lines.length) {
      tr.querySelector("summary").textContent = p.translation.title || "English translation";
      var tl = tr.querySelector(".translation-lines");
      p.translation.lines.forEach(function (line) { tl.appendChild(el("li", null, line)); });
    } else {
      tr.remove();
    }

    var models = node.querySelector(".models");
    var count = (p.eligible || []).reduce(function (s, g) { return s + g.items.length; }, 0);
    if (!count && !p.eligibleNote) {
      models.remove();
    } else {
      models.querySelector("summary").textContent = (count ? "Eligible models (" + count + ")" : "Eligible products") +
        (hits.length ? " · " + hits.length + (hits.length > 1 ? " matches" : " match") : "");
      var box = models.querySelector(".model-groups");
      if (p.eligibleNote) box.appendChild(el("p", "note", p.eligibleNote));
      (p.eligible || []).forEach(function (g) {
        var wrap = el("div", "model-group");
        wrap.appendChild(el("h5", null, g.label + " (" + g.items.length + ")"));
        var ul = el("ul", "model-list");
        g.items.forEach(function (it) {
          var li = el("li", hits.indexOf(it.model) !== -1 ? "hit" : null, it.model);
          if (it.amount != null) li.appendChild(el("span", "amt", "$" + it.amount));
          if (it.note) li.title = it.note;
          ul.appendChild(li);
        });
        wrap.appendChild(ul);
        box.appendChild(wrap);
      });
    }

    // A model search hit opens Details and the model list.
    if (hits.length) { setOpen(true); models.open = true; }

    hooks.forEach(function (h) { if (h.card) h.card(node, p, today); });
    return node;
  }

  // Brand buttons: "All", then the brands that have current promotions, A–Z.
  function renderBrands(today) {
    var counts = {};
    data.promos.forEach(function (p) {
      if (isExpired(p, today)) return;
      p.brands.forEach(function (b) { counts[b] = (counts[b] || 0) + 1; });
    });
    var grid = $("brand-grid");
    grid.textContent = "";
    function button(value, label) {
      var b = el("button", "brand-btn", label);
      b.type = "button";
      b.setAttribute("aria-pressed", String(state.brand === value));
      b.addEventListener("click", function () { state.brand = value; render(); });
      grid.appendChild(b);
    }
    button("", "All");
    Object.keys(counts).sort(function (a, b) { return a.localeCompare(b); })
      .forEach(function (b) { button(b, BUTTON_LABEL[b] || b); });
    $("brands").classList.toggle("has-choice", Boolean(state.brand));
    $("brand-clear").textContent = state.brand ? state.brand + " ✕" : "";
  }

  // An item appears in full under one brand: the chosen brand if it is one of its brands, else its first
  // brand. Its other brands get a one-line pointer instead of a second copy.
  function render() {
    var today = todayPacific();
    renderBrands(today);
    var shown = data.promos.filter(function (p) {
      return matches(p, today) && (!state.brand || p.brands.indexOf(state.brand) !== -1);
    });
    var groups = {};
    function group(b) { return groups[b] || (groups[b] = { items: [], refs: [] }); }
    shown.forEach(function (p) {
      var home = state.brand && p.brands.indexOf(state.brand) !== -1 ? state.brand : p.brands[0];
      group(home).items.push(p);
      if (!state.brand) p.brands.forEach(function (b) { if (b !== home) group(b).refs.push({ p: p, home: home }); });
    });

    var list = $("list");
    list.textContent = "";
    Object.keys(groups).sort(function (a, b) { return a.localeCompare(b); }).forEach(function (b) {
      var g = groups[b];
      var sec = el("section", "group");
      sec.setAttribute("aria-label", b);
      sec.appendChild(el("h2", "brand", b));
      g.refs.forEach(function (r) {
        var line = el("p", "xref");
        line.appendChild(document.createTextNode("See the "));
        var a = el("a", null, r.p.title);
        a.href = "#" + r.p.id;
        line.appendChild(a);
        line.appendChild(document.createTextNode(" under " + r.home + "."));
        sec.appendChild(line);
      });
      g.items.sort(function (x, y) { return x.title.localeCompare(y.title); })
        .forEach(function (p) { sec.appendChild(renderItem(p, today)); });
      list.appendChild(sec);
    });

    $("count").textContent = shown.length === 1 ? "1 promotion" : shown.length + " promotions";
    $("hint").hidden = state.q.length < 3;
    var active = (state.category ? 1 : 0) + (state.how ? 1 : 0) + (state.soon ? 1 : 0);
    $("more-summary").textContent = active ? "More filters (" + active + " on)" : "More filters";
    var empty = $("empty");
    empty.hidden = shown.length !== 0;
    if (!shown.length) {
      var anyLive = data.promos.some(function (p) { return !isExpired(p, today); });
      empty.textContent = anyLive
        ? "No promotions match. Try another brand or product, or clear the search."
        : "No promotions are listed right now. Please check back soon or ask our team.";
    }
    hooks.forEach(function (h) { if (h.after) h.after(data, today); });
  }

  function fillSelect(sel, values) {
    values.forEach(function (v) { var o = el("option", null, v); o.value = v; sel.appendChild(o); });
  }

  function init(json) {
    data = json;
    if (data.campaignName) { $("campaign").textContent = data.campaignName; document.title = data.campaignName + " | AA Kitchen"; }
    if (data.publishedAt) $("updated").textContent = "Last updated " + fmt(data.publishedAt);

    var cats = [];
    data.promos.forEach(function (p) {
      p.categories.forEach(function (c) { if (c !== "*" && cats.indexOf(c) === -1) cats.push(c); });
    });
    var order = ["Refrigeration", "Ranges", "Cooktops & Rangetops", "Wall Ovens", "Ventilation", "Microwaves", "Dishwashers", "Laundry", "Wine & Beverage", "Other"];
    fillSelect($("category"), cats.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); }));

    $("q").addEventListener("input", function (e) { state.q = norm(e.target.value); render(); });
    $("brand-clear").addEventListener("click", function () { state.brand = ""; render(); });
    $("category").addEventListener("change", function (e) { state.category = e.target.value; render(); });
    $("how").addEventListener("change", function (e) { state.how = e.target.value; render(); });
    $("soon").addEventListener("change", function (e) { state.soon = e.target.checked; render(); });
    hooks.forEach(function (h) { if (h.init) h.init(data); });
    render();
  }

  fetch("promos.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(init)
    .catch(function () {
      $("empty").hidden = false;
      $("empty").textContent = "Promotions could not be loaded. Please refresh the page or ask our team.";
    });
})();
