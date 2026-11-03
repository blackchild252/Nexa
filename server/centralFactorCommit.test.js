"use strict";
// Real SQLite through Node's built-in module (better-sqlite3-shaped wrapper), so this runs without native modules.
const test = require("node:test");
const assert = require("node:assert/strict");
let DatabaseSync = null;
try { ({ DatabaseSync } = require("node:sqlite")); } catch (_) { /* older Node: skipped */ }
const { ENDPOINT_PATH, createCentralFactorCommit, registerCentralFactorCommit, configuredKeys } = require("./centralFactorCommit");
const { signEnvelope } = require("./centralActivationCodeDelivery");
const { ensureSchema: ensureGrantSchema } = require("./adminAamiAccess");

const SECRET = "central-main-commit-secret-2026";
const KEY_ID = "central-commit-1";
const NOW = Date.UTC(2026, 9, 14, 12, 0, 0);
const opts = { skip: !DatabaseSync };

function makeDb() {
  const raw = new DatabaseSync(":memory:");
  return { exec: (sql) => raw.exec(sql), prepare: (sql) => raw.prepare(sql), transaction: (fn) => (...a) => { raw.exec("BEGIN"); try { const r = fn(...a); raw.exec("COMMIT"); return r; } catch (e) { raw.exec("ROLLBACK"); throw e; } } };
}
function setup({ keys = { [KEY_ID]: SECRET } } = {}) {
  let t = NOW; const db = makeDb();
  db.exec("CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, username TEXT, accountStatus TEXT)");
  ensureGrantSchema(db);
  const addUser = (id, status = "active") => db.prepare("INSERT INTO users VALUES (?,?,?,?)").run(id, `${id}@example.test`, id, status);
  const grant = (userId, appId, { status = "active", confirmed = 1, company = "nexa" } = {}) => db.prepare("INSERT INTO admin_aami_privileged_access (applicationId,targetUserId,companyId,productId,role,status,activationConfirmed,seq,lastEventId,reason,updatedAt) VALUES (?,?,?,'admin-aami','administrative_director',?,?,2,'e1','reason',?)").run(appId, userId, company, status, confirmed, new Date(t).toISOString());
  addUser("user-1"); addUser("user-2"); addUser("user-3", "suspended");
  grant("user-1", "app-1"); grant("user-2", "app-2", { status: "pending_activation", confirmed: 0 }); grant("user-3", "app-3");
  const svc = createCentralFactorCommit({ db, env: { NEXA_CENTRAL_ZEEZA_COMMIT_KEYS: JSON.stringify(keys) }, now: () => t });
  const data = (over = {}) => ({ applicationId: "app-1", targetUserId: "user-1", companyId: "nexa", factor: "zeeza_2fa", ...over });
  const call = (d, { sign = SECRET, keyId = KEY_ID, eventId = "FC-event-1", over = {}, tweak } = {}) => {
    const env = { v: 1, type: "factor.commit", eventId, issuer: "aami-central", audience: "nexa-main-zeeza", at: t, correlationId: null, data: d, ...over };
    if (tweak) tweak(env);
    const out = {}; svc.handle({ body: { ...env, keyId, signature: signEnvelope(sign, env) } }, { status(s) { out.status = s; return this; }, json(b) { out.body = b; return this; } });
    return out;
  };
  const rows = () => db.prepare("SELECT applicationId,userId,companyId,factor,eventId FROM central_second_factor_commits").all();
  return { db, svc, call, data, rows, grant, addUser, advance: (ms) => { t += ms; } };
}
const refused = (r, reason) => { assert.equal(r.status, 200); assert.deepEqual(r.body, { committed: false, reason }); };

test("an active, confirmed grant lets Central commit the chosen factor, once, and Main can read it back", opts, () => {
  const { call, data, rows, svc } = setup();
  const r = call(data());
  assert.equal(r.status, 200); assert.deepEqual(r.body, { committed: true, replayed: false, eventId: "FC-event-1" });
  assert.deepEqual(rows().map((x) => ({ ...x })), [{ applicationId: "app-1", userId: "user-1", companyId: "nexa", factor: "zeeza_2fa", eventId: "FC-event-1" }]);
  assert.equal(svc.committedFactor("user-1", "nexa"), "zeeza_2fa");
  assert.equal(svc.committedFactor("user-1", "lordgistics"), null);
  assert.equal(svc.committedFactor("user-2", "nexa"), null);
});

test("email_2fa is accepted too, and an unsupported factor is refused", opts, () => {
  const a = setup(); assert.equal(a.call(a.data({ factor: "email_2fa" })).body.committed, true);
  const b = setup(); refused(b.call(b.data({ factor: "sms" })), "bad_request"); refused(b.call(b.data({ factor: undefined })), "bad_request"); assert.equal(b.rows().length, 0);
});

test("a retry with the same event is a replay; a different factor, user or event for the same application is refused", opts, () => {
  const { call, data, rows } = setup();
  assert.equal(call(data()).body.replayed, false);
  assert.deepEqual(call(data()).body, { committed: true, replayed: true, eventId: "FC-event-1" });
  refused(call(data({ factor: "email_2fa" }), { eventId: "FC-event-2" }), "factor_conflict");
  refused(call(data({ factor: "email_2fa" })), "factor_conflict");   // same event id, changed content
  refused(call(data({ targetUserId: "user-2" }), { eventId: "FC-event-3" }), "target_conflict");
  assert.equal(rows().length, 1); assert.equal(rows()[0].factor, "zeeza_2fa");
});

test("an event id already used for another application is refused", opts, () => {
  const { call, data, rows, db } = setup(); db.prepare("INSERT INTO users VALUES ('user-5','u5@example.test','u5','active')").run();
  assert.equal(call(data()).body.committed, true);
  db.prepare("INSERT INTO admin_aami_privileged_access (applicationId,targetUserId,companyId,productId,role,status,activationConfirmed,seq,lastEventId,reason,updatedAt) VALUES ('app-5','user-5','nexa','admin-aami','administrative_director','active',1,2,'e','reason','2026-10-14T00:00:00Z')").run();
  refused(call(data({ applicationId: "app-5", targetUserId: "user-5" })), "event_conflict"); assert.equal(rows().length, 1);
});

test("no commit without an active, activation-confirmed grant for the same application, user and company", opts, () => {
  const { call, data, rows, grant, addUser } = setup();
  refused(call(data({ applicationId: "app-2", targetUserId: "user-2" })), "activation_not_confirmed");                    // pending, not confirmed
  refused(call(data({ applicationId: "app-9" })), "activation_not_confirmed");                                            // no such application
  refused(call(data({ targetUserId: "user-2" })), "activation_not_confirmed");                                            // application belongs to another user
  refused(call(data({ companyId: "lordgistics" })), "activation_not_confirmed");                                          // wrong company
  refused(call(data({ applicationId: "app-3", targetUserId: "user-3" })), "target_identity_unverified");                  // suspended account
  refused(call(data({ targetUserId: "ghost" })), "target_identity_unverified");
  addUser("user-6"); grant("user-6", "app-6", { status: "revoked", confirmed: 1 }); refused(call(data({ applicationId: "app-6", targetUserId: "user-6" })), "activation_not_confirmed");
  assert.equal(rows().length, 0);
});

test("signature, key, scope, freshness and shape are all checked before anything is read or written", opts, () => {
  const { call, data, rows, advance } = setup();
  refused(call(data(), { sign: "some-other-secret-2026-xx" }), "bad_signature");
  refused(call(data(), { keyId: "unknown-key" }), "bad_signature");
  refused(call(data(), { over: { type: "factor.verify" } }), "wrong_scope");
  refused(call(data(), { over: { audience: "someone-else" } }), "wrong_scope");
  refused(call(data(), { over: { issuer: "evil" } }), "wrong_scope");
  refused(call(data(), { over: { v: 2 } }), "wrong_scope");
  refused(call(data(), { over: { at: NOW - 10 * 60 * 1000 } }), "stale_event");
  refused(call(data(), { over: { eventId: "bad id!" } }), "bad_request");
  refused(call(data({ extra: 1 })), "bad_request");
  refused(call(data({ proof: "123456" })), "bad_request");   // a proof has no place here
  refused(call(data(), { tweak: (e) => { e.extra = 1; } }), "bad_request");
  refused(call(data({ companyId: "acme" })), "bad_request");
  assert.equal(rows().length, 0);
  advance(1); assert.equal(call(data()).body.committed, true);
});

test("with no keys configured every call is refused; bad key sets fail closed", opts, () => {
  const { call, data, rows } = setup({ keys: {} });
  refused(call(data()), "bad_signature"); assert.equal(rows().length, 0);
  assert.deepEqual(Object.keys(configuredKeys({ NEXA_CENTRAL_ZEEZA_COMMIT_KEYS: "not json" })), []);
  assert.deepEqual(Object.keys(configuredKeys({ NEXA_CENTRAL_ZEEZA_COMMIT_KEYS: JSON.stringify({ short: "tiny", "bad key": SECRET, ok1: SECRET }) })), ["ok1"]);
  assert.deepEqual(Object.keys(configuredKeys({ NEXA_CENTRAL_ZEEZA_VERIFY_KEYS: JSON.stringify({ ok1: SECRET }) })), [], "the verify key set is not accepted here");
});

test("a malformed body is refused without throwing, and a database fault answers 500 with nothing from the request", opts, () => {
  const { svc } = setup(); const run = (h, body) => { const out = {}; h.handle({ body }, { status(s) { out.status = s; return this; }, json(b) { out.body = b; return this; } }); return out; };
  for (const b of [undefined, null, [], "x", 5]) refused(run(svc, b), "bad_request");
  const d = makeDb(); d.exec("CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, username TEXT, accountStatus TEXT)");
  const broken = createCentralFactorCommit({ db: d, env: { NEXA_CENTRAL_ZEEZA_COMMIT_KEYS: JSON.stringify({ [KEY_ID]: SECRET }) }, now: () => NOW });
  d.exec("DROP TABLE central_second_factor_commits");   // the lookup now throws
  const env = { v: 1, type: "factor.commit", eventId: "FC-x", issuer: "aami-central", audience: "nexa-main-zeeza", at: NOW, correlationId: null, data: { applicationId: "app-1", targetUserId: "user-1", companyId: "nexa", factor: "zeeza_2fa" } };
  const r = run(broken, { ...env, keyId: KEY_ID, signature: signEnvelope(SECRET, env) });
  assert.equal(r.status, 500); assert.deepEqual(Object.keys(r.body), ["error"]); assert.equal(JSON.stringify(r.body).includes("user-1"), false);
});

test("registration exposes only the one server-to-server POST route and needs a database", opts, () => {
  const routes = []; const app = { post: (path, fn) => routes.push(["POST", path, typeof fn]), get: () => routes.push(["GET"]) };
  registerCentralFactorCommit({ app, db: makeDb(), env: {} });
  assert.deepEqual(routes, [["POST", ENDPOINT_PATH, "function"]]);
  assert.throws(() => registerCentralFactorCommit({ app, env: {} }), TypeError);
});
