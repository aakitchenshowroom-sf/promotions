// What may go public, in one place. Used by build.mjs and check-public.mjs.
import { extname } from "node:path";

// The only promo fields the public page receives.
export const PUBLIC_FIELDS = [
  "id", "brands", "title", "offerCode", "summary", "benefit", "redemption", "amountHeadline", "tiers", "categories",
  "purchaseStart", "purchaseEnd", "deliverBy", "claimBy", "serialBy", "claimNote", "claimSteps", "claimUrl", "claimUrlLabel",
  "infoUrl", "payout", "conditions", "eligibleNote", "eligible", "translation", "downloads",
];

// Flags that keep a promo off the public page even when verified, until the open question is settled.
export const BLOCKING_FLAGS = ["claim-form"];

// Original brand files are offered for download (maintainer's decision, round 2). Card text rules are unchanged.
export const DOWNLOAD_LABEL = {
  "claim-form-terms": "Claim form & full terms (PDF)",
  "terms": "Full terms (PDF)",
  "flyer": "Promotion flyer",
};
export const DOWNLOAD_EXT = [".pdf", ".jpg", ".jpeg", ".png"];

export function publishable(p) {
  return Boolean(p.verifiedAt) && !p.hold && !p.flags.some((f) => BLOCKING_FLAGS.includes(f)) && p.claimSteps.length > 0;
}

// Downloadable originals of a promo: [{ label, source, publicName }]. Byte-identical duplicates are marked
// "duplicate" in the data and skipped. Public names use the promo id, so URLs have no spaces, $ or Chinese.
export function downloadsOf(p) {
  const list = p.sources.filter((s) => s.download && s.download !== "duplicate");
  return list.map((s, i) => ({
    label: DOWNLOAD_LABEL[s.download],
    source: s,
    publicName: `${p.id}${list.length > 1 ? `-${i + 1}` : ""}${extname(s.file).toLowerCase()}`,
  }));
}

export const pick = (p) => Object.fromEntries(PUBLIC_FIELDS.filter((k) => k !== "downloads").map((k) => [k, p[k] ?? null]));
