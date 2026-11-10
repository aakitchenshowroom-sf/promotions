// The store's contact info, from web/contact.json (public information, one place to change it).
// The build puts it into the page where index.html has <!--CONTACT:head--> or <!--CONTACT:foot-->.
// Header: store name, phone (tel:) and email (mailto:) side by side, address below.
// Footer: store name, phone, address, then the website and the email.
// Each rendered block is wrapped in <!--contact--> … <!--/contact-->: the public check allows the store's
// street name only inside these blocks (tools/check-public.mjs).
import { join } from "node:path";
import { readJson, repoDir } from "./paths.mjs";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function readContact() {
  const c = readJson(join(repoDir, "web", "contact.json"));
  for (const k of ["storeName", "phone", "address", "website", "email"]) {
    if (!c[k] || typeof c[k] !== "string") throw new Error(`web/contact.json: "${k}" is missing`);
  }
  if (!/^https:\/\//.test(c.website)) throw new Error("web/contact.json: website must start with https://");
  if (!/^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(c.email)) throw new Error("web/contact.json: email is not an address");
  return c;
}

// Phone link: tel: with the number as written (digits and dashes only).
const tel = (phone) => "tel:" + phone.replace(/[^0-9+-]/g, "");

export function contactBlocks(c) {
  const phone = `<a class="tel" href="${esc(tel(c.phone))}">${esc(c.phone)}</a>`;
  const mail = `<a class="mail" href="mailto:${esc(c.email)}">${esc(c.email)}</a>`;
  return {
    head:
      `<!--contact--><div class="contact"><p class="store-name">${esc(c.storeName)}</p>` +
      `<div class="contact-lines"><p class="reach">${phone}${mail}</p>` +
      `<p class="addr">${esc(c.address)}</p></div></div><!--/contact-->`,
    foot:
      `<!--contact--><section class="foot-contact" aria-label="Contact"><h2 class="store-name">${esc(c.storeName)}</h2>` +
      `<p class="phone">${phone}</p><p class="addr">${esc(c.address)}</p>` +
      `<p class="links"><a href="${esc(c.website)}">${esc(c.website)}</a>` +
      `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p></section><!--/contact-->`,
  };
}

// Replace the markers, if the page has them. A page without markers is returned unchanged.
export function withContact(html) {
  if (!html.includes("<!--CONTACT:")) return html;
  const b = contactBlocks(readContact());
  return html.replace("<!--CONTACT:head-->", b.head).replace("<!--CONTACT:foot-->", b.foot);
}
