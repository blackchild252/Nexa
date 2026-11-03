"use strict";
const crypto = require("node:crypto");

const MILESTONES = Object.freeze([
  [850,"production-cors-fail-closed"],[851,"request-target-bounds"],[852,"query-key-count-bound"],[853,"header-value-bound"],[854,"content-type-policy"],
  [855,"safe-error-envelope"],[856,"sensitive-header-scrub"],[857,"pagination-bound"],[858,"cursor-bound"],[859,"admin-rate-limit-policy"],
  [860,"admin-step-up-action-binding"],[861,"auth-attempt-envelope"],[862,"session-count-cap"],[863,"session-idle-window"],[864,"revocation-reason-contract"],
  [865,"password-change-session-revocation"],[866,"oauth-exchange-atomic-consumption"],[867,"webhook-freshness-contract"],[868,"webhook-body-binding"],[869,"provider-circuit-state"],
  [870,"external-url-allowlist"],[871,"safe-upload-filename"],[872,"upload-mime-extension-parity"],[873,"upload-image-pixel-bound"],[874,"major-hardening-certification"]
]);
const MAX_TARGET_BYTES = 8192;
const MAX_QUERY_KEYS = 40;
const MAX_HEADER_VALUE = 2048;
const MAX_PAGE_SIZE = 100;
const MAX_CURSOR = 512;
const DEFAULT_SESSION_CAP = 10;
const DEFAULT_IDLE_MS = 12 * 60 * 60 * 1000;
const DEFAULT_WEBHOOK_MAX_AGE_MS = 10 * 60 * 1000;
const MAX_IMAGE_PIXELS = 40_000_000;

function productionCorsPolicy({ nodeEnv, origins = [] } = {}) {
  const prod = String(nodeEnv || "").toLowerCase() === "production";
  const list = Array.isArray(origins) ? origins.map(v => String(v || "").trim()).filter(Boolean) : [];
  return { ok: !prod || list.length > 0, production: prod, origins: list };
}
function requestTargetBounds(target, maxBytes = MAX_TARGET_BYTES) {
  const value = String(target || "");
  const bytes = Buffer.byteLength(value, "utf8");
  return { ok: bytes <= Math.max(1024, Number(maxBytes) || MAX_TARGET_BYTES), bytes, maxBytes: Math.max(1024, Number(maxBytes) || MAX_TARGET_BYTES) };
}
function queryKeyCount(query, max = MAX_QUERY_KEYS) {
  const keys = query && typeof query === "object" ? Object.keys(query) : [];
  return { ok: keys.length <= Math.max(1, Number(max) || MAX_QUERY_KEYS), count: keys.length, max: Math.max(1, Number(max) || MAX_QUERY_KEYS) };
}
function headerValueBound(value, max = MAX_HEADER_VALUE) {
  const bytes = Buffer.byteLength(String(value || ""), "utf8");
  return { ok: bytes <= Math.max(128, Number(max) || MAX_HEADER_VALUE), bytes, maxBytes: Math.max(128, Number(max) || MAX_HEADER_VALUE) };
}
function contentTypePolicy(method, contentType) {
  const m = String(method || "GET").toUpperCase();
  const ct = String(contentType || "").toLowerCase();
  if (["GET","HEAD","DELETE"].includes(m)) return { ok: !ct || ct.includes("application/json") || ct.includes("text/") };
  return { ok: ct.includes("application/json") || ct.includes("multipart/form-data") || ct.includes("application/octet-stream"), contentType: ct.split(";")[0] || "" };
}
function safeErrorEnvelope(error, requestId) {
  const status = Number.isInteger(Number(error?.status)) && Number(error.status) >= 400 && Number(error.status) < 500 ? Number(error.status) : 500;
  return { status, code: status === 500 ? "INTERNAL_ERROR" : String(error?.code || `HTTP_${status}`), error: status === 500 ? "An unexpected server error occurred." : String(error?.publicMessage || "Request failed."), requestId: requestId || null };
}
function scrubSensitiveHeaders(headers = {}) {
  const out = {};
  for (const [k,v] of Object.entries(headers || {})) out[/authorization|cookie|set-cookie|proxy-authorization|x-api-key/i.test(k) ? k : k] = /authorization|cookie|set-cookie|proxy-authorization|x-api-key/i.test(k) ? "[REDACTED]" : v;
  return out;
}
function paginationBound(value, fallback = 50, max = MAX_PAGE_SIZE) {
  const n = Number.parseInt(String(value ?? ""), 10);
  const safeMax = Math.max(1, Number(max) || MAX_PAGE_SIZE);
  return Number.isFinite(n) ? Math.min(Math.max(n,1),safeMax) : Math.min(Math.max(fallback,1),safeMax);
}
function cursorBound(value, max = MAX_CURSOR) {
  const cursor = String(value || "").trim();
  return { ok: cursor.length <= Math.max(32, Number(max) || MAX_CURSOR), cursor: cursor.slice(0, Math.max(32, Number(max) || MAX_CURSOR)) };
}
function adminRateLimitPolicy({ windowMs = 60_000, max = 30 } = {}) { return { windowMs: Math.max(1000,Number(windowMs)||60_000), max: Math.max(1,Math.min(100,Number(max)||30)) }; }
function adminStepUpActionBinding({ action, issuedAt, requestAction, now = new Date(), maxAgeMs = 15*60*1000 } = {}) {
  const age = new Date(now).getTime() - new Date(issuedAt).getTime();
  return { ok: String(action||"") === String(requestAction||"") && Number.isFinite(age) && age >= 0 && age <= Math.max(60_000,Number(maxAgeMs)||15*60*1000), ageMs: age };
}
function authAttemptEnvelope({ ip, email, now = new Date() } = {}) { return { key: crypto.createHash("sha256").update(`${String(ip||"unknown")}|${String(email||"").trim().toLowerCase()}`).digest("hex"), at: new Date(now).toISOString() }; }
function sessionCountCap(count, cap = DEFAULT_SESSION_CAP) { const n=Math.max(0,Number(count)||0), max=Math.max(1,Number(cap)||DEFAULT_SESSION_CAP); return { ok:n<=max,count:n,max }; }
function sessionIdleWindow(lastSeenAt, now = new Date(), idleMs = DEFAULT_IDLE_MS) { const age=new Date(now).getTime()-new Date(lastSeenAt).getTime(); const max=Math.max(60_000,Number(idleMs)||DEFAULT_IDLE_MS); return { ok:Number.isFinite(age)&&age>=0&&age<=max,ageMs:age,maxIdleMs:max }; }
function revocationReason(reason) { const r=String(reason||"").trim().toLowerCase().replace(/[^a-z0-9_.:-]/g,"_").slice(0,80); return r || "manual_logout"; }
function passwordChangeSessionRevocation(changed) { return { ok:Boolean(changed), revokeAll:true, reason:"password_changed" }; }
function oauthExchangeAtomicConsumption({ consumedAt, now = new Date() } = {}) { return { ok:!consumedAt, consumedAt:consumedAt||null, checkedAt:new Date(now).toISOString() }; }
function webhookFreshness(timestamp, now = new Date(), maxAgeMs = DEFAULT_WEBHOOK_MAX_AGE_MS) { const age=new Date(now).getTime()-new Date(timestamp).getTime(); const max=Math.max(30_000,Number(maxAgeMs)||DEFAULT_WEBHOOK_MAX_AGE_MS); return { ok:Number.isFinite(age)&&age>=-30_000&&age<=max,ageMs:age,maxAgeMs:max }; }
function webhookBodyBinding(rawBody, bodyHash) { const actual=crypto.createHash("sha256").update(rawBody||Buffer.from("")).digest("hex"); return { ok:Boolean(bodyHash)&&crypto.timingSafeEqual(Buffer.from(actual),Buffer.from(String(bodyHash))),sha256:actual }; }
function providerCircuitState({ failures=0, openedAt=null, now=new Date(), cooldownMs=60_000, threshold=5 }={}) { const f=Math.max(0,Number(failures)||0), cool=Math.max(1000,Number(cooldownMs)||60_000); const open=f>=Math.max(1,Number(threshold)||5); const elapsed=openedAt?new Date(now).getTime()-new Date(openedAt).getTime():0; return { open:open&&elapsed<cool, failures:f, retryAllowed:open?elapsed>=cool:true }; }
function externalUrlAllowlist(url, allowedHosts=[]) { let parsed; try { parsed=new URL(String(url)); } catch { return {ok:false,reason:"invalid_url"}; } const hosts=new Set((Array.isArray(allowedHosts)?allowedHosts:[]).map(h=>String(h).toLowerCase())); const scheme=["https:"].includes(parsed.protocol); return {ok:scheme&&hosts.has(parsed.hostname.toLowerCase()),host:parsed.hostname,protocol:parsed.protocol}; }
function safeUploadFilename(name) { const raw=String(name||"").normalize("NFKC"); const base=raw.split(/[\\/]/).pop().replace(/[^A-Za-z0-9._-]/g,"_").slice(0,120); return {ok:Boolean(base)&&base!=="."&&base!=="..",filename:base}; }
function uploadMimeExtensionParity(name,mime) { const ext=(String(name||"").toLowerCase().match(/\.([a-z0-9]{1,8})$/)||[])[1]||""; const m=String(mime||"").toLowerCase().split(";")[0]; const map={"image/jpeg":["jpg","jpeg"],"image/png":["png"],"image/webp":["webp"],"application/pdf":["pdf"],"text/plain":["txt"]}; return {ok:Boolean(map[m]?.includes(ext)),extension:ext,mime:m}; }
function uploadImagePixelBound(width,height,maxPixels=MAX_IMAGE_PIXELS) { const w=Number(width),h=Number(height),max=Math.max(1,Number(maxPixels)||MAX_IMAGE_PIXELS); return {ok:Number.isInteger(w)&&Number.isInteger(h)&&w>0&&h>0&&w*h<=max,pixels:Number.isFinite(w*h)?w*h:null,maxPixels:max}; }
function certification(results=[]) { const r=Array.isArray(results)?results:[]; return {total:r.length,passed:r.filter(Boolean).length,ok:r.length===25&&r.every(Boolean)}; }
module.exports={MILESTONES,MAX_TARGET_BYTES,MAX_QUERY_KEYS,MAX_HEADER_VALUE,MAX_PAGE_SIZE,MAX_CURSOR,DEFAULT_SESSION_CAP,DEFAULT_IDLE_MS,DEFAULT_WEBHOOK_MAX_AGE_MS,MAX_IMAGE_PIXELS,productionCorsPolicy,requestTargetBounds,queryKeyCount,headerValueBound,contentTypePolicy,safeErrorEnvelope,scrubSensitiveHeaders,paginationBound,cursorBound,adminRateLimitPolicy,adminStepUpActionBinding,authAttemptEnvelope,sessionCountCap,sessionIdleWindow,revocationReason,passwordChangeSessionRevocation,oauthExchangeAtomicConsumption,webhookFreshness,webhookBodyBinding,providerCircuitState,externalUrlAllowlist,safeUploadFilename,uploadMimeExtensionParity,uploadImagePixelBound,certification};
