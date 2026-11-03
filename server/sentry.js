const MAX_MESSAGE_LENGTH = 300;
const DEFAULT_TRACES_SAMPLE_RATE = 0.1;
const SENSITIVE_HEADER = /^(?:authorization|cookie|set-cookie|proxy-authorization|x-api-key|x-auth-token)$/i;

// Unset means the default. A value that is not a plain number from 0 to 1 turns tracing off (fail closed) instead of becoming NaN.
function parseSampleRate(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === "") return DEFAULT_TRACES_SAMPLE_RATE;
  const text = String(raw).trim();
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(text)) return 0;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0;
}

// Only an http(s) address counts as a monitoring destination; anything else leaves monitoring disabled.
function validDsn(raw) {
  try { const url = new URL(raw); return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname); } catch (_) { return false; }
}

function stripQuery(value) {
  const text = String(value);
  const cut = text.search(/[?#]/);
  return cut === -1 ? text : text.slice(0, cut);
}

// Applied to every outgoing event: no request body, cookies, query string or credential headers, and only the user id.
function scrubEvent(event) {
  if (!event || typeof event !== "object") return event;
  const request = event.request;
  if (request && typeof request === "object") {
    delete request.data; delete request.cookies; delete request.query_string;
    if (typeof request.url === "string") request.url = stripQuery(request.url);
    if (request.headers && typeof request.headers === "object") {
      for (const name of Object.keys(request.headers)) if (SENSITIVE_HEADER.test(name)) delete request.headers[name];
    }
  }
  if (event.user && typeof event.user === "object") event.user = event.user.id ? { id: String(event.user.id) } : undefined;
  if (Array.isArray(event.breadcrumbs)) event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb).filter(Boolean);
  return event;
}

// Breadcrumbs keep the address without its query string or fragment, and never a request or response body.
function scrubBreadcrumb(crumb) {
  if (!crumb || typeof crumb !== "object") return crumb;
  const data = crumb.data;
  if (data && typeof data === "object") {
    for (const key of ["url", "from", "to"]) if (typeof data[key] === "string") data[key] = stripQuery(data[key]);
    for (const key of ["body", "request_body", "response_body", "query", "query_string"]) delete data[key];
  }
  return crumb;
}

const SENTRY_DSN = String(process.env.SENTRY_DSN || "").trim();
const dsnUsable = Boolean(SENTRY_DSN) && validDsn(SENTRY_DSN);
let Sentry = null;

if (SENTRY_DSN && !dsnUsable) {
  console.warn("[sentry] SENTRY_DSN is not a valid http(s) address; monitoring disabled.");
} else if (dsnUsable) {
  try {
    Sentry = require("@sentry/node");
    const rawRate = process.env.SENTRY_TRACES_SAMPLE_RATE;
    const tracesSampleRate = parseSampleRate(rawRate);
    if (rawRate !== undefined && String(rawRate).trim() !== "" && tracesSampleRate === 0 && Number(rawRate) !== 0) console.warn("[sentry] SENTRY_TRACES_SAMPLE_RATE is not a number from 0 to 1; tracing disabled.");
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
      tracesSampleRate,
      sendDefaultPii: false,
      beforeSend: scrubEvent,
      beforeBreadcrumb: scrubBreadcrumb,
    });
  } catch (error) {
    // Keep the app bootable until dependencies are installed; release gates report the state.
    console.warn("[sentry] SDK unavailable; monitoring disabled:", error.message);
    Sentry = null;
  }
}

// True only when a working SDK is loaded; a configured address with a missing SDK is reported as disabled.
const enabled = Boolean(Sentry);

function captureException(error, context = {}) {
  if (!Sentry) return null;
  return Sentry.withScope((scope) => {
    for (const [key, value] of Object.entries(context || {})) scope.setExtra(key, value);
    return Sentry.captureException(error);
  });
}

function captureMessage(message, level = 'info') {
  if (!Sentry) return null;
  return Sentry.captureMessage(String(message).replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, MAX_MESSAGE_LENGTH), level);
}

function setUser(user) {
  if (!Sentry) return;
  // Do not send credentials, tokens, payment data, or other sensitive account fields.
  const safe = user?.id ? { id: String(user.id) } : null;
  Sentry.setUser(safe);
}

function setRequestContext(requestId) {
  if (!Sentry || !requestId) return;
  const id = String(requestId).slice(0, 100);
  // The isolation scope belongs to one request; the current scope can be shared by requests that overlap.
  const scope = typeof Sentry.getIsolationScope === 'function' ? Sentry.getIsolationScope() : Sentry.getCurrentScope();
  scope.setTag('request_id', id);
}

function setupExpressErrorHandler(app) {
  if (!Sentry) return;
  if (typeof Sentry.setupExpressErrorHandler === 'function') Sentry.setupExpressErrorHandler(app);
}

module.exports = { enabled, parseSampleRate, validDsn, scrubEvent, scrubBreadcrumb, captureException, captureMessage, setUser, setRequestContext, setupExpressErrorHandler };
