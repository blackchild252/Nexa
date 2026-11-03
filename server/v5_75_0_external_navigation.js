"use strict";
const crypto = require("node:crypto");

const MILESTONES = Object.freeze([
  [1225,"external-url-policy-contract"],[1226,"https-only-navigation-contract"],[1227,"blocked-scheme-contract"],[1228,"hostname-normalization-contract"],[1229,"paystack-host-allowlist-contract"],
  [1230,"google-host-allowlist-contract"],[1231,"ad-target-url-validation-contract"],[1232,"ad-image-url-validation-contract"],[1233,"url-length-bound-contract"],[1234,"credential-free-url-contract"],
  [1235,"userinfo-free-url-contract"],[1236,"fragment-stripping-contract"],[1237,"javascript-url-rejection-contract"],[1238,"data-url-rejection-contract"],[1239,"file-url-rejection-contract"],
  [1240,"localhost-navigation-rejection-contract"],[1241,"private-host-navigation-rejection-contract"],[1242,"payment-url-origin-contract"],[1243,"ad-navigation-audit-contract"],[1244,"safe-navigation-error-contract"],
  [1245,"client-navigation-helper-contract"],[1246,"payment-navigation-integration-contract"],[1247,"yaayz-ad-navigation-integration-contract"],[1248,"external-navigation-certification-contract"],[1249,"cumulative-external-navigation-certification"]
]);
const MAX_URL_LENGTH = 2048;
const ALLOWED_PAYMENT_HOSTS = new Set(["checkout.paystack.com", "paystack.com", "www.paystack.com"]);
const ALLOWED_GOOGLE_HOSTS = new Set(["accounts.google.com", "oauth2.googleapis.com", "www.googleapis.com"]);
const PRIVATE_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
const BLOCKED_PROTOCOLS = new Set(["javascript:","data:","file:","blob:","vbscript:","about:"]);

function parseExternalUrl(value, { maxLength = MAX_URL_LENGTH } = {}) {
  const raw = String(value ?? "").trim();
  if (!raw || raw.length > Math.max(128, Number(maxLength) || MAX_URL_LENGTH)) return { ok:false, reason: raw ? "too_long" : "empty" };
  let u;
  try { u = new URL(raw); } catch { return { ok:false, reason:"invalid_url" }; }
  const protocol = u.protocol.toLowerCase();
  const hostname = u.hostname.toLowerCase().replace(/\.$/,"");
  if (BLOCKED_PROTOCOLS.has(protocol)) return { ok:false, reason:"blocked_protocol" };
  if (protocol !== "https:") return { ok:false, reason:"https_required" };
  if (u.username || u.password) return { ok:false, reason:"userinfo_forbidden" };
  if (PRIVATE_HOSTS.has(hostname) || /^127\./.test(hostname) || /^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^169\.254\./.test(hostname)) return { ok:false, reason:"private_host_forbidden" };
  u.hash = "";
  return { ok:true, url:u.toString(), protocol, hostname };
}
function allowlistedUrl(value, hosts) {
  const parsed = parseExternalUrl(value);
  if (!parsed.ok) return parsed;
  const allowed = hosts instanceof Set ? hosts : new Set(Array.isArray(hosts) ? hosts.map(v=>String(v).toLowerCase()) : []);
  return allowed.has(parsed.hostname) ? parsed : { ok:false, reason:"host_not_allowlisted", hostname:parsed.hostname };
}
function paymentUrl(value) { return allowlistedUrl(value, ALLOWED_PAYMENT_HOSTS); }
function googleUrl(value) { return allowlistedUrl(value, ALLOWED_GOOGLE_HOSTS); }
function adTargetUrl(value) { return parseExternalUrl(value); }
function adImageUrl(value) { return parseExternalUrl(value); }
function safeNavigationError(reason="blocked") { return { code:"EXTERNAL_NAVIGATION_BLOCKED", error:"This external link could not be opened safely.", reason:String(reason) }; }
function certification(results=[]) { const r=Array.isArray(results)?results:[]; return { total:r.length, passed:r.filter(Boolean).length, ok:r.length===25 && r.every(Boolean) }; }
module.exports={MILESTONES,MAX_URL_LENGTH,ALLOWED_PAYMENT_HOSTS,ALLOWED_GOOGLE_HOSTS,parseExternalUrl,allowlistedUrl,paymentUrl,googleUrl,adTargetUrl,adImageUrl,safeNavigationError,certification};
