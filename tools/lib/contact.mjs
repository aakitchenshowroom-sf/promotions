// The stores' contact info, from web/contact.json (public information, one place to change it).
// The build puts it into the page where index.html has <!--CONTACT:head--> or <!--CONTACT:foot-->.
// Header: company name; on wide screens each show room's full info in its own column; on phones only one
// "Call <show room>" button per show room (its first number). Footer: every show room in full, then the website.
// Every phone is a tel: link, every email a mailto: link, text exactly as written in web/contact.json.
// Each rendered block is wrapped in <!--contact--> … <!--/contact-->: the public check allows the show rooms'
// street names only inside these blocks (tools/check-public.mjs).
import { join } from "node:path";
import { readJson, repoDir } from "./paths.mjs";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const isText = (v) => typeof v === "string" && v.trim() !== "";

export function readContact() {
  const c = readJson(join(repoDir, "web", "contact.json"));
  if (!isText(c.storeName)) throw new Error('web/contact.json: "storeName" is missing');
  if (!isText(c.website) || !/^https:\/\//.test(c.website)) throw new Error("web/contact.json: website must start with https://");
  if (!Array.isArray(c.stores) || !c.stores.length) throw new Error('web/contact.json: "stores" is missing');
  c.stores.forEach((s, i) => {
    for (const k of ["name", "street", "city"]) if (!isText(s[k])) throw new Error(`web/contact.json: stores[${i}].${k} is missing`);
    if (!Array.isArray(s.phones) || !s.phones.length || !s.phones.every((p) => /^[0-9+][0-9 ()+-]{6,}$/.test(p))) {
      throw new Error(`web/contact.json: stores[${i}].phones must list at least one phone number`);
    }
    if (s.email != null && !/^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(s.email)) throw new Error(`web/contact.json: stores[${i}].email is not an address`);
  });
  return c;
}

// Phone link: tel: with the number as written (digits, + and dashes only).
const tel = (phone) => "tel:" + phone.replace(/[^0-9+-]/g, "");
const telLink = (p) => `<a class="tel" href="${esc(tel(p))}">${esc(p)}</a>`;
const mailLink = (m) => `<a class="mail" href="mailto:${esc(m)}">${esc(m)}</a>`;

// One show room: name, street, city, "T: <phone>" per number, email.
function storeHtml(s, titleTag) {
  return (
    `<section class="store" aria-label="${esc(s.name)}"><${titleTag} class="store-title">${esc(s.name)}</${titleTag}>` +
    `<p class="addr">${esc(s.street)}<br>${esc(s.city)}</p>` +
    s.phones.map((p) => `<p class="phone">T: ${telLink(p)}</p>`).join("") +
    (s.email ? `<p class="email">${mailLink(s.email)}</p>` : "") +
    `</section>`
  );
}

export function contactBlocks(c) {
  return {
    head:
      `<!--contact--><div class="contact"><p class="store-name">${esc(c.storeName)}</p>` +
      `<div class="stores">${c.stores.map((s) => storeHtml(s, "p")).join("")}</div>` +
      `<p class="call-buttons">${c.stores.map((s) => `<a class="call" href="${esc(tel(s.phones[0]))}">Call ${esc(s.name)}</a>`).join("")}</p>` +
      `</div><!--/contact-->`,
    foot:
      `<!--contact--><section class="foot-contact card" aria-labelledby="foot-store"><h2 class="store-name" id="foot-store">${esc(c.storeName)}</h2>` +
      `<div class="stores">${c.stores.map((s) => storeHtml(s, "h3")).join("")}</div>` +
      `<p class="website"><a href="${esc(c.website)}">${esc(c.website)}</a></p></section><!--/contact-->`,
  };
}

// Replace the markers, if the page has them. A page without markers is returned unchanged.
export function withContact(html) {
  if (!html.includes("<!--CONTACT:")) return html;
  const b = contactBlocks(readContact());
  return html.replace("<!--CONTACT:head-->", b.head).replace("<!--CONTACT:foot-->", b.foot);
}
