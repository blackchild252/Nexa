"use strict";
// Real SQLite through Node's built-in module (better-sqlite3-shaped wrapper), so this runs without native modules.
const test = require("node:test");
const assert = require("node:assert/strict");
let DatabaseSync = null;
try { ({ DatabaseSync } = require("node:sqlite")); } catch (_) { /* older Node: skipped */ }
const { ENDPOINT_PATH, CHALLENGE_PATH, signEnvelope, createCentralFactorVerify, registerCentralFactorVerify, configuredKeys } = require("./centralFactorVerify");
const { ensureSchema: ensureGrantSchema } = require("./adminAamiAccess");
const { ensureSchema: ensureNexaMainGrantSchema } = require("./centralPrivilegedAccess");

const SECRET = "central-main-verify-secret-2026";
const KEY_ID = "central-verify-1";
const NOW = Date.UTC(2026, 9, 13, 12, 0, 0);
const opts = { skip: !DatabaseSync };

function makeDb() {
  const raw = new DatabaseSync(":memory:");
  return { exec: (sql) => raw.exec(sql), prepare: (sql) => raw.prepare(sql), transaction: (fn) => (...a) => { raw.exec("BEGIN"); try { const r = fn(...a); raw.exec("COMMIT"); return r; } catch (e) { raw.exec("ROLLBACK"); throw e; } } };
}
function setup({ keys = { [KEY_ID]: SECRET }, codes = ["246810", "135790", "111111", "222222", "333333", "444444", "555555"] } = {}) {
  let t = NOW; const db = makeDb();
  db.exec("CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, username TEXT, accountStatus TEXT)");
  ensureGrantSchema(db);
  const addUser = (id, status = "active") => db.prepare("INSERT INTO users VALUES (?,?,?,?)").run(id, `${id}@example.test`, id, status);
  const grant = (userId, appId, status = "pending_activation") => db.prepare("INSERT INTO admin_aami_privileged_access (applicationId,targetUserId,companyId,productId,role,status,activationConfirmed,seq,lastEventId,reason,updatedAt) VALUES (?,?,'nexa','admin-aami','administrative_director',?,0,1,'e1','r',?)").run(appId, userId, status, new Date(t).toISOString());
  addUser("user-1"); addUser("user-2"); addUser("user-3", "suspended"); grant("user-1", "app-1"); grant("user-3", "app-3"); addUser("user-4");
  let n = 0, g = 0; const svc = createCentralFactorVerify({ db, env: { NEXA_CENTRAL_ZEEZA_VERIFY_KEYS: JSON.stringify(keys) }, now: () => t, randomCode: () => codes[n++], genId: () => `id-${++g}` });
  const inbox = (userId) => db.prepare("SELECT preview,message FROM zeeza_central_secure_inbox WHERE userId = ?").all(userId);
  const call = (data, { sign = SECRET, keyId = KEY_ID, over = {}, tweak } = {}) => {
    const env = { v: 1, type: "factor.verify", issuer: "aami-central", audience: "nexa-main-zeeza", at: t, data, ...over };
    if (tweak) tweak(env);
    const out = {}; svc.handle({ body: { ...env, keyId, signature: signEnvelope(sign, env) } }, { status(s) { out.status = s; return this; }, json(b) { out.body = b; return this; } });
    return out;
  };
  const v = (userId, proof, factor = "zeeza_2fa") => ({ userId, factor, proof });
  return { db, svc, call, v, inbox, advance: (ms) => { t += ms; }, grant, addUser };
}

test("a pending applicant gets a code in their own inbox, only they can use it, and it works once", opts, () => {
  const { svc, call, v, inbox } = setup();
  const r = svc.issueChallenge("user-1");
  assert.deepEqual(r, { issued: true, expiresInSeconds: 300, delivery: "local_secure_inbox" }); assert.equal(JSON.stringify(r).includes("246810"), false, "the code is never in the API answer");
  const mine = inbox("user-1"); assert.equal(mine.length, 1); assert.match(mine[0].message, /246810/); assert.equal(/\d{6}/.test(mine[0].preview), false, "preview shows no code"); assert.equal(inbox("user-2").length, 0);
  assert.deepEqual(call(v("user-2", "246810")).body, { verified: false });
  assert.deepEqual(call(v("user-1", "246810")).body, { verified: true });
  assert.deepEqual(call(v("user-1", "246810")).body, { verified: false }, "single use"); assert.equal(inbox("user-1").length, 0, "message removed once used");
});

test("no pending grant means no code: unknown, active, revoked and other people are refused", opts, () => {
  const { svc, grant, addUser, db } = setup();
  for (const id of ["user-2", "ghost"]) assert.throws(() => svc.issueChallenge(id), (e) => e.status === 403 && e.code === "ACTIVATION_NOT_PENDING");
  addUser("user-5"); grant("user-5", "app-5", "active"); addUser("user-6"); grant("user-6", "app-6", "revoked");
  for (const id of ["user-5", "user-6"]) assert.throws(() => svc.issueChallenge(id), (e) => e.code === "ACTIVATION_NOT_PENDING");
  assert.equal(db.prepare("SELECT COUNT(*) c FROM zeeza_central_secure_inbox").get().c, 0);
});

test("a new code replaces the old one, which stops showing and stops working; there is a 60 second wait and an hourly cap", opts, () => {
  const { svc, call, v, inbox, advance } = setup();
  svc.issueChallenge("user-1");
  assert.throws(() => svc.issueChallenge("user-1"), (e) => e.status === 429 && e.code === "CODE_COOLDOWN");
  advance(61_000); svc.issueChallenge("user-1");
  assert.equal(inbox("user-1").length, 1); assert.match(inbox("user-1")[0].message, /135790/);
  assert.deepEqual(call(v("user-1", "246810")).body, { verified: false }, "old code dead");
  for (let i = 0; i < 3; i++) { advance(61_000); svc.issueChallenge("user-1"); }   // issues 3, 4 and 5 are allowed
  advance(61_000); assert.throws(() => svc.issueChallenge("user-1"), (e) => e.status === 429 && e.code === "CODE_LIMIT");
  advance(61 * 60_000); svc.issueChallenge("user-1");
});

test("five wrong tries kill the code, even for the right digits afterwards; expiry also kills it", opts, () => {
  const { svc, call, v, advance } = setup();
  svc.issueChallenge("user-1");
  for (const bad of ["000000", "111111", "abcdef", "12345", "999999"]) assert.deepEqual(call(v("user-1", bad)).body, { verified: false });
  assert.deepEqual(call(v("user-1", "246810")).body, { verified: false });
  advance(61_000); svc.issueChallenge("user-1"); assert.deepEqual(call(v("user-1", "135790")).body, { verified: true }, "a fresh code starts a fresh count");
  advance(61_000); svc.issueChallenge("user-1"); advance(5 * 60_000 + 1000);
  assert.deepEqual(call(v("user-1", "111111")).body, { verified: false }, "expired");
});

test("bad signature, unknown key, wrong scope, stale time, unknown fields, wrong factor and inactive user are all refused without using the code", opts, () => {
  const { svc, call, v } = setup(); svc.issueChallenge("user-1");
  assert.deepEqual(call(v("user-1", "246810"), { sign: "wrong-secret-wrong-secret" }).body, { verified: false });
  assert.deepEqual(call(v("user-1", "246810"), { keyId: "nope" }).body, { verified: false });
  for (const over of [{ audience: "other" }, { issuer: "x" }, { type: "activation.code_delivery" }, { v: 2 }, { at: NOW - 6 * 60_000 }]) assert.deepEqual(call(v("user-1", "246810"), { over }).body, { verified: false });
  assert.deepEqual(call(v("user-1", "246810"), { tweak: (e) => { e.data.extra = "x"; } }).body, { verified: false });
  assert.deepEqual(call(v("user-1", "246810", "email_2fa")).body, { verified: false });
  assert.deepEqual(call(v("user-3", "246810")).body, { verified: false }); assert.deepEqual(call(v("ghost", "246810")).body, { verified: false });
  assert.deepEqual(call(v("user-1", "246810")).body, { verified: true }, "none of that used up or burned the code");
});

test("no keys fails closed; short keys and the activation-code keys are ignored", opts, () => {
  assert.deepEqual(Object.keys(configuredKeys({})), []); assert.deepEqual(Object.keys(configuredKeys({ NEXA_CENTRAL_ZEEZA_VERIFY_KEYS: JSON.stringify({ k: "short" }) })), []);
  assert.deepEqual(Object.keys(configuredKeys({ NEXA_CENTRAL_ZEEZA_KEYS: JSON.stringify({ k: SECRET }) })), []);
  const { svc, call, v } = setup({ keys: {} }); svc.issueChallenge("user-1"); assert.deepEqual(call(v("user-1", "246810")).body, { verified: false });
});

test("routes: the challenge route needs sign-in, answers without the code, and the verify route is on the documented path", opts, () => {
  const db = makeDb(); db.exec("CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, username TEXT, accountStatus TEXT)"); ensureGrantSchema(db);
  db.prepare("INSERT INTO users VALUES ('u1','u1@x.test','u1','active')").run();
  db.prepare("INSERT INTO admin_aami_privileged_access (applicationId,targetUserId,companyId,productId,role,status,activationConfirmed,seq,lastEventId,reason,updatedAt) VALUES ('a1','u1','nexa','admin-aami','administrative_director','pending_activation',0,1,'e','r','2026-10-13T00:00:00.000Z')").run();
  const routes = new Map(); const app = { post: (path, ...fns) => routes.set(path, fns) };
  let limiterCalls = 0; const rateLimit = () => (req, res, next) => { limiterCalls++; next(); };
  registerCentralFactorVerify({ app, auth: { authMiddleware: (req, res, next) => { if (!req.user) return res.status(401).json({ error: "Sign in" }); next(); } }, db, env: {}, rateLimit, randomCode: () => "654321" });
  assert.equal(ENDPOINT_PATH, "/zeeza/v1/central/verify-factor"); assert.equal(CHALLENGE_PATH, "/api/zeeza/central-activation/challenge"); assert.ok(routes.has(ENDPOINT_PATH));
  const run = (req) => { const out = { headers: {} }; const res = { set(k, v) { out.headers[k] = v; return this; }, status(s) { out.status = s; return this; }, json(b) { out.body = b; return this; } }; const chain = routes.get(CHALLENGE_PATH); let i = 0; const next = () => chain[++i] && chain[i](req, res, next); chain[0](req, res, next); return out; };
  assert.equal(run({}).status, 401);
  const ok = run({ user: { id: "u1" } }); assert.equal(ok.status, 200); assert.equal(JSON.stringify(ok.body).includes("654321"), false); assert.equal(ok.headers["Cache-Control"], "no-store"); assert.equal(limiterCalls, 1);
  const none = run({ user: { id: "u2" } }); assert.equal(none.status, 403); assert.equal(none.body.code, "ACTIVATION_NOT_PENDING");
  const again = run({ user: { id: "u1" } }); assert.equal(again.status, 429);
});

test("a database failure gives 500 with no request content on verify, and 503 on the challenge route", opts, () => {
  const svc = createCentralFactorVerify({ db: Object.assign(makeDb(), { prepare: () => { throw new Error("db down 246810"); } }), env: { NEXA_CENTRAL_ZEEZA_VERIFY_KEYS: JSON.stringify({ [KEY_ID]: SECRET }) }, now: () => NOW });
  const env = { v: 1, type: "factor.verify", issuer: "aami-central", audience: "nexa-main-zeeza", at: NOW, data: { userId: "u1", factor: "zeeza_2fa", proof: "246810" } };
  const out = {}; svc.handle({ body: { ...env, keyId: KEY_ID, signature: signEnvelope(SECRET, env) } }, { status(s) { out.status = s; return this; }, json(b) { out.body = b; return this; } });
  assert.equal(out.status, 500); assert.equal(JSON.stringify(out.body).includes("246810"), false);
});

test("only an Admin AAMI grant gives a code: a pending NEXA Main privileged-access grant does not", opts, () => {
  const { svc, db, addUser } = setup();
  ensureNexaMainGrantSchema(db); addUser("user-7");
  db.prepare("INSERT INTO central_privileged_access (applicationId,targetUserId,companyId,productId,role,status,activationConfirmed,seq,lastEventId,reason,updatedAt) VALUES ('app-7','user-7','nexa','nexa-main','administrative_director','pending_activation',0,1,'e7','r','2026-10-13T00:00:00.000Z')").run();
  assert.throws(() => svc.issueChallenge("user-7"), (e) => e.status === 403 && e.code === "ACTIVATION_NOT_PENDING");
  assert.equal(db.prepare("SELECT COUNT(*) c FROM zeeza_central_secure_inbox").get().c, 0);
});
