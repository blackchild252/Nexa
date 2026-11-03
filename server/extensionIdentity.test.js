const test = require('node:test');
const assert = require('node:assert/strict');
const identity = require('./extensionIdentity');

test('extension API keys are high-entropy, prefixed, and one-way verifiable', () => {
  const key = identity.generateApiKey();
  assert.match(key, /^nxa_ext_[A-Za-z0-9_-]{43}$/);
  const hash = identity.hashApiKey(key);
  assert.equal(hash.length, 64);
  assert.equal(identity.verifyApiKey(key, hash), true);
  assert.equal(identity.verifyApiKey(`${key}x`, hash), false);
  assert.equal(identity.prefixApiKey(key), key.slice(0, 16));
});

test('identity records never contain the raw API key', () => {
  const key = identity.generateApiKey();
  const record = identity.identityRecord({ extensionId: 'ext_1', userId: 'user_1', key, now: '2026-09-25T00:00:00.000Z' });
  assert.equal(record.extensionId, 'ext_1');
  assert.equal(record.userId, 'user_1');
  assert.equal(record.keyHash, identity.hashApiKey(key));
  assert.equal(record.apiKey, undefined);
  assert.equal(record.key, undefined);
  assert.notEqual(record.keyHash, key);
});


test('identity records track last-used metadata without storing credentials', () => {
  const record = identity.identityRecord({ extensionId: 'ext_1', userId: 'user_1', key: identity.generateApiKey() });
  assert.equal(record.lastUsedAt, null);
  assert.equal(record.apiKey, undefined);
});

test('extension identity rate limiter allows the configured burst and blocks excess requests', () => {
  const limiter = identity.createRateLimiter({ windowMs: 1000, maxRequests: 2 });
  assert.equal(limiter.consume('client_1', 1000).allowed, true);
  assert.equal(limiter.consume('client_1', 1100).allowed, true);
  const blocked = limiter.consume('client_1', 1200);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.equal(blocked.retryAfterMs, 800);
  assert.equal(limiter.consume('client_1', 2000).allowed, true);
});
