"use strict";
// M7691-M7715 (operational readiness, retention and verification). Local source and fixture tests only:
// no provider, network, Sentry service, device or production database is used. The Sentry SDK is replaced by a recording stub.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const Module = require("node:module");

const serverDir = __dirname;
const root = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

// ---------- Sentry stub ----------
function makeFake() {
  const calls = { init: null, messages: [], exceptions: [], extras: [], tags: [], isolationTags: [] };
  const scope = { setExtra: (k, v) => calls.extras.push([k, v]), setTag: (k, v) => calls.tags.push([k, v]) };
  return {
    calls,
    init: (options) => { calls.init = options; },
    withScope: (fn) => fn(scope),
    captureException: (error) => { calls.exceptions.push(error); return "evt"; },
    captureMessage: (message, level) => { calls.messages.push([message, level]); return "evt"; },
    getIsolationScope: () => ({ setTag: (k, v) => calls.isolationTags.push([k, v]) }),
    getCurrentScope: () => scope,
    setUser() {}, setupExpressErrorHandler() {},
  };
}

function loadTelemetry({ env = {}, fake = null } = {}) {
  const keys = ["SENTRY_DSN", "SENTRY_TRACES_SAMPLE_RATE", "SENTRY_ENVIRONMENT"];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  for (const k of keys) delete process.env[k];
  Object.assign(process.env, env);
  const originalLoad = Module._load;
  Module._load = function (request, ...rest) {
    if (request === "@sentry/node") {
      if (fake) return fake;
      const error = new Error("Cannot find module '@sentry/node'"); error.code = "MODULE_NOT_FOUND"; throw error;
    }
    return originalLoad.call(this, request, ...rest);
  };
  const warn = console.warn; const warnings = []; console.warn = (...a) => warnings.push(a.join(" "));
  for (const m of ["./sentry", "./observability"]) delete require.cache[require.resolve(path.join(serverDir, m))];
  try {
    return { sentry: require("./sentry"), observability: require("./observability"), warnings };
  } finally {
    Module._load = originalLoad; console.warn = warn;
    for (const k of keys) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  }
}

test("M7692 telemetry rate parsing fails closed and never becomes NaN", () => {
  const { sentry } = loadTelemetry();
  assert.equal(sentry.parseSampleRate(undefined), 0.1);
  assert.equal(sentry.parseSampleRate(""), 0.1);
  assert.equal(sentry.parseSampleRate("0.25"), 0.25);
  assert.equal(sentry.parseSampleRate(" 1 "), 1);
  assert.equal(sentry.parseSampleRate("0"), 0);
  for (const bad of ["abc", "NaN", "Infinity", "-1", "2", "1e2", "0x1", "0.5.5", "1,5", "null"]) assert.equal(sentry.parseSampleRate(bad), 0, bad);
});

test("M7692/M7693 the init options carry the parsed rate and the scrubbers; bad or missing config stays disabled", () => {
  const good = makeFake();
  const a = loadTelemetry({ env: { SENTRY_DSN: "https://key@o1.example.invalid/1", SENTRY_TRACES_SAMPLE_RATE: "abc" }, fake: good });
  assert.equal(a.sentry.enabled, true);
  assert.equal(good.calls.init.tracesSampleRate, 0);
  assert.equal(good.calls.init.sendDefaultPii, false);
  assert.equal(typeof good.calls.init.beforeSend, "function");
  assert.equal(typeof good.calls.init.beforeBreadcrumb, "function");
  assert.ok(a.warnings.some((w) => /tracing disabled/.test(w)));
  assert.ok(!a.warnings.join(" ").includes("key@"), "the DSN is never printed");

  const none = loadTelemetry({ fake: makeFake() });
  assert.equal(none.sentry.enabled, false);
  assert.equal(none.sentry.captureMessage("x"), null);
  assert.equal(none.sentry.captureException(new Error("x")), null);

  const badDsn = makeFake();
  const b = loadTelemetry({ env: { SENTRY_DSN: "not a url" }, fake: badDsn });
  assert.equal(b.sentry.enabled, false);
  assert.equal(badDsn.calls.init, null, "a malformed DSN never reaches Sentry.init");
  assert.ok(b.warnings.some((w) => /not a valid/.test(w)) && !b.warnings.join(" ").includes("not a url"));

  const ftp = loadTelemetry({ env: { SENTRY_DSN: "ftp://host/1" }, fake: makeFake() });
  assert.equal(ftp.sentry.enabled, false);

  const missingSdk = loadTelemetry({ env: { SENTRY_DSN: "https://key@o1.example.invalid/1" }, fake: null });
  assert.equal(missingSdk.sentry.enabled, false, "a configured DSN with no SDK is reported as disabled, not enabled");
  assert.equal(missingSdk.sentry.captureMessage("x"), null);
});

test("M7694 raw exception text, stack and context never reach the monitoring service", () => {
  const fake = makeFake();
  const { observability } = loadTelemetry({ env: { SENTRY_DSN: "https://key@o1.example.invalid/1" }, fake });
  const error = new Error("insert failed for user@example.com token sk-abcdefabcdefabcdef card 4111111111111111");
  error.name = "SqliteError";
  observability.reportException(error, { domain: "process", action: "unhandled_rejection", severity: "error", metadata: { email: "user@example.com", note: "Bearer abc.def.ghi", authorization: "x" } });
  assert.equal(fake.calls.exceptions.length, 1);
  assert.equal(fake.calls.exceptions[0].message, "Operational exception details redacted");
  assert.equal(fake.calls.exceptions[0].name, "SqliteError");
  const sent = JSON.stringify(fake.calls.extras) + fake.calls.exceptions[0].stack;
  for (const secret of ["user@example.com", "sk-abcdef", "4111", "abc.def.ghi", "insert failed"]) assert.ok(!sent.includes(secret), `${secret} must not be sent`);
  // a non-Error rejection reason is handled the same way
  observability.reportException("raw string reason with token sk-abcdefabcdefabcdef", { domain: "process", action: "unhandled_rejection" });
  assert.equal(fake.calls.exceptions[1].message, "Operational exception details redacted");
  assert.ok(!JSON.stringify(fake.calls.extras).includes("sk-abcdef"));
});

test("M7695 every telemetry entrypoint in the server goes through the sanitising layer", () => {
  const files = fs.readdirSync(serverDir).filter((f) => f.endsWith(".js") && !/\.test\.js$/.test(f));
  const direct = [];
  for (const f of files) {
    if (f === "sentry.js" || f === "observability.js") continue;
    const text = fs.readFileSync(path.join(serverDir, f), "utf8");
    if (/\bsentry\.captureException\(|\bSentry\.capture|require\(["']@sentry\/node["']\)/.test(text)) direct.push(f);
  }
  assert.deepEqual(direct, [], "raw captureException / SDK use outside sentry.js and observability.js");
  const index = read("server/index.js");
  assert.match(index, /operationalTelemetry\.reportException\(reason/);
  assert.doesNotMatch(index, /sentry\.captureException\(/);
  // the one remaining direct message path (AI telemetry) is bounded by safeAiEvent and by captureMessage itself
  assert.match(index, /createAiTelemetry\(\{ captureMessage \}\)/);
});

test("M7696 request correlation: the id is bound to the request, not shared, and survives async boundaries", async () => {
  const fake = makeFake();
  const { sentry } = loadTelemetry({ env: { SENTRY_DSN: "https://key@o1.example.invalid/1" }, fake });
  sentry.setRequestContext("req-123");
  sentry.setRequestContext("x".repeat(500));
  assert.deepEqual(fake.calls.isolationTags[0], ["request_id", "req-123"]);
  assert.equal(fake.calls.isolationTags[1][1].length, 100);
  assert.deepEqual(fake.calls.tags, [], "the shared current scope is not used when an isolation scope exists");

  const events = require("./eventCorrelation");
  const seen = await Promise.all(["a", "b", "c"].map((id) => new Promise((resolve) => events.runWithRequestId(id, () => {
    setTimeout(async () => { await null; await new Promise((r) => setImmediate(r)); resolve(events.currentRequestId()); }, id === "a" ? 15 : 1);
  }))));
  assert.deepEqual(seen, ["a", "b", "c"]);
  assert.equal(events.currentRequestId(), null);
});

test("M7697 operational event volume and metadata size are bounded and never throw", () => {
  const events = require("./eventCorrelation");
  const loop = { name: "loop" }; loop.self = loop;
  const meta = events.normalizeMetadata({ amount: 500, authorization: "x", note: "ok", nested: { deep: { deeper: { deepest: 1 } }, apiKey: "k", id: 7n }, list: [1, 2n, () => 1], loop });
  assert.equal(meta.amount, 500); assert.equal(meta.note, "ok");
  assert.equal(meta.authorization, undefined); assert.equal(meta.nested.apiKey, undefined);
  assert.equal(meta.nested.id, "7"); assert.deepEqual(meta.list, [1, "2", null]);
  assert.ok(JSON.stringify(meta).length < 4096);
  assert.doesNotThrow(() => events.normalizeMetadata({ big: 10n ** 30n, date: new Date(NaN), fn() {} }));
  const wide = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, "v".repeat(400)]));
  assert.deepEqual(events.normalizeMetadata(wide), { truncated: true });
  assert.deepEqual(events.normalizeMetadata("text"), {});
  assert.deepEqual(events.normalizeMetadata([1]), {});
  const e = events.createEvent({ requestId: "r".repeat(400), action: "a.b" });
  assert.equal(e.requestId.length, 100);
  assert.throws(() => events.createEvent({ action: "x".repeat(200) }));

  const fake = makeFake();
  const { sentry } = loadTelemetry({ env: { SENTRY_DSN: "https://key@o1.example.invalid/1" }, fake });
  sentry.captureMessage("line one\nline two " + "m".repeat(1000), "info");
  assert.ok(fake.calls.messages[0][0].length <= 300 && !/\n/.test(fake.calls.messages[0][0]));
});

test("M7698 events and breadcrumbs lose query strings, fragments, bodies, cookies and credential headers", () => {
  const { sentry } = loadTelemetry();
  const crumb = sentry.scrubBreadcrumb({ category: "fetch", data: { url: "https://api.example.invalid/orders?token=abc&email=a@b.c#frag", body: "{\"card\":1}", query: "q", response_body: "x", status: 200 } });
  assert.equal(crumb.data.url, "https://api.example.invalid/orders");
  assert.deepEqual(Object.keys(crumb.data).sort(), ["status", "url"]);
  const event = sentry.scrubEvent({
    request: { url: "https://api.example.invalid/pay?code=1", query_string: "code=1", cookies: { s: "1" }, data: { card: "4111" }, headers: { Authorization: "Bearer x", cookie: "s=1", "X-Api-Key": "k", "user-agent": "ua" } },
    user: { id: 42, email: "a@b.c", ip_address: "1.2.3.4", username: "n" },
    breadcrumbs: [{ data: { url: "/a?b=1" } }, null],
  });
  assert.equal(event.request.url, "https://api.example.invalid/pay");
  assert.equal(event.request.query_string, undefined); assert.equal(event.request.cookies, undefined); assert.equal(event.request.data, undefined);
  assert.deepEqual(event.request.headers, { "user-agent": "ua" });
  assert.deepEqual(event.user, { id: "42" });
  assert.equal(event.breadcrumbs.length, 1); assert.equal(event.breadcrumbs[0].data.url, "/a");
  assert.equal(sentry.scrubEvent(null), null);
  assert.equal(sentry.scrubEvent({ user: { email: "a@b.c" } }).user, undefined);
  assert.equal(sentry.scrubBreadcrumb(undefined), undefined);
  assert.doesNotThrow(() => sentry.scrubEvent({ request: { headers: null }, breadcrumbs: "no" }));
});

test("M7698 the phone app applies the same scrubbing", async () => {
  const sentryTs = read("src/sentry.ts");
  assert.match(sentryTs, /import \{ scrubBreadcrumb, scrubEvent \} from '\.\/telemetryScrub'/);
  assert.match(sentryTs, /beforeSend: \(event: any\) => scrubEvent\(event\)/);
  assert.match(sentryTs, /beforeBreadcrumb: \(crumb: any\) => scrubBreadcrumb\(crumb\)/);
  assert.match(sentryTs, /sendDefaultPii: false/);
  assert.doesNotMatch(read("src/telemetryScrub.ts"), /^import /m, "the helper has no imports so it can run anywhere");
  let m = null;
  try { m = await import(path.join(root, "src", "telemetryScrub.ts")); } catch (_) { /* Node without TypeScript type stripping */ }
  if (!m) return; // source guards above still ran; behaviour is covered by the server twin
  assert.equal(m.stripQuery("https://a.b/c?x=1#f"), "https://a.b/c");
  const crumb = m.scrubBreadcrumb({ data: { url: "https://a.b/c?x=1", body: "secret" } });
  assert.deepEqual(crumb.data, { url: "https://a.b/c" });
  const ev = m.scrubEvent({ request: { url: "https://a.b/c?x=1", cookies: { a: 1 }, headers: { Authorization: "t", Accept: "a" } }, user: { id: 5, email: "e" } });
  assert.deepEqual(ev.request.headers, { Accept: "a" }); assert.equal(ev.request.url, "https://a.b/c"); assert.deepEqual(ev.user, { id: "5" });
});

// ---------- backups, freshness, restore ----------
const R = require("./recoveryOps");
function makeBackup(dir, createdAt, { manifestPatch = {}, content } = {}) {
  const file = path.join(dir, R.backupNameFor(createdAt));
  fs.writeFileSync(file, content ?? `sqlite-fixture-${createdAt.toISOString()}`);
  const manifest = { file: path.basename(file), bytes: fs.statSync(file).size, sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"), createdAt: createdAt.toISOString(), appVersion: "1.2.3", tables: { users: 1 }, ...manifestPatch };
  fs.writeFileSync(R.manifestPathFor(file), JSON.stringify(manifest));
  return { file, manifest };
}
const tmpDir = (name) => fs.mkdtempSync(path.join(os.tmpdir(), `nexa-${name}-`));
const HOUR = 3600000;

test("M7703 backup metadata that is invalid, future-dated or non-numeric can never pass freshness", () => {
  const dir = tmpDir("fresh"); const now = new Date("2026-10-25T12:00:00Z");
  try {
    makeBackup(dir, new Date(now - 100 * HOUR));
    assert.equal(Math.round(R.backupAgeHours(dir, now)), 100);
    // a manifest that claims to be from next month is ignored; the honest 100-hour-old one decides
    makeBackup(dir, new Date(now.getTime() + 30 * 24 * HOUR));
    assert.equal(Math.round(R.backupAgeHours(dir, now)), 100, "future-dated backup is not counted");
    assert.equal(R.evaluateBackupFreshness(R.backupAgeHours(dir, now), 26).status, "fail");
    // only-future backup means no verified backup at all
    const only = tmpDir("future"); makeBackup(only, new Date(now.getTime() + 2 * HOUR));
    assert.equal(R.backupAgeHours(only, now), null);
    assert.equal(R.evaluateBackupFreshness(null).status, "fail");
    // a small clock skew (under five minutes) is tolerated
    const skew = tmpDir("skew"); makeBackup(skew, new Date(now.getTime() + 2 * 60 * 1000));
    assert.equal(R.backupAgeHours(skew, now), 0);
    // invalid manifests never count
    const bad = tmpDir("bad"); const b = makeBackup(bad, new Date(now - HOUR), { manifestPatch: { sha256: "0".repeat(64) } });
    assert.equal(R.backupAgeHours(bad, now), null);
    fs.writeFileSync(R.manifestPathFor(b.file), "{"); assert.equal(R.backupAgeHours(bad, now), null);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("M7700 freshness status is deterministic at every boundary and for odd numbers", () => {
  const f = R.evaluateBackupFreshness;
  assert.equal(f(0, 26).status, "pass"); assert.equal(f(26, 26).status, "pass");
  assert.equal(f(26.01, 26).status, "warn"); assert.equal(f(52, 26).status, "warn");
  assert.equal(f(52.01, 26).status, "fail");
  for (const age of [NaN, Infinity, -1, "5", {}, true]) assert.equal(f(age, 26).status, "fail", String(age));
  for (const max of [NaN, Infinity, 0, -5, "26", null]) assert.equal(f(5, max).status, "fail", String(max));
  assert.equal(f(5).status, "pass", "the default limit applies when none is given");
  assert.match(f(5, Infinity).detail, /limit is not a valid number/);
});

test("M7703 a malformed BACKUP_MAX_AGE_HOURS can never switch freshness off", () => {
  let DatabaseSync; try { ({ DatabaseSync } = require("node:sqlite")); } catch (_) { return; }
  const dir = tmpDir("status"); const now = new Date("2026-10-25T12:00:00Z");
  const db = new DatabaseSync(":memory:");
  try {
    makeBackup(dir, new Date(now - 100 * HOUR));
    const status = (value) => R.recoveryStatus({ db, env: { BACKUP_DIR: dir, ...(value === undefined ? {} : { BACKUP_MAX_AGE_HOURS: value }) }, now, packageVersion: "1.2.3" });
    for (const bad of ["Infinity", "1e999", "abc", "-5", "0", "", "99999"]) {
      const s = status(bad);
      assert.equal(s.backups.freshness.status, "fail", `limit ${JSON.stringify(bad)} must not make a 100-hour-old backup pass`);
      assert.equal(s.recovery.failClosed, false);
    }
    assert.equal(status("200").backups.freshness.status, "pass", "a sane explicit limit still works");
    assert.equal(status(undefined).backups.freshness.status, "fail");
    assert.equal(status("48").backups.freshness.status, "fail");
  } finally { db.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test("M7704 restore cleans up after a failure at any point and never removes a file it does not own", () => {
  const dir = tmpDir("restore"); const now = new Date("2026-10-25T12:00:00Z");
  const realCopy = fs.copyFileSync;
  try {
    const { file } = makeBackup(dir, now);
    const target = path.join(dir, "restored.db");
    // 1. the copy dies half way (disk full): the half-written target is removed
    fs.copyFileSync = (src, dest) => { fs.writeFileSync(dest, "partial"); throw Object.assign(new Error("ENOSPC"), { code: "ENOSPC" }); };
    assert.throws(() => R.restoreToNewPath(file, target), /ENOSPC/);
    assert.equal(fs.existsSync(target), false);
    // 2. the copy finishes but is corrupted: removed
    fs.copyFileSync = (src, dest) => { fs.writeFileSync(dest, "corrupt"); };
    assert.throws(() => R.restoreToNewPath(file, target), /integrity verification/);
    assert.equal(fs.existsSync(target), false);
    fs.copyFileSync = realCopy;
    // 3. a target that already exists belongs to someone else: refused and left exactly as it was
    fs.writeFileSync(target, "someone else's file");
    assert.throws(() => R.restoreToNewPath(file, target), /already exists/);
    assert.equal(fs.readFileSync(target, "utf8"), "someone else's file");
    // 4. the normal case still works and a manifest problem is refused before anything is written
    const ok = path.join(dir, "ok.db");
    assert.equal(R.restoreToNewPath(file, ok).bytes, fs.statSync(file).size);
    fs.writeFileSync(R.manifestPathFor(file), "{");
    assert.throws(() => R.restoreToNewPath(file, path.join(dir, "never.db")), /Refusing to restore/);
    assert.equal(fs.existsSync(path.join(dir, "never.db")), false);
  } finally { fs.copyFileSync = realCopy; fs.rmSync(dir, { recursive: true, force: true }); }
});

test("M7704 the restore drill leaves nothing behind at every failing step, and passes on a real database", () => {
  const dir = tmpDir("drill"); const scratch = path.join(dir, "scratch"); const now = new Date("2026-10-25T12:00:00Z");
  const realCopy = fs.copyFileSync;
  const left = () => fs.readdirSync(scratch);
  try {
    // manifest missing, checksum wrong, copy fails, copy corrupt: each ends not-ok with an empty scratch folder
    const a = makeBackup(dir, new Date(now - 1 * HOUR)); fs.rmSync(R.manifestPathFor(a.file));
    assert.equal(R.restoreDrill(a.file, scratch).ok, false); assert.deepEqual(left(), []);
    const b = makeBackup(dir, new Date(now - 2 * HOUR), { manifestPatch: { sha256: "1".repeat(64) } });
    assert.equal(R.restoreDrill(b.file, scratch).ok, false); assert.deepEqual(left(), []);
    const c = makeBackup(dir, new Date(now - 3 * HOUR));
    fs.copyFileSync = (s, d) => { fs.writeFileSync(d, "partial"); throw new Error("disk full"); };
    const r = R.restoreDrill(c.file, scratch);
    assert.equal(r.ok, false); assert.deepEqual(left(), []);
    assert.ok(!JSON.stringify(r).includes("disk full"), "the raw error text is not reported");
    fs.copyFileSync = (s, d) => { fs.writeFileSync(d, "corrupt"); };
    assert.equal(R.restoreDrill(c.file, scratch).ok, false); assert.deepEqual(left(), []);
    fs.copyFileSync = realCopy;
    assert.equal(R.restoreDrill("", scratch).ok, false);
    // a real backup passes, and still leaves nothing
    let DatabaseSync; try { ({ DatabaseSync } = require("node:sqlite")); } catch (_) { return; }
    const db = new DatabaseSync(":memory:"); db.exec("CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT); INSERT INTO users(name) VALUES('a'),('b');");
    try {
      const made = R.createVerifiedBackup(db, path.join(dir, "real"), { packageVersion: "1.2.3", now });
      const drill = R.restoreDrill(path.join(dir, "real", made.file), scratch);
      assert.equal(drill.ok, true, JSON.stringify(drill)); assert.deepEqual(left(), []);
    } finally { db.close(); }
  } finally { fs.copyFileSync = realCopy; fs.rmSync(dir, { recursive: true, force: true }); }
});

test("M7705 production restore stays a separate operational step: no server route or script restores over the live database", () => {
  const index = read("server/index.js");
  assert.doesNotMatch(index, /restoreToNewPath|restoreDrill/, "no HTTP route triggers a restore");
  assert.match(read("scripts/recovery-drill.mjs"), /restoreDrill\(backup, scratch\)/);
  assert.doesNotMatch(read("scripts/recovery-drill.mjs"), /DB_PATH/, "the drill never reads the live database path");
  const ops = read("server/recoveryOps.js");
  assert.match(ops, /restores into a NEW path; refuses overwrite; never touches the live database/);
});

// ---------- health and diagnostics ----------
test("M7699 health and readiness answers carry no environment values, paths or user data", () => {
  const operational = require("./operationalReadiness");
  const db = { prepare: () => ({ get: () => ({ name: "t" }) }) };
  const env = { DB_PATH: "/srv/secret/nexa.db", STRIPE_SECRET_KEY: "sk_live_abcdefabcdefabcdef", JWT_SECRET: "jwt-shh", SENTRY_DSN: "https://key@o1.example.invalid/1" };
  const text = JSON.stringify(operational.inspectRuntime({ db, env, packageVersion: "1.2.3" }));
  for (const secret of ["/srv/secret", "sk_live", "jwt-shh", "key@o1"]) assert.ok(!text.includes(secret), secret);
  const missing = JSON.stringify(operational.inspectRuntime({ db, env: {}, packageVersion: "1.2.3" }));
  assert.ok(!/\/srv|sk_live/.test(missing));
  const index = read("server/index.js");
  const ready = index.slice(index.indexOf('app.get("/health/ready"'), index.indexOf('app.get("/health/operational"'));
  assert.ok(ready.length > 100 && !/process\.env/.test(ready) && !/req\.(query|body|headers|user)/.test(ready));
  const live = index.slice(index.indexOf('app.get("/health/live"'), index.indexOf('app.get("/privacy"'));
  assert.ok(!/process\.env|req\.(query|body|headers)/.test(live));
  const operationalRoute = index.slice(index.indexOf('app.get("/health/operational"'), index.indexOf("administrator-only, read-only payment attention"));
  assert.match(operationalRoute, /healthNoSecrets\(body\)/); assert.match(operationalRoute, /healthResponseSize\(body\)/);
  assert.match(operationalRoute, /replace\(\/DB_PATH\[\^ \]\*\/g, "DB_PATH"\)/);
});

test("M7711 every /api/admin route in the main server is behind an administrator check", () => {
  const lines = read("server/index.js").split("\n"); let total = 0; const open = [];
  lines.forEach((line, i) => {
    const m = line.match(/^app\.(get|post|put|patch|delete)\(\s*["'`](\/api\/admin\/[^"'`]*)/);
    if (!m) return; total += 1;
    const block = [line]; for (let j = i + 1; j < lines.length && !/^app\.(get|post|put|patch|delete|use)\(/.test(lines[j]) && j - i < 14; j++) block.push(lines[j]);
    if (!/isConfiguredAdmin\(|adminAccess\.require\(/.test(block.join("\n"))) open.push(`${i + 1} ${m[1]} ${m[2]}`);
  });
  assert.ok(total >= 20, `scanned ${total} admin routes`);
  assert.deepEqual(open, []);
  const index = read("server/index.js");
  for (const route of ["/api/admin/operations/diagnostics", "/api/admin/recovery-status", "/api/admin/launch-readiness"]) {
    const at = index.indexOf(`"${route}"`); assert.ok(at > 0, route);
    assert.match(index.slice(at, at + 260), /auth\.authMiddleware/); assert.match(index.slice(at, at + 330), /isConfiguredAdmin\(req\.user\)/);
  }
});

test("M7709/M7710 preflight reports unavailable checks as failed and keeps device acceptance out of source results", () => {
  const preflight = read("scripts/dependency-preflight.mjs");
  assert.match(preflight, /all declared root and server dependencies have installed package manifests/);
  assert.match(preflight, /reproducible/);
  assert.match(preflight, /if \(!result\.reproducible\) process\.exitCode = 2/);
  const roadmap = read("MASTER_ROADMAP.md");
  assert.match(roadmap, /Environment\/device checks excluded|device/i);
  assert.match(read("AGENTS.md"), /NOT TESTED/);
});

test("M7701/M7702 supported and unsupported manifest formats are explicit", () => {
  const dir = tmpDir("formats"); const now = new Date("2026-10-25T12:00:00Z");
  try {
    // Supported: the four required fields; tables and appVersion are optional, so older manifests without them still verify; unknown extra fields are ignored.
    const bare = makeBackup(dir, new Date(now - 5 * HOUR));
    const required = { file: bare.manifest.file, bytes: bare.manifest.bytes, sha256: bare.manifest.sha256, createdAt: bare.manifest.createdAt };
    fs.writeFileSync(R.manifestPathFor(bare.file), JSON.stringify(required));
    assert.equal(R.verifyManifest(bare.file).ok, true);
    fs.writeFileSync(R.manifestPathFor(bare.file), JSON.stringify({ ...required, note: "extra", tables: null, appVersion: null }));
    assert.equal(R.verifyManifest(bare.file).ok, true);
    // Unsupported, each with its own reason: no checksum, text size, numeric (epoch) time, a path instead of a base name, a renamed backup, unreadable JSON.
    const cases = [
      [{ sha256: undefined }, "manifest checksum invalid"], [{ bytes: String(required.bytes) }, "manifest size invalid"],
      [{ createdAt: Date.now() }, "manifest timestamp invalid"], [{ createdAt: "yesterday" }, "manifest timestamp invalid"],
      [{ file: `../${required.file}` }, "manifest filename invalid"], [{ file: "backup.db" }, "manifest filename invalid"],
      [{ sha256: required.sha256.toUpperCase() }, "manifest checksum invalid"], [{ tables: { users: -1 } }, "manifest table counts invalid"],
    ];
    for (const [patch, reason] of cases) {
      fs.writeFileSync(R.manifestPathFor(bare.file), JSON.stringify({ ...required, ...patch }));
      const r = R.verifyManifest(bare.file);
      assert.equal(r.ok, false, JSON.stringify(patch));
      assert.equal(r.reason, reason, JSON.stringify(patch));
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("M7707 nothing in the backup or readiness code claims encryption at rest", () => {
  for (const f of ["server/recoveryOps.js", "server/operationalReadiness.js", "scripts/backup-db.mjs", "scripts/recovery-drill.mjs"]) {
    assert.doesNotMatch(read(f), /encrypt|AES|cipher/i, `${f} must not imply encryption it does not perform`);
  }
});
