const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const pr = require('./paymentReconciler');
const payments = require('./payments');
const pa = require('./paymentAttention');

const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const NOW = new Date('2026-10-01T12:00:00.000Z');
const ago = (minutes) => new Date(NOW.getTime() - minutes * 60000).toISOString();

function makeDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE mall_payment_events (eventKey TEXT PRIMARY KEY, reference TEXT NOT NULL, eventType TEXT NOT NULL, receivedAt TEXT NOT NULL, outcome TEXT NOT NULL DEFAULT 'received', bodyHash TEXT);
    CREATE TABLE kitchen_orders (id TEXT PRIMARY KEY, userId TEXT NOT NULL, items TEXT NOT NULL DEFAULT '[]', total REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'NGN', status TEXT NOT NULL DEFAULT 'pending_payment', paymentRef TEXT, referralCode TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, providerVerified INTEGER NOT NULL DEFAULT 0, feeStatus TEXT NOT NULL DEFAULT 'none', feeChargeId TEXT);
    CREATE TABLE yaayz_ticket_orders (id TEXT PRIMARY KEY, ticketId TEXT NOT NULL DEFAULT 't', buyerId TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, total REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'NGN', status TEXT NOT NULL DEFAULT 'pending_payment', paymentRef TEXT, ticketCode TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, providerVerified INTEGER NOT NULL DEFAULT 0, feeStatus TEXT NOT NULL DEFAULT 'none');
  `);
  return db;
}
function kitchen(db, o) {
  db.prepare('INSERT INTO kitchen_orders(id,userId,total,currency,status,paymentRef,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?)')
    .run(o.id, o.user || 'u1', o.total ?? 1000, o.currency || 'NGN', o.status || 'pending_payment', o.ref, o.at || ago(30), o.at || ago(30));
}
function ticket(db, o) {
  db.prepare('INSERT INTO yaayz_ticket_orders(id,buyerId,total,currency,status,paymentRef,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?)')
    .run(o.id, o.user || 'u2', o.total ?? 2500, o.currency || 'NGN', o.status || 'pending_payment', o.ref, o.at || ago(30), o.at || ago(30));
}
function makeDeps(answers, calls = {}) {
  const log = { verify: [], push: [], kitchenFee: [], ticketFee: [] };
  Object.assign(calls, log);
  return {
    verify: async (ref) => { log.verify.push(ref); const a = answers[ref]; if (a instanceof Error) throw a; return a || { status: 'abandoned', reference: ref }; },
    matchesExpectedPayment: payments.matchesExpectedPayment,
    issueYaayzTicketCode: (id) => 'YAA-' + id,
    settleYaayzFee: (_db, user, id) => { log.ticketFee.push([user, id]); },
    settleKitchenFee: (_db, user, id) => { log.kitchenFee.push([user, id]); },
    kitchenUserCode: () => 'CODE',
    settleKitchenReferral: () => ({ qualified: false }),
    generateKitchenReceipt: async () => null,
    sendPush: async (user, title) => { log.push.push([user, title]); },
    _log: log,
  };
}
const success = (ref, amount, currency = 'NGN') => ({ status: 'success', reference: ref, amount, currency });
const row = (db, table, id) => db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id);
const event = (db, ref) => db.prepare('SELECT * FROM mall_payment_events WHERE eventKey=?').get('reconcile:' + ref);

test('a paid kitchen order that is still pending is confirmed', async () => {
  const db = makeDb(); kitchen(db, { id: 'k1', ref: 'ref-k1', total: 1000 });
  const deps = makeDeps({ 'ref-k1': success('ref-k1', 100000) });
  const s = await pr.reconcile(db, deps, { now: NOW });
  assert.equal(s.confirmed, 1);
  const o = row(db, 'kitchen_orders', 'k1');
  assert.equal(o.status, 'paid'); assert.equal(o.providerVerified, 1);
  assert.equal(event(db, 'ref-k1').outcome, pr.OUTCOME.KITCHEN_CONFIRMED);
  assert.deepEqual(deps._log.kitchenFee, [['u1', 'k1']]);
  assert.equal(deps._log.push.length, 1);
});

test('a paid ticket order that is still pending is confirmed with a ticket code', async () => {
  const db = makeDb(); ticket(db, { id: 'y1', ref: 'ref-y1', total: 2500 });
  const s = await pr.reconcile(db, makeDeps({ 'ref-y1': success('ref-y1', 250000) }), { now: NOW });
  assert.equal(s.confirmed, 1);
  const o = row(db, 'yaayz_ticket_orders', 'y1');
  assert.equal(o.status, 'paid'); assert.equal(o.ticketCode, 'YAA-y1'); assert.equal(o.providerVerified, 1);
  assert.equal(event(db, 'ref-y1').outcome, pr.OUTCOME.TICKET_CONFIRMED);
});

test('wrong amount or currency is flagged and never confirmed', async () => {
  const db = makeDb(); kitchen(db, { id: 'k1', ref: 'a', total: 1000 }); ticket(db, { id: 'y1', ref: 'b', total: 2500 });
  const s = await pr.reconcile(db, makeDeps({ a: success('a', 50000), b: success('b', 250000, 'USD') }), { now: NOW });
  assert.equal(s.confirmed, 0); assert.equal(s.flagged, 2);
  assert.equal(row(db, 'kitchen_orders', 'k1').status, 'pending_payment');
  assert.equal(row(db, 'yaayz_ticket_orders', 'y1').status, 'pending_payment');
  assert.equal(event(db, 'a').outcome, 'kitchen_mismatch');
  assert.equal(event(db, 'b').outcome, 'ticket_mismatch');
  assert.equal(pa.attentionReport(db, { now: NOW }).counts.amount_or_status_mismatch, 2);
});

test('a cancelled order that was paid is never reopened but shows in the attention report', async () => {
  const db = makeDb(); kitchen(db, { id: 'k1', ref: 'c1', status: 'cancelled' }); ticket(db, { id: 'y1', ref: 'c2', status: 'cancelled', total: 2500 });
  const s = await pr.reconcile(db, makeDeps({ c1: success('c1', 100000), c2: success('c2', 250000) }), { now: NOW });
  assert.equal(s.confirmed, 0);
  assert.equal(row(db, 'kitchen_orders', 'k1').status, 'cancelled');
  assert.equal(row(db, 'yaayz_ticket_orders', 'y1').status, 'cancelled');
  assert.equal(pa.attentionReport(db, { now: NOW }).counts.paid_after_cancellation, 2);
});

test('orders younger than the minimum age, or older than the window, are not checked', async () => {
  const db = makeDb();
  kitchen(db, { id: 'young', ref: 'young', at: ago(5) });
  kitchen(db, { id: 'old', ref: 'old', at: ago(60 * 24 * 5) });
  kitchen(db, { id: 'ok', ref: 'ok', at: ago(20) });
  const deps = makeDeps({});
  await pr.reconcile(db, deps, { now: NOW });
  assert.deepEqual(deps._log.verify, ['ok']);
});

test('unpaid orders back off, then give up after the maximum attempts', async () => {
  const db = makeDb(); kitchen(db, { id: 'k1', ref: 'slow', at: ago(600) });
  const deps = makeDeps({});
  let t = NOW.getTime();
  await pr.reconcile(db, deps, { now: new Date(t) });
  assert.equal(event(db, 'slow').outcome, pr.OUTCOME.WAITING);
  await pr.reconcile(db, deps, { now: new Date(t + 60000) }); // too soon
  assert.equal(deps._log.verify.length, 1);
  for (let i = 0; i < 10; i++) { t += 24 * 3600000; await pr.reconcile(db, deps, { now: new Date(t), maxAgeHours: 24 * 30 }); }
  assert.equal(event(db, 'slow').outcome, pr.OUTCOME.GAVE_UP);
  assert.equal(deps._log.verify.length, pr.DEFAULTS.maxAttempts);
});

test('an order is confirmed only once even if the job runs twice', async () => {
  const db = makeDb(); kitchen(db, { id: 'k1', ref: 'r', total: 1000 });
  const deps = makeDeps({ r: success('r', 100000) });
  await pr.reconcile(db, deps, { now: NOW });
  const s2 = await pr.reconcile(db, deps, { now: new Date(NOW.getTime() + 3600000) });
  assert.equal(s2.checked, 0);
  assert.equal(deps._log.kitchenFee.length, 1);
  assert.equal(deps._log.push.length, 1);
});

test('an order the webhook already settled is left alone', async () => {
  const db = makeDb(); kitchen(db, { id: 'k1', ref: 'w', status: 'paid' });
  const deps = makeDeps({ w: success('w', 100000) });
  await pr.reconcile(db, deps, { now: NOW });
  assert.deepEqual(deps._log.verify, []);
});

test('references the webhook already flagged are not re-checked', async () => {
  const db = makeDb(); kitchen(db, { id: 'k1', ref: 'f1', status: 'cancelled' });
  db.prepare("INSERT INTO mall_payment_events(eventKey,reference,eventType,receivedAt,outcome) VALUES('99','f1','charge.success',?,'cancelled_kitchen_order')").run(ago(10));
  const deps = makeDeps({ f1: success('f1', 100000) });
  await pr.reconcile(db, deps, { now: NOW });
  assert.deepEqual(deps._log.verify, []);
});

test('provider errors do not use up attempts and stop the tick after three in a row', async () => {
  const db = makeDb();
  for (let i = 0; i < 6; i++) kitchen(db, { id: 'k' + i, ref: 'e' + i, at: ago(30 + i) });
  const err = new Error('network');
  const deps = makeDeps(Object.fromEntries([0, 1, 2, 3, 4, 5].map((i) => ['e' + i, err])));
  const s = await pr.reconcile(db, deps, { now: NOW });
  assert.equal(s.stoppedEarly, true); assert.equal(s.providerErrors, 3); assert.equal(s.checked, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM mall_payment_events').get().n, 0);
});

test('a failing fee settlement leaves the order paid with the fee marked pending (kitchen)', async () => {
  const db = makeDb(); kitchen(db, { id: 'k1', ref: 'fee', total: 1000 });
  const deps = makeDeps({ fee: success('fee', 100000) });
  deps.settleKitchenFee = () => { throw new Error('Insufficient wallet'); };
  const s = await pr.reconcile(db, deps, { now: NOW });
  assert.equal(s.confirmed, 1);
  const o = row(db, 'kitchen_orders', 'k1');
  assert.equal(o.status, 'paid'); assert.equal(o.feeStatus, 'pending');
});

test('each tick checks at most the configured number of orders', async () => {
  const db = makeDb();
  for (let i = 0; i < 8; i++) kitchen(db, { id: 'k' + i, ref: 'm' + i, at: ago(30 + i) });
  const deps = makeDeps({});
  const s = await pr.reconcile(db, deps, { now: NOW, maxChecksPerTick: 3 });
  assert.equal(s.checked, 3);
});

test('source wiring: guarded start, kill switch, shared matcher and guarded UPDATE', () => {
  const idx = read('index.js'); const src = read('paymentReconciler.js');
  assert.match(idx, /paymentReconciler/);
  assert.match(idx, /PAYMENT_RECONCILE_DISABLED/);
  assert.match(idx, /PAYMENT_MODE/);
  assert.match(src, /status='pending_payment' AND paymentRef=\?/);
  assert.doesNotMatch(src, /status='pending_payment',|SET status='pending_payment'/);
  assert.match(read('.env.example'), /PAYMENT_RECONCILE_DISABLED/);
});
