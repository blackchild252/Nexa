"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { ENDPOINT_PATH, RESPONSE, signEnvelope, createCentralIdentityResolve, registerCentralIdentityResolve } = require("./centralIdentityResolve");

const SECRET = "central-main-identity-contract-secret-2026";
const KEY_ID = "central-identity-v1";
const NOW = 1_800_000_000_000;
class FakeDb {
  constructor() { this.users = new Map([['verified@example.test', { id: 'u_verified', email: 'verified@example.test', username: 'verified_user', accountStatus: 'active', emailVerifiedAt: '2026-01-01T00:00:00.000Z' }], ['unverified@example.test', { id: 'u_unverified', email: 'unverified@example.test', username: 'unverified_user', accountStatus: 'active', emailVerifiedAt: null }], ['suspended@example.test', { id: 'u_suspended', email: 'suspended@example.test', username: 'suspended_user', accountStatus: 'suspended', emailVerifiedAt: '2026-01-01T00:00:00.000Z' }], ['closed@example.test', { id: 'u_closed', email: 'closed@example.test', username: 'closed_user', accountStatus: 'closed', emailVerifiedAt: '2026-01-01T00:00:00.000Z' }]]); this.fail = false; }
  prepare(sql) { assert.match(sql, /SELECT id, email, username, accountStatus, emailVerifiedAt FROM users/); return { get: (email) => { if (this.fail) throw new Error('private database path /secret/db'); return this.users.get(email); } }; }
}
function envelope(overrides = {}) { return { v: 1, type: 'identity.resolve', issuer: 'aami-central', audience: 'nexa-main-identity', at: NOW, eventId: 'identity-event-1', correlationId: 'corr-1', data: { email: 'verified@example.test' }, ...overrides }; }
function signed(value, { secret = SECRET, keyId = KEY_ID } = {}) { return { ...value, keyId, signature: signEnvelope(secret, value) }; }
function invoke(service, body) { const res = { statusCode: null, body: null, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; } }; service.handle({ body }, res); return res; }
function setup({ configured = true } = {}) { const db = new FakeDb(); const env = configured ? { AAMI_CENTRAL_IDENTITY_KEYS: JSON.stringify({ [KEY_ID]: SECRET }) } : {}; return { db, service: createCentralIdentityResolve({ db, env, now: () => NOW }) }; }

test('identity endpoint registers POST only and is scoped to the Main identity authority', () => {
  const routes = []; const db = new FakeDb(); const svc = registerCentralIdentityResolve({ app: { post: (...a) => routes.push(a), get: (...a) => routes.push(a) }, db, env: {} });
  assert.equal(ENDPOINT_PATH, '/central/v1/identity/resolve'); assert.equal(routes.length, 1); assert.equal(routes[0][0], ENDPOINT_PATH); assert.equal(typeof svc.handle, 'function');
});
test('missing keys, bad signature, wrong scope, stale timestamp and extra fields fail closed', () => {
  const noKeys = setup({ configured: false }); assert.equal(invoke(noKeys.service, signed(envelope())).statusCode, 401);
  const s = setup(); const bad = signed(envelope()); bad.signature = '0'.repeat(64); assert.equal(invoke(s.service, bad).statusCode, 401);
  const wrong = envelope({ audience: 'lordgistics' }); assert.equal(invoke(s.service, signed(wrong)).statusCode, 403);
  const stale = envelope({ at: NOW - 5 * 60_000 - 1 }); assert.equal(invoke(s.service, signed(stale)).statusCode, 400);
  const extra = envelope({ data: { email: 'verified@example.test', userId: 'attacker-chosen' } }); assert.equal(invoke(s.service, signed(extra)).statusCode, 400);
});
test('only active accounts with verified email resolve; response is signed and minimized', () => {
  const s = setup(); const response = invoke(s.service, signed(envelope())); assert.equal(response.statusCode, 200);
  const { signature, keyId, ...result } = response.body; assert.equal(keyId, KEY_ID); assert.equal(signature, signEnvelope(SECRET, result));
  assert.deepEqual({ v: result.v, type: result.type, issuer: result.issuer, audience: result.audience }, RESPONSE);
  assert.deepEqual(result.data, { found: true, userId: 'u_verified', username: 'verified_user', emailVerified: true });
  assert.equal(JSON.stringify(result).includes('verified@example.test'), false); assert.equal(JSON.stringify(result).includes('passwordHash'), false);
});
test('nonexistent, unverified, suspended and closed accounts return the same signed not-found result', () => {
  const s = setup();
  for (const email of ['nobody@example.test', 'unverified@example.test', 'suspended@example.test', 'closed@example.test']) {
    const eventId = `lookup-${email.replace('@', '-at-')}`;
    const r = invoke(s.service, signed(envelope({ eventId, data: { email } })));
    assert.equal(r.statusCode, 200); assert.deepEqual(r.body.data, { found: false, userId: null, username: null, emailVerified: false });
  }
});
test('database errors are sanitized', () => { const s = setup(); s.db.fail = true; const r = invoke(s.service, signed(envelope())); assert.equal(r.statusCode, 503); assert.deepEqual(r.body, { error: 'Identity lookup is temporarily unavailable.' }); assert.equal(JSON.stringify(r.body).includes('/secret/db'), false); });
test('Main server wires the identity resolver after JSON parsing and never exposes a GET lookup', () => {
  const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  const parser = source.indexOf('app.use(express.json('); const route = source.indexOf('registerCentralIdentityResolve({ app, db, env: process.env });');
  assert.ok(parser >= 0 && route > parser); assert.match(source, /centralIdentityResolve/);
  assert.doesNotMatch(source, /app\.get\(["'`]\/central\/v1\/identity\/resolve/);
});
