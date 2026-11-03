'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { SECRET_KEYS, inspectConfiguration, safeReadinessSummary, redactSecrets, isUrl } = require('./productionConfig');

test('development config remains runnable with absent external credentials', () => {
  const result = inspectConfiguration({ NODE_ENV: 'development' });
  assert.equal(result.ready, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.fields.find(f => f.key === 'OPENAI_API_KEY').status, 'missing');
});

test('production core config reports missing requirements without values', () => {
  const result = inspectConfiguration({ NODE_ENV: 'production', DB_PATH: '/data/nexa.db', PUBLIC_URL: 'http://unsafe.example', CORS_ORIGINS: '*' });
  assert.equal(result.ready, false);
  assert.deepEqual(result.blockers, ['PUBLIC_URL', 'CORS_ORIGINS']);
  const summary = safeReadinessSummary(result);
  assert.match(summary, /BLOCKED/);
  assert.doesNotMatch(summary, /unsafe\.example/);
});

test('live payments require a real Paystack key; safe placeholders do not count', () => {
  const base = { NODE_ENV: 'production', DB_PATH: '/data/nexa.db', PUBLIC_URL: 'https://api.example.test', CORS_ORIGINS: 'https://app.example.test', PAYMENT_MODE: 'live', PAYMENTS_ENABLED: 'true', PAYSTACK_SECRET_KEY: 'your_key_here' };
  assert.deepEqual(inspectConfiguration(base).blockers, ['PAYSTACK_SECRET_KEY']);
  assert.deepEqual(inspectConfiguration({ ...base, PAYSTACK_SECRET_KEY: 'sk_live_owner_supplied' }).blockers, []);
});

test('URL validator accepts HTTPS and rejects insecure or malformed URLs', () => {
  assert.equal(isUrl('https://api.example.test'), true);
  assert.equal(isUrl('http://api.example.test'), false);
  assert.equal(isUrl('not a url'), false);
});

test('secret redaction hides supplied values and common credential formats', () => {
  const env = { OPENAI_API_KEY: 'real-owner-secret-value' };
  const out = redactSecrets('key=real-owner-secret-value Authorization: Bearer abc.def.ghi client_secret=hidden', env);
  assert.doesNotMatch(out, /real-owner-secret-value|abc\.def\.ghi|client_secret=hidden/);
  assert.match(out, /\[REDACTED\]/);
  assert.ok(SECRET_KEYS.includes('PAYSTACK_SECRET_KEY'));
  assert.ok(SECRET_KEYS.includes('NEXA_WALLET_WEBHOOK_SECRET'));
});

test('placeholder provider adapter stays runnable without pretending the provider succeeded', async () => {
  const adapter = require('./productionConfig').createProviderAdapter({ name: 'mail', envKey: 'EMAIL_API_KEY', env: { EMAIL_API_KEY: 'your_key_here' } });
  assert.equal(adapter.configured, false);
  assert.deepEqual(await adapter.execute({ to: 'user@example.test' }), { ok: false, code: 'PROVIDER_NOT_CONFIGURED', provider: 'mail' });
});

test('webhook signature verification uses the raw body and rejects invalid signatures', () => {
  const crypto = require('node:crypto');
  const { verifyWebhookSignature } = require('./productionConfig');
  const rawBody = Buffer.from('{"event":"payment.success"}');
  const secret = 'owner-supplied-webhook-secret';
  const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  assert.equal(verifyWebhookSignature({ rawBody, signature: `sha256=${signature}`, secret }), true);
  assert.equal(verifyWebhookSignature({ rawBody, signature: '00', secret }), false);
  assert.equal(verifyWebhookSignature({ rawBody, signature, secret: 'your_secret_here' }), false);
});
