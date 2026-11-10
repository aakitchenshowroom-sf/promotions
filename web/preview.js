/* Local preview only. Never copied into the public build (tools/build.mjs). Adds review info above every item:
   number, verification status, hold, flags, source file + pages with a link to the original, internal notes.
   The review strip sits above the item's two columns, so it does not shift the public layout's alignment. */
(function () {
  "use strict";
  var params = new URLSearchParams(location.search);
  if (/^\d{4}-\d{2}-\d{2}$/.test(params.get("today") || "")) window.__todayOverride = params.get("today");

  var css = document.createElement("style");
  css.textContent = [
    ":root{--pv-bg:#fff7e0;--pv-ink:#3d2e00;--pv-line:#b07d00;--pv-bar:#1c1c1c;--pv-bar-ink:#f2f2ef}",
    "@media (prefers-color-scheme:dark){:root{--pv-bg:#2a2212;--pv-ink:#f0dca8;--pv-line:#b8902e;--pv-bar:#000;--pv-bar-ink:#f2f2ef}}",
    ".pv-banner{background:var(--pv-bg);color:var(--pv-ink);border-bottom:1px dashed var(--pv-line);font-size:14px;padding:8px 0}",
    ".pv-banner .wrap{display:flex;flex-wrap:wrap;gap:8px 24px;align-items:center}",
    ".pv-banner label{display:inline-flex;gap:8px;align-items:center}",
    ".pv-banner input{font:inherit}",
    ".pv{border:1px dashed var(--pv-line);background:var(--pv-bg);color:var(--pv-ink);font-size:14px;padding:8px;margin-bottom:16px}",
    ".pv-line{display:flex;flex-wrap:wrap;gap:0 16px;align-items:baseline}",
    ".pv a{color:inherit}",
    ".pv-more{background:none;border:0;padding:0;color:inherit;font-size:14px;cursor:pointer;text-decoration:underline}",
    ".pv-body p{margin-top:8px}",
    ".pv-pending{border:1px dashed var(--pv-line);color:var(--pv-ink);background:var(--pv-bg);font-size:14px;padding:8px;margin-top:8px}"
  ].join("\n");
  document.head.appendChild(css);

  var onlyReview = params.get("review") === "1";
  // ?only=id1,id2 shows just those items (close-ups, or one batch under review).
  var only = (params.get("only") || "").split(",").filter(Boolean);

  window.__promoHooks = window.__promoHooks || [];
  window.__promoHooks.push({
    after: function () {
      if (!only.length && !onlyReview) return;
      // A group stays if it shows an item, or a pointer (e.g. Maytag -> Whirlpool) to a shown item.
      Array.prototype.forEach.call(document.querySelectorAll(".group"), function (g) {
        var pointsToShown = Array.prototype.some.call(g.querySelectorAll(".xref a"), function (a) {
          var target = document.getElementById(a.getAttribute("href").slice(1));
          return target && !target.hidden;
        });
        Array.prototype.forEach.call(g.querySelectorAll(".xref"), function (x) {
          var t = document.getElementById(x.querySelector("a").getAttribute("href").slice(1));
          x.hidden = !t || t.hidden;
        });
        g.hidden = !g.querySelector("article.item:not([hidden])") && !pointsToShown;
      });
    },
    init: function (data) {
      var total = data.promos.length;
      var verified = data.promos.filter(function (p) { return p._preview.verifiedAt; }).length;
      var held = data.promos.filter(function (p) { return p._preview.hold; }).length;
      var bar = document.createElement("div");
      bar.className = "pv-banner";
      bar.innerHTML = '<div class="wrap"><span>LOCAL PREVIEW. Not the public page.</span>' +
        "<span>" + total + " promotions · " + verified + " verified · " + (total - verified) + " not verified · " + held + " on hold · public build would show " + data._publicCount + "</span>" +
        '<label>Pretend today is <input type="date" id="pv-today"></label>' +
        '<label><input type="checkbox" id="pv-review"> Only items not ready to publish</label></div>';
      document.body.insertBefore(bar, document.body.firstChild);
      var d = bar.querySelector("#pv-today");
      d.value = window.__todayOverride || "";
      d.addEventListener("change", function () {
        if (d.value) params.set("today", d.value); else params.delete("today");
        location.search = params.toString();
      });
      var r = bar.querySelector("#pv-review");
      r.checked = onlyReview;
      r.addEventListener("change", function () {
        if (r.checked) params.set("review", "1"); else params.delete("review");
        location.search = params.toString();
      });
      document.getElementById("updated").textContent = "Preview built " + data._builtAt;
    },
    card: function (node, p) {
      var v = p._preview;
      if (onlyReview && v.verifiedAt && !v.hold) { node.hidden = true; return; }
      if (only.length && only.indexOf(p.id) === -1) { node.hidden = true; return; }
      // One line by default: number, status, Open original; "Notes" opens source, hold reason and notes.
      var box = document.createElement("div");
      box.className = "pv";
      var line = document.createElement("p");
      line.className = "pv-line";
      var status = ["#" + v.n, v.verifiedAt ? "Verified " + v.verifiedAt : "NOT VERIFIED"];
      if (v.hold) status.push("ON HOLD");
      v.flags.forEach(function (f) { status.push("flag: " + f); });
      line.appendChild(document.createTextNode(status.join(" · ")));
      v.sources.forEach(function (s, i) {
        var a = document.createElement("a");
        a.href = s.href; a.target = "_blank"; a.rel = "noopener";
        a.textContent = v.sources.length > 1 ? "Open original " + (i + 1) : "Open original";
        line.appendChild(a);
      });
      var more = document.createElement("button");
      more.type = "button"; more.className = "pv-more"; more.textContent = "Notes ▸";
      more.setAttribute("aria-expanded", "false");
      line.appendChild(more);
      box.appendChild(line);
      var body = document.createElement("div");
      body.className = "pv-body";
      body.hidden = true;
      v.sources.forEach(function (s) { var p1 = document.createElement("p"); p1.textContent = "Source: " + s.label; body.appendChild(p1); });
      if (v.holdReason) { var h = document.createElement("p"); h.textContent = "Hold: " + v.holdReason; body.appendChild(h); }
      if (v.internalNotes) { var i = document.createElement("p"); i.textContent = "Notes: " + v.internalNotes; body.appendChild(i); }
      box.appendChild(body);
      more.addEventListener("click", function () {
        body.hidden = !body.hidden;
        more.setAttribute("aria-expanded", String(!body.hidden));
        more.textContent = body.hidden ? "Notes ▸" : "Notes ▾";
      });
      node.insertBefore(box, node.firstChild);
      if (!p.claimSteps || !p.claimSteps.length) {
        var pend = document.createElement("p");
        pend.className = "pv-pending";
        pend.textContent = v.flags.indexOf("claim-form") !== -1
          ? "Claim steps pending: store-imprinted claim form (claim-form). Waiting for the maintainer's answer."
          : "Claim steps missing.";
        var how = node.querySelector(".how");
        if (how) how.appendChild(pend);
      }
    }
  });
})();
