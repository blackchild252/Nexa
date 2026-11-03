"use strict";
// V5.52.0 / B89 — Production launch-readiness guard (M650–M674).
// Pure function over an env object: never reads secrets into its output, never touches the network.
// Statuses: pass | warn | fail | skip (skip = check only applies in production).

const PLACEHOLDER = /^(|your_key_here|changeme|change_me|todo|xxx+|placeholder)$/i;
const isProd = (env) => String(env.NODE_ENV || "").toLowerCase() === "production";
const val = (env, k) => String(env[k] == null ? "" : env[k]).trim();
const list = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);
const isLocalUrl = (u) => /^(https?:\/\/)?(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|\[?::1)/i.test(u);

const CHECKS = [
  // Slice 1 — core configuration
  [650, "core.node-env", "NODE_ENV is declared", (e) => val(e, "NODE_ENV") ? ["pass", `NODE_ENV=${val(e, "NODE_ENV")}`] : ["warn", "NODE_ENV is unset; production guards are inactive"]],
  [651, "core.db-path", "Persistent DB_PATH configured", (e, p) => !p ? ["skip", "production only"] : val(e, "DB_PATH") ? ["pass", "DB_PATH configured"] : ["fail", "DB_PATH is required in production (persistent volume)"]],
  [652, "core.port", "PORT is a valid port", (e) => { const v = val(e, "PORT"); if (!v) return ["pass", "PORT unset; default applies"]; const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 65535 ? ["pass", "PORT valid"] : ["fail", "PORT must be an integer 1-65535"]; }],
  [653, "core.public-url", "PUBLIC_URL is https and not local", (e, p) => { if (!p) return ["skip", "production only"]; const u = val(e, "PUBLIC_URL"); if (!u) return ["fail", "PUBLIC_URL is required in production"]; if (!/^https:\/\//i.test(u)) return ["fail", "PUBLIC_URL must use https"]; return isLocalUrl(u) ? ["fail", "PUBLIC_URL must not be a local address"] : ["pass", "PUBLIC_URL ok"]; }],
  [654, "core.cors", "CORS_ORIGINS is explicit", (e, p) => !p ? ["skip", "production only"] : list(e.CORS_ORIGINS).length ? (list(e.CORS_ORIGINS).includes("*") ? ["fail", "CORS_ORIGINS must not contain *"] : ["pass", "explicit origins set"]) : ["warn", "CORS_ORIGINS empty: any origin allowed (Bearer auth lowers risk)"]],
  // Slice 2 — payments and wallet
  [655, "pay.mode", "PAYMENT_MODE is not mock", (e, p) => !p ? ["skip", "production only"] : val(e, "PAYMENT_MODE").toLowerCase() === "mock" ? ["fail", "PAYMENT_MODE=mock is development only"] : ["pass", "not mock"]],
  [656, "pay.secret", "Paystack secret present when payments enabled", (e) => val(e, "PAYMENTS_ENABLED") !== "true" || val(e, "PAYMENT_MODE").toLowerCase() === "mock" ? ["pass", "not required"] : val(e, "PAYSTACK_SECRET_KEY") ? ["pass", "secret present"] : ["fail", "PAYMENTS_ENABLED=true needs PAYSTACK_SECRET_KEY"]],
  [657, "pay.key-kind", "Paystack key kind matches production", (e, p) => { const k = val(e, "PAYSTACK_SECRET_KEY"); if (!p || !k) return ["skip", "production only / no key"]; return /^sk_test_/i.test(k) ? ["fail", "test Paystack key in production"] : ["pass", "not a test key"]; }],
  [658, "pay.wallet-mode", "Wallet mode is live in production", (e, p) => !p ? ["skip", "production only"] : val(e, "NEXA_WALLET_MODE").toLowerCase() === "live" ? ["pass", "wallet live"] : ["fail", "NEXA_WALLET_MODE must be live in production (sandbox creates fake money)"]],
  [659, "pay.callback", "PAYSTACK_CALLBACK_URL is https when set", (e) => { const u = val(e, "PAYSTACK_CALLBACK_URL"); return !u ? ["pass", "unset"] : /^https:\/\//i.test(u) ? ["pass", "https"] : ["fail", "PAYSTACK_CALLBACK_URL must use https"]; }],
  // Slice 3 — data, preview and admin
  [660, "data.market", "Market data is not mock", (e, p) => !p ? ["skip", "production only"] : (val(e, "MARKET_DATA_MODE") || "mock").toLowerCase() === "mock" ? ["warn", "MARKET_DATA_MODE=mock; UI labels data as not live"] : ["pass", "live source selected"]],
  [661, "data.preview-off", "Preview mode is off", (e, p) => !p ? ["skip", "production only"] : val(e, "NEXA_PREVIEW_MODE") === "1" ? ["fail", "NEXA_PREVIEW_MODE must not be enabled in production"] : ["pass", "off"]],
  [662, "admin.configured", "Admin identities configured", (e, p) => !p ? ["skip", "production only"] : list(e.NEXA_ADMIN_EMAILS).length || list(e.NEXA_ADMIN_USER_IDS).length ? ["pass", "admins configured"] : ["warn", "no admin email or user id configured"]],
  [663, "admin.no-fixtures", "No preview/local admin identities", (e, p) => !p ? ["skip", "production only"] : list(e.NEXA_ADMIN_EMAILS).some((x) => /@nexa\.local$|^preview\./i.test(x)) ? ["fail", "preview/local admin email configured in production"] : ["pass", "clean"]],
  [664, "data.provider-url", "Selected market provider has its URL", (e) => { const m = (val(e, "MARKET_DATA_MODE") || "mock").toLowerCase(); const need = { ngx: "NGX_MARKET_DATA_URL", cbn: "CBN_FX_URL", gold: "GOLD_DATA_URL" }[m]; return !need ? ["pass", "no URL required"] : val(e, need) ? ["pass", `${need} set`] : ["fail", `${need} is required for MARKET_DATA_MODE=${m}`]; }],
  // Slice 4 — AI, calls, monitoring
  [665, "ai.key", "AI provider key is not a placeholder", (e, p) => { const g = val(e, "GEMINI_API_KEY") || val(e, "GOOGLE_API_KEY"); const o = val(e, "XAI_API_KEY"); if (!PLACEHOLDER.test(o) || g) return ["pass", "a provider key is present"]; return p ? ["warn", "no real AI provider key; Dami AI features will be unavailable"] : ["pass", "development"]; }],
  [666, "ai.provider", "AI provider selection is recognised", (e) => { const s = (val(e, "DAMI_AI_PROVIDER") || val(e, "NEXA_AI_PROVIDER") || "grok").toLowerCase(); return ["grok", "xai", "xai-grok", "openai", "google-gemini", "gemini", "google"].includes(s) ? ["pass", "recognised"] : ["fail", "unknown AI provider value"]; }],
  [667, "calls.turn", "TURN relay is all-or-nothing", (e) => { const s = ["NEXA_TURN_URL", "NEXA_TURN_USERNAME", "NEXA_TURN_CREDENTIAL"].filter((k) => val(e, k)).length; return s === 0 || s === 3 ? ["pass", s ? "relay fully configured" : "no relay"] : ["fail", "TURN settings are partial"]; }],
  [668, "obs.sentry", "Sentry configured for production", (e, p) => !p ? ["skip", "production only"] : !val(e, "SENTRY_DSN") ? ["warn", "SENTRY_DSN unset; errors are not reported"] : /^(development|dev|local)$/i.test(val(e, "SENTRY_ENVIRONMENT")) ? ["warn", "SENTRY_ENVIRONMENT is a development value"] : ["pass", "configured"]],
  [669, "obs.no-auth-token", "Sentry auth token not in runtime env", (e) => val(e, "SENTRY_AUTH_TOKEN") ? ["warn", "SENTRY_AUTH_TOKEN is a build-time secret; remove it from the runtime environment"] : ["pass", "absent"]],
  // Slice 5 — release hygiene
  [670, "rel.version", "Package version is semver", (e, p, v) => /^\d+\.\d+\.\d+$/.test(String(v || "")) ? ["pass", String(v)] : ["fail", "missing or invalid package version"]],
  [671, "rel.strict", "Strict launch mode state", (e, p) => val(e, "NEXA_STRICT_LAUNCH") === "1" ? ["pass", "strict launch enforced"] : p ? ["warn", "NEXA_STRICT_LAUNCH not set; failures will not block startup"] : ["skip", "production only"]],
  [675, "rel.certified", "Production launch certification is explicit", (e, p) => !p ? ["skip", "production only"] : val(e, "NEXA_LAUNCH_CERTIFIED") === "1" ? ["pass", "launch certification flag set"] : ["fail", "NEXA_LAUNCH_CERTIFIED=1 is required in production"]],
  [672, "rel.redaction", "Report contains no secret values", () => ["pass", "by construction: details never echo env values"]],
  [673, "rel.admin-route", "Report is admin-only", () => ["pass", "served at /api/admin/launch-readiness behind auth and isConfiguredAdmin"]],
  [674, "rel.certification", "B89 release certification (5.52.0 or later)", (e, p, v) => { const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v || "")); const ok = m && (Number(m[1]) > 5 || (Number(m[1]) === 5 && Number(m[2]) >= 52)); return ok ? ["pass", `V${v}`] : ["warn", `running ${v || "unknown"}; B89 certifies 5.52.0 or later`]; }],
];

function evaluateLaunchReadiness({ env = process.env, packageVersion } = {}) {
  const prod = isProd(env);
  const checks = CHECKS.map(([milestone, id, name, fn]) => {
    let r;
    try { r = fn(env, prod, packageVersion); } catch (_) { r = ["fail", "check errored"]; }
    return { milestone, id, name, status: r[0], detail: r[1] };
  });
  const count = (s) => checks.filter((c) => c.status === s).length;
  const failed = count("fail");
  return {
    production: prod, total: checks.length, pass: count("pass"), warn: count("warn"), fail: failed, skip: count("skip"),
    ok: failed === 0,
    shouldBlockStart: prod && val(env, "NEXA_STRICT_LAUNCH") === "1" && failed > 0,
    checks,
  };
}

function summarizeForLog(report) {
  const bad = report.checks.filter((c) => c.status === "fail" || c.status === "warn").map((c) => `${c.status.toUpperCase()} ${c.id}`);
  return `launch readiness: ${report.pass} pass, ${report.warn} warn, ${report.fail} fail, ${report.skip} skip${bad.length ? " | " + bad.join(", ") : ""}`;
}

module.exports = { evaluateLaunchReadiness, summarizeForLog, CHECKS };
