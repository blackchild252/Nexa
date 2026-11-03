"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  ENDPOINT_PATH, canonicalJson, signEnvelope, createCentralActivationCodeDelivery,
  registerCentralActivationCodeDelivery,
} = require("./centralActivationCodeDelivery");

const SECRET = "central-main-shared-secret-2026";
const KEY_ID = "central-prod-1";

class FakeDb {
  constructor() {
    this.users = new Map([[
      "user-1", { id: "user-1", email: "applicant@example.test", username: "applicant", accountStatus: "active" },
    ]]);
    this.messages = new Map();
    this.byEvent = new Map();
    this.events = new Map();
  }
  exec() {}
  transaction(fn) { return () => fn(); }
  prepare(sql) {
    if (sql.startsWith("DELETE FROM zeeza_central_secure_inbox")) return { run: (cutoff) => {
      let changes = 0;
      for (const [id, row] of this.messages) if (row.expiresAt <= cutoff) { this.messages.delete(id); this.byEvent.delete(row.eventId); changes++; }
      return { changes };
    } };
    if (sql.includes("SELECT eventId FROM zeeza_central_activation_events WHERE eventId = ?")) return { get: (eventId) => {
      const row = this.events.get(eventId); return row ? { eventId: row.eventId } : undefined;
    } };
    if (sql.includes("INSERT INTO zeeza_central_activation_events")) return { run: (eventId, deliveredAt) => {
      if (this.events.has(eventId)) { const e = new Error("UNIQUE constraint failed"); e.code = "SQLITE_CONSTRAINT_UNIQUE"; throw e; }
      this.events.set(eventId, { eventId, deliveredAt }); return { changes: 1 };
    } };
    if (sql.includes("SELECT id, email, username, accountStatus FROM users WHERE id = ?")) return { get: (id) => this.users.get(id) };
    if (sql.includes("INSERT INTO zeeza_central_secure_inbox")) return { run: (id, eventId, userId, applicationId, message, expiresAt, createdAt) => {
      if (this.byEvent.has(eventId)) { const e = new Error("UNIQUE constraint failed"); e.code = "SQLITE_CONSTRAINT_UNIQUE"; throw e; }
      const row = { id, eventId, userId, applicationId, category: "local", preview: "AAMI Central activation code", message, expiresAt, createdAt };
      this.messages.set(id, row); this.byEvent.set(eventId, row); return { changes: 1 };
    } };
    throw new Error(`Unexpected SQL in test double: ${sql}`);
  }
}

function envelope(overrides = {}) {
  const now = 1_800_000_000_000;
  return {
    v: 1, type: "activation.code_delivery", eventId: "ZD-test-event-001", issuer: "aami-central",
    audience: "nexa-main-zeeza", at: now, correlationId: null,
    data: { applicationId: "application-1", applicantId: "user-1", username: "applicant", email: "applicant@example.test", product: "nexa", role: "administrative_director", code: "ABCD-1234", expiresAt: new Date(now + 60 * 60_000).toISOString(), channel: "zeeza_secure_inbox" },
    ...overrides,
  };
}
function signed(env, { secret = SECRET, keyId = KEY_ID } = {}) {
  return { ...env, keyId, signature: signEnvelope(secret, env) };
}
function invoke(service, body) {
  const res = { statusCode: null, body: null, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  service.handle({ body }, res);
  return res;
}
function setup({ configured = true, start = 1_800_000_000_000 } = {}) {
  const db = new FakeDb(); let now = start;
  const env = configured ? { NEXA_CENTRAL_ZEEZA_KEYS: JSON.stringify({ [KEY_ID]: SECRET }) } : {};
  const service = createCentralActivationCodeDelivery({ db, env, now: () => now, genId: () => `inbox-${db.messages.size + 1}`, scheduleCleanup: false });
  return { db, service, setNow(v) { now = v; }, now: () => now };
}

test("canonical JSON sorts object keys recursively while preserving array order", () => {
  assert.equal(canonicalJson({ z: 1, a: { y: 2, b: 3 }, list: [ { z: 1, a: 2 }, 4 ] }), '{"a":{"b":3,"y":2},"list":[{"a":2,"z":1},4],"z":1}');
});

test("Main endpoint path is server-to-server and registers only the POST receiver", () => {
  const routes = [];
  const db = new FakeDb();
  const service = registerCentralActivationCodeDelivery({ app: { post: (...args) => routes.push(args), get: (...args) => routes.push(["GET", ...args]) }, db, env: {}, scheduleCleanup: false });
  assert.equal(ENDPOINT_PATH, "/zeeza/v1/central/activation-code");
  assert.equal(routes.length, 1);
  assert.equal(routes[0][0], ENDPOINT_PATH);
  service.close();
});

test("server wires the receiver after JSON parsing and adds no client read route", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "server/index.js"), "utf8");
  const jsonParser = source.indexOf("app.use(express.json(");
  const receiver = source.indexOf("registerCentralActivationCodeDelivery({ app, db, env: process.env });");
  assert.ok(jsonParser >= 0 && receiver > jsonParser);
  assert.match(source, /require\("\.\/centralActivationCodeDelivery"\)/);
  assert.doesNotMatch(source, /app\.(?:get|post)\(["'`]\/zeeza\/v1\/central\/activation-code\/messages/);
});

test("missing key configuration fails closed without storing a message", () => {
  const s = setup({ configured: false });
  const r = invoke(s.service, signed(envelope()));
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.body, { delivered: false, reason: "bad_signature" });
  assert.equal(s.db.messages.size, 0);
  s.service.close();
});

test("valid signed event stores one local secure inbox message with a generic hidden preview", () => {
  const s = setup();
  const e = envelope();
  const r = invoke(s.service, signed(e));
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.body, { delivered: true, eventId: e.eventId });
  assert.equal(s.db.messages.size, 1);
  const row = [...s.db.messages.values()][0];
  assert.equal(row.userId, "user-1");
  assert.equal(row.category, "local");
  assert.equal(row.preview, "AAMI Central activation code");
  assert.match(row.message, /ABCD-1234/);
  assert.doesNotMatch(row.preview, /ABCD-1234/);
  assert.equal(row.message, "Your AAMI Central activation code is ABCD-1234. It works once and expires in 60 minutes. Enter it in AAMI Admin. Nobody from NEXA will ever ask you for it.");
  assert.equal(row.code, undefined);
  s.service.close();
});

test("accepts Central's canonical numeric millisecond expiresAt value", () => {
  const s = setup();
  const e = envelope({ data: { ...envelope().data, expiresAt: s.now() + 60 * 60_000 } });
  const r = invoke(s.service, signed(e));
  assert.deepEqual(r.body, { delivered: true, eventId: e.eventId });
  assert.equal(s.db.messages.size, 1);
  assert.equal(Date.parse([...s.db.messages.values()][0].expiresAt), s.now() + 60 * 60_000);
  s.service.close();
});

test("repeated eventId acknowledges delivery without creating a second message", () => {
  const s = setup(); const e = envelope();
  assert.equal(invoke(s.service, signed(e)).body.delivered, true);
  assert.equal(invoke(s.service, signed(e)).body.delivered, true);
  assert.equal(s.db.messages.size, 1);
  s.service.close();
});

test("bad signature, wrong scope and stale events are refused with the specified reasons", () => {
  const s = setup(); const e = envelope();
  const bad = signed(e); bad.signature = "0".repeat(64);
  assert.deepEqual(invoke(s.service, bad).body, { delivered: false, reason: "bad_signature" });
  const wrong = envelope({ audience: "other-app" });
  assert.deepEqual(invoke(s.service, signed(wrong)).body, { delivered: false, reason: "wrong_scope" });
  const stale = envelope({ at: s.now() - 5 * 60_000 - 1 });
  assert.deepEqual(invoke(s.service, signed(stale)).body, { delivered: false, reason: "stale_event" });
  assert.equal(s.db.messages.size, 0);
  s.service.close();
});

test("identity mismatch and unknown data keys are rejected before storage", () => {
  const s = setup();
  const wrongIdentity = envelope({ data: { ...envelope().data, email: "other@example.test" } });
  assert.deepEqual(invoke(s.service, signed(wrongIdentity)).body, { delivered: false, reason: "identity_mismatch" });
  const extra = envelope({ data: { ...envelope().data, extraSecret: "nope" } });
  assert.deepEqual(invoke(s.service, signed(extra)).body, { delivered: false, reason: "bad_request" });
  assert.equal(s.db.messages.size, 0);
  assert.equal(s.db.events.size, 0);
  s.service.close();
});

test("expired inbox messages are removed while deduplication metadata remains code-free", () => {
  const s = setup(); const e = envelope();
  invoke(s.service, signed(e));
  assert.equal(s.db.messages.size, 1);
  s.setNow(Date.parse(e.data.expiresAt) + 1);
  s.service.deleteExpired();
  assert.equal(s.db.messages.size, 0);
  assert.equal(s.db.events.size, 1);
  const retry = envelope({ at: s.now() });
  assert.equal(invoke(s.service, signed(retry)).body.delivered, true);
  assert.equal(s.db.messages.size, 0);
  s.service.close();
});
