const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

const INDEX = read('server/index.js');
const ROUTE = /\b(?:app|router)\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]\s*,?(.*)/;
const AUTH = /authMiddleware|extensionKeyAuth/;

// Routes that are public on purpose. A new route without a login check must be added here by a person, on purpose.
const PUBLIC_ROUTES = [
  'GET /api/demo/status', // 404 unless NEXA_PREVIEW_MODE=1
  'GET /health/live', 'GET /health/ready', 'GET /health/operational', 'GET /health',
  'GET /privacy', 'GET /terms',
  'GET /api/auth/google/start', 'GET /api/auth/google/callback', 'POST /api/auth/google/exchange',
  'POST /api/auth/signup', 'POST /api/auth/login',
  'POST /api/auth/email-verification/request', 'POST /api/auth/email-verification/confirm',
  'POST /api/auth/password-reset/request', 'POST /api/auth/password-reset/confirm',
  'GET /api/mall/products', 'GET /api/mall/products/:id', 'GET /api/mall/products/:id/image', 'GET /api/mall/products/:id/images/:n',
  'GET /api/mall/vendors', 'GET /api/mall/discovery', 'GET /api/mall/storefront', 'GET /api/mall/config',
  'GET /p/:id', 'GET /s/:vendorId',
  'POST /api/payments/paystack/webhook', // signature checked, not a login
];

function routes(src) {
  const out = [];
  src.split('\n').forEach((line, i) => { const m = line.match(ROUTE); if (m) out.push({ key: `${m[1].toUpperCase()} ${m[2]}`, rest: m[3], line: i + 1 }); });
  return out;
}

test('M7566/M7570: every server route has a login check unless it is on the public list', () => {
  const open = routes(INDEX).filter((r) => !AUTH.test(r.rest)).map((r) => r.key).sort();
  assert.deepEqual(open, [...PUBLIC_ROUTES].sort());
});

test('M7570: the extension API-key routes only answer for the extension that owns the key', () => {
  const keyed = routes(INDEX).filter((r) => /extensionKeyAuth/.test(r.rest));
  assert.ok(keyed.length >= 2);
  for (const r of keyed) {
    const body = INDEX.split('\n').slice(r.line, r.line + 3).join('\n');
    assert.match(body, /req\.extensionIdentity\.extensionId !== req\.params\.id/, r.key);
  }
});

test('M7570: every staff-link route sits behind the login check', () => {
  const src = read('server/staffLinkRoutes.js');
  const list = routes(src);
  assert.equal(list.length, 9); // 8 + the Director's pending-requests list (V6.2.47 B593)
  for (const r of list) assert.match(r.rest, /^\s*A\b/, r.key);
});

test('M7567/M7568: the public catalogue bounds its inputs and rejects bad values', () => {
  const i = INDEX.indexOf('app.get("/api/mall/products", rateLimit(');
  assert.ok(i > 0);
  const block = INDEX.slice(i, i + 4200);
  assert.match(block, /max: 120/);
  assert.match(block, /slice\(0, 100\)/); // search text
  assert.match(block, /Math\.min\(Math\.max\(parseInt\(req\.query\?\.limit, 10\) \|\| 20, 1\), 50\)/);
  assert.match(block, /slice\(0, 50\)/); // ids
  assert.match(block, /x\.length > 80/);
  assert.match(block, /Invalid sort order/);
  assert.match(block, /Invalid category/);
  assert.match(block, /Invalid rating filter/);
  assert.match(read('server/marketplaceDiscovery.js'), /Math\.min\(Math\.max\(Number\(limit\)\|\|8,1\),20\)/);
  assert.match(INDEX, /express\.json\(\{ limit: "3mb"/);
});

test('M7571/M7576: the payment webhook fails closed without a secret, a signature or a body', () => {
  const payments = read('server/payments.js');
  assert.match(payments, /if \(!rawBody \|\| !signature \|\| !SECRET\(\)\) return false;/);
  assert.match(payments, /timingSafeEqual/);
  const i = INDEX.indexOf('app.post("/api/payments/paystack/webhook"');
  assert.match(INDEX.slice(i, i + 400), /verifyWebhookSignature\(req\.rawBody[^\n]*\n?[^\n]*return res\.status\(401\)\.end\(\)/);
});

test('M7572: a repeated webhook event is recorded once', () => {
  const i = INDEX.indexOf('app.post("/api/payments/paystack/webhook"');
  assert.match(INDEX.slice(i, i + 1800), /INSERT OR IGNORE INTO mall_payment_events/);
});

test('M7577: a failed notification send gives the client a generic message, and bad input is a 400', () => {
  const caps = require('./extensionCapabilities');
  assert.throws(() => caps.sendNotification(() => {}, 'u', { title: '', body: 'x' }), (e) => e.code === 'invalid_input');
  assert.throws(() => caps.sendNotification(() => {}, 'u', { title: 'x', body: 'y'.repeat(501) }), (e) => e.code === 'invalid_input');
  assert.throws(() => caps.sendNotification(null, 'u', { title: 'x', body: 'y' }), (e) => e.code !== 'invalid_input');
  assert.doesNotMatch(INDEX, /status\(503\)\.json\(\{ error: e\.message \|\| "Notification/);
  const generic = INDEX.match(/res\.status\(503\)\.json\(\{ error: "Notification could not be sent\." \}\)/g) || [];
  assert.equal(generic.length, 2);
  assert.equal((INDEX.match(/e\.code === "invalid_input"\) return res\.status\(400\)/g) || []).length, 2);
});

test('M7576: webhook signature check really fails closed (runs the real function)', () => {
  const crypto = require('node:crypto');
  const payments = require('./payments');
  const saved = { key: process.env.PAYSTACK_SECRET_KEY, mode: process.env.PAYMENT_MODE };
  try {
    delete process.env.PAYMENT_MODE;
    const raw = Buffer.from('{"event":"x"}');
    delete process.env.PAYSTACK_SECRET_KEY;
    assert.equal(payments.verifyWebhookSignature(raw, 'abc'), false, 'no secret configured');
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_contract';
    const good = crypto.createHmac('sha512', 'sk_test_contract').update(raw).digest('hex');
    assert.equal(payments.verifyWebhookSignature(raw, good), true);
    assert.equal(payments.verifyWebhookSignature(raw, '0'.repeat(128)), false, 'wrong signature');
    assert.equal(payments.verifyWebhookSignature(Buffer.from('{"event":"y"}'), good), false, 'body changed');
    assert.equal(payments.verifyWebhookSignature(null, good), false, 'no body');
    assert.equal(payments.verifyWebhookSignature(raw, undefined), false, 'no signature');
  } finally {
    for (const [k, v] of [['PAYSTACK_SECRET_KEY', saved.key], ['PAYMENT_MODE', saved.mode]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
});
