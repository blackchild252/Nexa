const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const pa = require('./paymentAttention');

const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const NOW = new Date('2026-10-01T12:00:00.000Z');
function makeDb(rows) {
  const db = new DatabaseSync(':memory:');
  db.exec("CREATE TABLE mall_payment_events (eventKey TEXT PRIMARY KEY, reference TEXT NOT NULL, eventType TEXT NOT NULL, receivedAt TEXT NOT NULL, outcome TEXT NOT NULL DEFAULT 'received', bodyHash TEXT)");
  const ins = db.prepare('INSERT INTO mall_payment_events(eventKey,reference,eventType,receivedAt,outcome,bodyHash) VALUES(?,?,?,?,?,?)');
  rows.forEach((r, i) => ins.run('k' + i, r.ref, r.type || 'charge.success', r.at, r.outcome, 'secret-hash-' + i));
  return db;
}

test('paid-after-cancellation outcomes are flagged for every order type', () => {
  const db = makeDb([
    { ref: 'a', at: '2026-10-01T10:00:00.000Z', outcome: 'cancelled_order' },
    { ref: 'b', at: '2026-10-01T10:01:00.000Z', outcome: 'cancelled_ticket_order' },
    { ref: 'c', at: '2026-10-01T10:02:00.000Z', outcome: 'cancelled_kitchen_order' },
  ]);
  const r = pa.attentionReport(db, { now: NOW });
  assert.equal(r.total, 3);
  assert.equal(r.counts.paid_after_cancellation, 3);
});

test('healthy and final-good outcomes are not flagged', () => {
  const db = makeDb(['confirmed', 'ticket_confirmed', 'kitchen_confirmed', 'vendor_confirmed', 'ignored', 'ticket_already_paid', 'refund_processed', 'wrong_payment_method', 'vendor_already_active'].map((o, i) => ({ ref: 'r' + i, at: '2026-10-01T09:00:00.000Z', outcome: o })));
  assert.equal(pa.attentionReport(db, { now: NOW }).total, 0);
});

test('"received" is flagged only once it is older than the stale threshold', () => {
  const db = makeDb([
    { ref: 'fresh', at: '2026-10-01T11:55:00.000Z', outcome: 'received' },
    { ref: 'stuck', at: '2026-10-01T11:00:00.000Z', outcome: 'received' },
  ]);
  const r = pa.attentionReport(db, { now: NOW });
  assert.equal(r.total, 1);
  assert.equal(r.items[0].reference, 'stuck');
  assert.equal(r.items[0].category, pa.STALE_RECEIVED);
  assert.equal(pa.attentionReport(db, { now: NOW, staleMinutes: 1 }).total, 2);
});

test('report is newest-first, paginated and bounded', () => {
  const rows = Array.from({ length: 130 }, (_, i) => ({ ref: 'p' + i, at: new Date(NOW.getTime() - i * 60000).toISOString(), outcome: 'unmatched' }));
  const db = makeDb(rows);
  const r = pa.attentionReport(db, { now: NOW, limit: 9999 });
  assert.equal(r.total, 130);
  assert.equal(r.items.length, pa.MAX_LIMIT);
  assert.equal(r.items[0].reference, 'p0');
  const page2 = pa.attentionReport(db, { now: NOW, limit: 10, offset: 10 });
  assert.equal(page2.items[0].reference, 'p10');
  assert.equal(pa.attentionReport(db, { now: NOW, limit: 'x', offset: -5 }).offset, 0);
});

test('report never leaks body hashes or event keys and never writes', () => {
  const db = makeDb([{ ref: 'z', at: '2026-10-01T10:00:00.000Z', outcome: 'mismatch' }]);
  const out = JSON.stringify(pa.attentionReport(db, { now: NOW }));
  assert.doesNotMatch(out, /secret-hash|eventKey|bodyHash|"k0"/);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM mall_payment_events').get().n, 1);
  assert.doesNotMatch(read('paymentAttention.js'), /\b(INSERT|UPDATE|DELETE|DROP|ALTER)\b/);
});

test('every outcome the webhook can write for an unapplied payment is categorised', () => {
  const src = read('index.js');
  const start = src.indexOf('app.post("/api/payments/paystack/webhook"');
  const end = src.indexOf('// V3.50.3 — buyer payment history');
  const webhook = src.slice(start, end);
  const written = new Set([...webhook.matchAll(/"([a-z_]+)"(?:, eventKey|\)\.run\(|\);)/g)].map((m) => m[1]));
  const mustFlag = ['cancelled_order', 'cancelled_ticket_order', 'cancelled_kitchen_order', 'unmatched', 'mismatch', 'ticket_mismatch', 'kitchen_mismatch', 'vendor_mismatch', 'vendor_activation_failed', 'unmatched_refund'];
  for (const o of mustFlag) assert.ok(webhook.includes('"' + o + '"') || webhook.includes("'" + o + "'"), 'webhook still writes ' + o);
  for (const o of mustFlag) assert.ok(pa.OUTCOME_CATEGORY[o], 'categorised: ' + o);
  assert.ok(written.size > 0);
});

test('admin route is administrator-gated, authenticated and read-only', () => {
  const src = read('index.js');
  const i = src.indexOf('app.get("/api/admin/payments/attention"');
  assert.ok(i > 0);
  const block = src.slice(i, i + 700);
  assert.match(block, /auth\.authMiddleware/);
  assert.match(block, /isConfiguredAdmin\(req\.user\)\) return res\.status\(403\)/);
  assert.match(block, /paymentAttention\.attentionReport\(db/);
  assert.match(src, /const paymentAttention = require\("\.\/paymentAttention"\)/);
});

test('webhook behaviour is unchanged by the attention report', () => {
  const src = read('index.js');
  assert.match(src, /WEBHOOK_RETRYABLE_OUTCOMES/);
  assert.match(src, /"cancelled_ticket_order", eventKey\); return res\.sendStatus\(200\)|cancelled_ticket_order/);
});
