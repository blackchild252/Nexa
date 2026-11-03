"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { evaluateLaunchReadiness, summarizeForLog, CHECKS } = require("./launchReadiness");

const PROD = { NEXA_LAUNCH_CERTIFIED: "1", NODE_ENV: "production", DB_PATH: "/data/nexa.db", PUBLIC_URL: "https://api.example.com", CORS_ORIGINS: "https://app.example.com", PAYMENT_MODE: "live", NEXA_WALLET_MODE: "live", MARKET_DATA_MODE: "live", NEXA_ADMIN_EMAILS: "owner@example.com", XAI_API_KEY: "sk-real", SENTRY_DSN: "https://x@sentry.io/1", SENTRY_ENVIRONMENT: "production", NEXA_STRICT_LAUNCH: "1" };
const V = "5.52.0";
const st = (env, id, v = V) => evaluateLaunchReadiness({ env, packageVersion: v }).checks.find((c) => c.id === id).status;
const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

test("M650 NODE_ENV declaration is reported", () => { assert.equal(st({}, "core.node-env"), "warn"); assert.equal(st({ NODE_ENV: "production" }, "core.node-env"), "pass"); });
test("M651 production requires DB_PATH", () => { assert.equal(st({ NODE_ENV: "production" }, "core.db-path"), "fail"); assert.equal(st(PROD, "core.db-path"), "pass"); assert.equal(st({}, "core.db-path"), "skip"); });
test("M652 PORT must be a valid port", () => { assert.equal(st({ PORT: "abc" }, "core.port"), "fail"); assert.equal(st({ PORT: "70000" }, "core.port"), "fail"); assert.equal(st({ PORT: "4000" }, "core.port"), "pass"); assert.equal(st({}, "core.port"), "pass"); });
test("M653 PUBLIC_URL must be https and non-local in production", () => { for (const u of ["", "http://api.example.com", "https://localhost:3000", "https://192.168.1.4"]) assert.equal(st({ ...PROD, PUBLIC_URL: u }, "core.public-url"), "fail"); assert.equal(st(PROD, "core.public-url"), "pass"); });
test("M654 CORS is explicit and never wildcard", () => { assert.equal(st({ ...PROD, CORS_ORIGINS: "" }, "core.cors"), "warn"); assert.equal(st({ ...PROD, CORS_ORIGINS: "*" }, "core.cors"), "fail"); assert.equal(st(PROD, "core.cors"), "pass"); });
test("M655 mock payments fail in production", () => { assert.equal(st({ ...PROD, PAYMENT_MODE: "mock" }, "pay.mode"), "fail"); assert.equal(st(PROD, "pay.mode"), "pass"); });
test("M656 enabled payments require the Paystack secret", () => { assert.equal(st({ PAYMENTS_ENABLED: "true", PAYMENT_MODE: "live" }, "pay.secret"), "fail"); assert.equal(st({ PAYMENTS_ENABLED: "true", PAYMENT_MODE: "live", PAYSTACK_SECRET_KEY: "sk_live_abc" }, "pay.secret"), "pass"); assert.equal(st({}, "pay.secret"), "pass"); });
test("M657 test Paystack key fails in production", () => { assert.equal(st({ ...PROD, PAYSTACK_SECRET_KEY: "sk_test_abc" }, "pay.key-kind"), "fail"); assert.equal(st({ ...PROD, PAYSTACK_SECRET_KEY: "sk_live_abc" }, "pay.key-kind"), "pass"); });
test("M658 sandbox wallet in production fails", () => { assert.equal(st({ ...PROD, NEXA_WALLET_MODE: "sandbox" }, "pay.wallet-mode"), "fail"); assert.equal(st(PROD, "pay.wallet-mode"), "pass"); });
test("M659 Paystack callback must be https", () => { assert.equal(st({ PAYSTACK_CALLBACK_URL: "http://x.com/cb" }, "pay.callback"), "fail"); assert.equal(st({ PAYSTACK_CALLBACK_URL: "https://x.com/cb" }, "pay.callback"), "pass"); });
test("M660 mock market data warns in production", () => { assert.equal(st({ ...PROD, MARKET_DATA_MODE: "mock" }, "data.market"), "warn"); assert.equal(st({ ...PROD, MARKET_DATA_MODE: "" }, "data.market"), "warn"); assert.equal(st(PROD, "data.market"), "pass"); });
test("M661 preview mode fails in production", () => { assert.equal(st({ ...PROD, NEXA_PREVIEW_MODE: "1" }, "data.preview-off"), "fail"); assert.equal(st(PROD, "data.preview-off"), "pass"); });
test("M662 admin identities are configured", () => { assert.equal(st({ ...PROD, NEXA_ADMIN_EMAILS: "" }, "admin.configured"), "warn"); assert.equal(st({ ...PROD, NEXA_ADMIN_EMAILS: "", NEXA_ADMIN_USER_IDS: "u1" }, "admin.configured"), "pass"); });
test("M663 fixture admin identities fail in production", () => { assert.equal(st({ ...PROD, NEXA_ADMIN_EMAILS: "preview.admin@nexa.local" }, "admin.no-fixtures"), "fail"); assert.equal(st(PROD, "admin.no-fixtures"), "pass"); });
test("M664 market provider needs its URL", () => { assert.equal(st({ MARKET_DATA_MODE: "ngx" }, "data.provider-url"), "fail"); assert.equal(st({ MARKET_DATA_MODE: "ngx", NGX_MARKET_DATA_URL: "https://x" }, "data.provider-url"), "pass"); assert.equal(st({ MARKET_DATA_MODE: "live" }, "data.provider-url"), "pass"); });
test("M665 placeholder AI key warns in production", () => { assert.equal(st({ ...PROD, XAI_API_KEY: "your_key_here" }, "ai.key"), "warn"); assert.equal(st({ ...PROD, XAI_API_KEY: "" , GEMINI_API_KEY: "g"}, "ai.key"), "pass"); assert.equal(st({ XAI_API_KEY: "your_key_here" }, "ai.key"), "pass"); });
test("M666 unknown AI provider fails", () => { assert.equal(st({ DAMI_AI_PROVIDER: "foo" }, "ai.provider"), "fail"); assert.equal(st({ NEXA_AI_PROVIDER: "gemini" }, "ai.provider"), "pass"); assert.equal(st({}, "ai.provider"), "pass"); });
test("M667 partial TURN settings fail", () => { assert.equal(st({ NEXA_TURN_URL: "turn:x" }, "calls.turn"), "fail"); assert.equal(st({ NEXA_TURN_URL: "a", NEXA_TURN_USERNAME: "b", NEXA_TURN_CREDENTIAL: "c" }, "calls.turn"), "pass"); assert.equal(st({}, "calls.turn"), "pass"); });
test("M668 production Sentry configuration", () => { assert.equal(st({ ...PROD, SENTRY_DSN: "" }, "obs.sentry"), "warn"); assert.equal(st({ ...PROD, SENTRY_ENVIRONMENT: "development" }, "obs.sentry"), "warn"); assert.equal(st(PROD, "obs.sentry"), "pass"); });
test("M669 Sentry auth token in runtime env warns", () => { assert.equal(st({ SENTRY_AUTH_TOKEN: "t" }, "obs.no-auth-token"), "warn"); assert.equal(st({}, "obs.no-auth-token"), "pass"); });
test("M670 package version must be semver", () => { assert.equal(st({}, "rel.version", "5.52"), "fail"); assert.equal(st({}, "rel.version", null), "fail"); assert.equal(st({}, "rel.version", V), "pass"); });
test("M671 strict mode blocks startup only in production with failures", () => {
  assert.equal(evaluateLaunchReadiness({ env: { NODE_ENV: "production", NEXA_STRICT_LAUNCH: "1" }, packageVersion: V }).shouldBlockStart, true);
  assert.equal(evaluateLaunchReadiness({ env: { NODE_ENV: "production" }, packageVersion: V }).shouldBlockStart, false);
  assert.equal(evaluateLaunchReadiness({ env: { NEXA_STRICT_LAUNCH: "1", PORT: "x" }, packageVersion: V }).shouldBlockStart, false);
  assert.equal(evaluateLaunchReadiness({ env: PROD, packageVersion: V }).shouldBlockStart, false);
});
test("M672 reports never echo secret values", () => {
  const env = { ...PROD, XAI_API_KEY: "sk-SECRET-VALUE-123", PAYSTACK_SECRET_KEY: "sk_test_SECRET456", SENTRY_AUTH_TOKEN: "TOKEN789", NEXA_TURN_CREDENTIAL: "CRED000", NEXA_ADMIN_EMAILS: "owner@example.com" };
  const text = JSON.stringify(evaluateLaunchReadiness({ env, packageVersion: V })) + summarizeForLog(evaluateLaunchReadiness({ env, packageVersion: V }));
  for (const s of ["SECRET-VALUE-123", "SECRET456", "TOKEN789", "CRED000", "owner@example.com", "api.example.com"]) assert.ok(!text.includes(s), s);
});
test("M673 launch report route is admin-gated server-side", () => {
  const idx = read("server/index.js");
  const i = idx.indexOf('"/api/admin/launch-readiness"');
  assert.ok(i > 0);
  const block = idx.slice(i, i + 400);
  assert.match(block, /auth\.authMiddleware/);
  assert.match(block, /isConfiguredAdmin\(req\.user\)/);
  assert.match(block, /403/);
  assert.match(idx, /shouldBlockStart[^\n]*process\.exit\(1\)/);
});
test("M674 B89 release metadata and cumulative shape", () => {
  assert.equal(CHECKS.length, 26);
  const milestones = new Set(CHECKS.map((c) => c[0])); for (const n of Array.from({ length: 26 }, (_, i) => 650 + i)) assert.ok(milestones.has(n));
  assert.equal(new Set(CHECKS.map((c) => c[1])).size, CHECKS.length);
  const p = JSON.parse(read("package.json")); assert.match(p.version, /^\d+\.\d+\.\d+$/);
  assert.equal(st({}, "rel.certification", "5.53.0"), "pass"); assert.equal(st({}, "rel.certification", "5.51.0"), "warn");
  const all = evaluateLaunchReadiness({ env: PROD, packageVersion: V });
  assert.equal(all.fail, 0);
});
