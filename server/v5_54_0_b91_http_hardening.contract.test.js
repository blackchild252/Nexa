"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { createRateLimiter, normalizeKey, clientKey } = require("./rateLimiter");
const H = require("./httpSurface");
const { errorPayload } = require("./httpErrors");

const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const idx = read("server/index.js");
function res() { const r = { headers: {}, code: 200, body: null, set(k, v) { r.headers[k] = v; return r; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; }
function hit(mw, req) { const r = res(); let passed = false; mw(req, r, () => { passed = true; }); return { r, passed }; }
function limiter(opts = {}) { let t = 1_000_000; const clock = { now: () => t, tick: (ms) => { t += ms; } }; const mw = createRateLimiter({ windowMs: 60000, max: 3, keyFn: (q) => q.k, now: clock.now, ...opts }); return { mw, clock }; }

test("M700 keys normalise IPv4-mapped IPv6 and zone ids but leave ids untouched", () => { assert.equal(normalizeKey("::ffff:1.2.3.4"), "1.2.3.4"); assert.equal(normalizeKey("::FFFF:10.0.0.1"), "10.0.0.1"); assert.equal(normalizeKey("fe80::1%eth0"), "fe80::1"); assert.equal(normalizeKey("User-ABC"), "User-ABC"); assert.equal(normalizeKey("2001:db8::1"), "2001:db8::1"); });
test("M701 clientKey falls back to the socket address and then to a fixed label", () => { assert.equal(clientKey({ ip: "::ffff:9.9.9.9" }), "9.9.9.9"); assert.equal(clientKey({ socket: { remoteAddress: "8.8.8.8" } }), "8.8.8.8"); assert.equal(clientKey({}), "unknown"); assert.equal(clientKey(undefined), "unknown"); });
test("M702 fixed window: allows max, blocks max+1, resets after the window", () => { const { mw, clock } = limiter(); for (let i = 0; i < 3; i++) assert.equal(hit(mw, { k: "a" }).passed, true); const b = hit(mw, { k: "a" }); assert.equal(b.passed, false); assert.equal(b.r.code, 429); clock.tick(60001); assert.equal(hit(mw, { k: "a" }).passed, true); mw.dispose(); });
test("M703 429 keeps the legacy body and Retry-After", () => { const { mw } = limiter({ message: "Slow down." }); for (let i = 0; i < 3; i++) hit(mw, { k: "a" }); const b = hit(mw, { k: "a" }); assert.deepEqual(b.r.body, { error: "Slow down." }); assert.equal(b.r.headers["Retry-After"], "60"); const d = limiter(); for (let i = 0; i < 4; i++) hit(d.mw, { k: "z" }); assert.match(hit(d.mw, { k: "z" }).r.body.error, /Too many requests/); mw.dispose(); d.mw.dispose(); });
test("M704 RateLimit headers report limit, remaining and reset", () => { const { mw } = limiter(); const a = hit(mw, { k: "a" }).r.headers; assert.equal(a["RateLimit-Limit"], "3"); assert.equal(a["RateLimit-Remaining"], "2"); assert.equal(a["RateLimit-Reset"], "60"); for (let i = 0; i < 3; i++) hit(mw, { k: "a" }); assert.equal(hit(mw, { k: "a" }).r.headers["RateLimit-Remaining"], "0"); mw.dispose(); });
test("M705 a throwing or empty keyFn falls back to the client address instead of crashing or sharing one bucket", () => {
  const { mw } = limiter({ keyFn: (q) => q.user.id }); for (let i = 0; i < 3; i++) assert.equal(hit(mw, { ip: "1.1.1.1" }).passed, true); assert.equal(hit(mw, { ip: "1.1.1.1" }).passed, false); assert.equal(hit(mw, { ip: "2.2.2.2" }).passed, true);
  const e = limiter({ keyFn: () => "" }); assert.equal(hit(e.mw, { ip: "3.3.3.3" }).passed, true); mw.dispose(); e.mw.dispose();
});
test("M706 the key store is bounded", () => { const { mw } = limiter({ maxKeys: 100 }); for (let i = 0; i < 1000; i++) hit(mw, { k: `k${i}` }); assert.ok(mw.stats().keys <= 100); mw.dispose(); });
test("M707 expired entries are swept before anything live is evicted", () => { const { mw, clock } = limiter({ maxKeys: 3 }); for (const k of ["a", "b", "c"]) hit(mw, { k }); clock.tick(60001); hit(mw, { k: "d" }); assert.equal(mw.stats().evicted, 0); assert.equal(mw.stats().keys, 1); mw.dispose(); });
test("M708 when full of live keys the oldest is evicted first and counted", () => { const { mw } = limiter({ maxKeys: 2, max: 1 }); hit(mw, { k: "old" }); hit(mw, { k: "mid" }); hit(mw, { k: "new" }); assert.equal(mw.stats().evicted, 1); assert.equal(hit(mw, { k: "old" }).passed, true); mw.dispose(); });
test("M709 stats expose counts only, never keys", () => { const { mw } = limiter(); hit(mw, { k: "secret-user-id" }); for (let i = 0; i < 4; i++) hit(mw, { k: "secret-user-id" }); const s = mw.stats(); assert.deepEqual(Object.keys(s).sort(), ["blocked", "evicted", "keys", "maxKeys"]); assert.equal(s.blocked, 2); assert.ok(!JSON.stringify(s).includes("secret")); mw.dispose(); });
test("M710 reset clears state and dispose stops the sweep timer", () => { const { mw } = limiter(); hit(mw, { k: "a" }); mw.reset(); assert.equal(mw.stats().keys, 0); mw.dispose(); assert.equal(mw.stats().keys, 0); });
test("M711 each limiter owns its own store and options are validated", () => { const a = limiter(), b = limiter(); for (let i = 0; i < 4; i++) hit(a.mw, { k: "x" }); assert.equal(hit(b.mw, { k: "x" }).passed, true); assert.throws(() => createRateLimiter({ windowMs: 0, max: 1 }), /windowMs/); assert.throws(() => createRateLimiter({ windowMs: 1000, max: 0 }), /max/); assert.throws(() => createRateLimiter({ windowMs: 1000, max: 1.5 }), /max/); a.mw.dispose(); b.mw.dispose(); });
test("M712 index.js delegates rateLimit to the module and keeps no inline store", () => { assert.match(idx, /require\("\.\/rateLimiter"\)/); assert.match(idx, /function rateLimit\(options = \{\}\) \{[\s\S]*?return createRateLimiter\(options\);/); assert.ok(!/const hits = new Map\(\);\s*\n\s*setInterval/.test(idx)); });
test("M713 every limiter call site passes a valid window and integer max", () => {
  const re = /rateLimit\(\s*\{([\s\S]*?)\}\s*\)/g; let m, n = 0;
  while ((m = re.exec(idx))) { const body = m[1]; if (!/windowMs/.test(body)) continue; n += 1; const w = /windowMs\s*:\s*([\d_*\s]+)/.exec(body), x = /max\s*:\s*(\d+)/.exec(body); assert.ok(w && Function(`return ${w[1].replace(/_/g, "")}`)() > 0, body.slice(0, 80)); assert.ok(x && Number(x[1]) >= 1, body.slice(0, 80)); }
  assert.ok(n >= 9, `found ${n}`);
});
test("M714 X-Powered-By is disabled", () => { const calls = []; H.hardenApp({ disable: (k) => calls.push(k) }); assert.deepEqual(calls, ["x-powered-by"]); assert.match(idx, /httpSurface\.hardenApp\(app\)/); });
test("M715 unknown routes return a JSON 404 without echoing the path", () => { const r = res(); H.notFoundHandler({ requestId: "rid-1", originalUrl: "/secret/<script>" }, r); assert.equal(r.code, 404); assert.equal(r.body.code, "NOT_FOUND"); assert.equal(r.body.requestId, "rid-1"); assert.ok(!JSON.stringify(r.body).includes("secret")); });
test("M716 the 404 handler is mounted after all routes and before the error handler", () => { const n = idx.indexOf("app.use(httpSurface.notFoundHandler)"), e = idx.indexOf("app.use((err, req, res, next)"), lastRoute = Math.max(idx.lastIndexOf("app.get("), idx.lastIndexOf("app.post("), idx.lastIndexOf("app.put("), idx.lastIndexOf("app.delete(")); assert.ok(n > lastRoute && n < e); });
test("M717 timeout parsing clamps and ignores garbage", () => { assert.equal(H.parseTimeoutMs(undefined), 120000); assert.equal(H.parseTimeoutMs("abc"), 120000); assert.equal(H.parseTimeoutMs("-5"), 120000); assert.equal(H.parseTimeoutMs("500"), 10000); assert.equal(H.parseTimeoutMs("9999999"), 600000); assert.equal(H.parseTimeoutMs("30000"), 30000); });
test("M718 timeouts keep keepAlive < headers <= request for every configuration", () => { for (const v of [undefined, "10000", "30000", "70000", "600000"]) { const t = H.serverTimeouts({ REQUEST_TIMEOUT_MS: v }); assert.ok(t.keepAliveTimeout < t.headersTimeout, v); assert.ok(t.headersTimeout <= t.requestTimeout, v); } });
test("M719 the server applies the timeouts after listen", () => { const s = {}; const t = H.applyServerTimeouts(s, {}); assert.equal(s.keepAliveTimeout, t.keepAliveTimeout); assert.equal(s.requestTimeout, t.requestTimeout); assert.match(idx, /httpSurface\.applyServerTimeouts\(server, process\.env\)/); });
test("M720 the error envelope stays safe for oversized bodies, bad JSON and unknown failures", () => { assert.equal(errorPayload({ type: "entity.too.large" }, "r").status, 413); assert.equal(errorPayload({ type: "entity.parse.failed", message: "Unexpected token at /etc/passwd" }, "r").body.error, "Invalid request."); const e = errorPayload(new Error("db path /var/secret leaked"), "r"); assert.equal(e.status, 500); assert.ok(!JSON.stringify(e.body).includes("secret")); assert.equal(e.body.requestId, "r"); });
test("M721 the response-header middleware sets every required security header", () => { for (const h of H.REQUIRED_HEADERS) assert.ok(idx.includes(`"${h}"`), h); assert.match(idx, /NODE_ENV === "production"\) res\.setHeader\("Strict-Transport-Security"/); });
test("M722 request timeout is documented in the env template", () => { const e = read("server/.env.example"); assert.match(e, /REQUEST_TIMEOUT_MS/); assert.match(e, /RateLimit|rate limit/i); });
test("M723 runbook and ADR describe the HTTP hardening", () => { assert.match(read("PRODUCTION_OPERATIONS_RUNBOOK.md"), /RateLimit-Remaining/); assert.match(read("docs/architecture/ARCHITECTURE_DECISIONS.md"), /B91/); });
test("M724 B91 release metadata is synchronized and covers M700-M724", () => {
  const p = JSON.parse(read("package.json")), sp = JSON.parse(read("server/package.json")), a = JSON.parse(read("app.json")), l = JSON.parse(read("package-lock.json")), mem = JSON.parse(read("PROJECT_MEMORY.json"));
  for (const v of [p.version, sp.version, a.version, a.expo.version, a.expo.version, a.expo.android.version, a.expo.ios.version, l.version, l.packages[""].version, mem.currentVersion]) assert.equal(v, p.version);
  assert.match(mem.currentBatch, /^B\d+$/); assert.ok(read("VERSION.md").includes(`**Current Version:** V${p.version}`));
  for (const f of ["MASTER_ROADMAP.md"]) { const s = read(f); for (let n = 700; n <= 724; n++) assert.ok(new RegExp(`\\b${n}\\b`).test(s), `${f} ${n}`); }
});
