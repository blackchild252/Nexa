'use strict';
// B146 / CP2 — NEXA service fees are waived while no wallet money can exist (production, no wallet partner yet).
// Before this, Marketplace checkout demanded wallet money the app can no longer collect (B145 removed top-ups).
// Behaviour is run against a real SQLite database through node:sqlite in child processes, because the wallet
// mode is read once when the module loads. Runs in a bare checkout (no node_modules).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const SERVER = __dirname;

const WALLET_TABLES = `
CREATE TABLE wallet_accounts (id TEXT PRIMARY KEY, userId TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'NGN', status TEXT NOT NULL DEFAULT 'active', providerStatus TEXT NOT NULL DEFAULT 'sandbox', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
CREATE UNIQUE INDEX idx_wa ON wallet_accounts(userId,currency);
CREATE TABLE wallet_transactions (id TEXT PRIMARY KEY, userId TEXT NOT NULL, type TEXT, direction TEXT, amountMinor INTEGER, currency TEXT NOT NULL DEFAULT 'NGN', status TEXT);
CREATE TABLE wallet_ledger_entries (id TEXT PRIMARY KEY, transactionId TEXT NOT NULL, userId TEXT NOT NULL, amountMinor INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'NGN', createdAt TEXT NOT NULL);
`;

// Runs a scenario in a fresh node process and returns its JSON result.
function run(env, body, { walletTables = false } = {}) {
  const code = `
    const { DatabaseSync } = require('node:sqlite');
    const w = require(${JSON.stringify(path.join(SERVER, 'wallet'))});
    const s = require(${JSON.stringify(path.join(SERVER, 'subscriptions'))});
    const db = new DatabaseSync(':memory:');
    db.transaction = (fn) => (...a) => { db.exec('BEGIN'); try { const r = fn(...a); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } };
    ${walletTables ? `db.exec(${JSON.stringify(WALLET_TABLES)});` : ''}
    const out = (v) => process.stdout.write('\\n@@' + JSON.stringify(v) + '@@\\n');
    ${body}
  `;
  const clean = { ...process.env };
  for (const k of ['NEXA_WALLET_MODE', 'NODE_ENV', 'NEXA_FEES_WAIVED']) delete clean[k];
  const r = spawnSync(process.execPath, ['-e', code], { env: { ...clean, ...env }, encoding: 'utf8' });
  const m = /@@(.*)@@/s.exec(r.stdout || '');
  assert.ok(m, `scenario produced no result. stderr: ${r.stderr}`);
  return JSON.parse(m[1]);
}

test('waiver decision table: only a wallet that can really hold money keeps fees on', () => {
  const decide = (env) => run(env, 'out({ waived: w.serviceFeesWaived(), canHold: w.walletCanHoldMoney() })');
  assert.deepEqual(decide({ NEXA_WALLET_MODE: 'sandbox', NODE_ENV: 'test' }), { waived: false, canHold: true });
  assert.deepEqual(decide({ NEXA_WALLET_MODE: 'sandbox', NODE_ENV: 'production' }), { waived: true, canHold: false });
  assert.deepEqual(decide({ NEXA_WALLET_MODE: 'live', NODE_ENV: 'production' }), { waived: true, canHold: false });
  assert.deepEqual(decide({ NEXA_WALLET_MODE: 'live', NODE_ENV: 'test' }), { waived: true, canHold: false });
  assert.deepEqual(decide({}), { waived: false, canHold: true }); // defaults: sandbox, not production
});

test('NEXA_FEES_WAIVED forces the waiver on (1) or charging on (0)', () => {
  assert.equal(run({ NEXA_WALLET_MODE: 'sandbox', NODE_ENV: 'test', NEXA_FEES_WAIVED: '1' }, 'out(w.serviceFeesWaived())'), true);
  assert.equal(run({ NEXA_WALLET_MODE: 'sandbox', NODE_ENV: 'production', NEXA_FEES_WAIVED: '0' }, 'out(w.serviceFeesWaived())'), false);
});

test('waived: every plan x every service fee is 0', () => {
  const fees = run({ NEXA_WALLET_MODE: 'sandbox', NODE_ENV: 'production' }, `
    const all = [];
    for (const p of Object.keys(s.PLANS)) for (const c of Object.keys(s.SERVICE_FEES)) all.push(s.feeMinor(p, c));
    out({ n: all.length, max: Math.max(...all) });
  `);
  assert.ok(fees.n >= 36);
  assert.equal(fees.max, 0);
});

test('not waived (development/sandbox): fee amounts are unchanged', () => {
  const fees = run({ NEXA_WALLET_MODE: 'sandbox', NODE_ENV: 'test' }, `
    out({ mk: s.feeMinor('free','marketplace_service'), yz: s.feeMinor('vip','yaayz_service'), kfree: s.feeMinor('free','kitchen_service'), kreg: s.feeMinor('regular','kitchen_service') });
  `);
  assert.deepEqual(fees, { mk: 10000, yz: 10000, kfree: 10000, kreg: 7500 });
});

test('waived checkout fee path (preview -> assert -> charge) is bundled and never touches the wallet', () => {
  // No wallet tables exist in this database: any wallet read or debit would throw "no such table".
  const r = run({ NEXA_WALLET_MODE: 'live', NODE_ENV: 'production' }, `
    const preview = s.feePreview(db, 'buyer1', 'marketplace_service', { amountMinor: 500000 });
    const asserted = s.assertFeePreview(db, 'buyer1', preview.previewId, 'marketplace_service', { amountMinor: 500000, currency: 'NGN' });
    const charge = s.chargeServiceFee(db, 'buyer1', 'marketplace_service', { idempotencyKey: 'marketplace:o1', withinTransaction: true, previewId: preview.previewId, actionAmountMinor: 500000, currency: 'NGN' });
    const kitchen = s.chargeServiceFee(db, 'buyer1', 'kitchen_service', { idempotencyKey: 'kitchen:o1', withinTransaction: true, previewId: 'unused', actionAmountMinor: 100000, currency: 'NGN' });
    const yaayz = s.chargeServiceFee(db, 'buyer1', 'yaayz_service', { idempotencyKey: 'yaayz:o1', withinTransaction: true, previewId: 'unused', actionAmountMinor: 100000, currency: 'NGN' });
    out({ previewFee: preview.fee.amount, assertedFee: asserted.fee.amount, charge, kitchenCharged: kitchen.charged, yaayzCharged: yaayz.charged });
  `);
  assert.equal(r.previewFee, 0);
  assert.equal(r.assertedFee, 0);
  assert.equal(r.charge.charged, false);
  assert.equal(r.charge.reason, 'bundled');
  assert.equal(r.kitchenCharged, false);
  assert.equal(r.yaayzCharged, false);
});

test('waived: a paid plan with an empty wallet is refused with a clear 503, nothing is created', () => {
  const r = run({ NEXA_WALLET_MODE: 'live', NODE_ENV: 'production' }, `
    let err = null;
    try { s.createSubscription(db, 'u1', 'regular'); } catch (e) { err = { status: e.status, code: e.code, message: e.message }; }
    const rows = db.prepare('SELECT COUNT(*) AS n FROM nexa_subscriptions').get().n;
    out({ err, rows });
  `, { walletTables: true });
  assert.equal(r.err.status, 503);
  assert.equal(r.err.code, 'plans_not_open');
  assert.match(r.err.message, /open together with Sky Wallet/);
  assert.equal(r.rows, 0);
});

test('waived: the free plan is still available', () => {
  const r = run({ NEXA_WALLET_MODE: 'live', NODE_ENV: 'production' }, `
    const sub = s.createSubscription(db, 'u1', 'free');
    out({ planId: sub.planId, status: sub.status });
  `, { walletTables: true });
  assert.deepEqual(r, { planId: 'free', status: 'active' });
});

test('waived: money credited before B145 still pays for a plan, and the charge is a normal ledger debit', () => {
  const r = run({ NEXA_WALLET_MODE: 'live', NODE_ENV: 'production' }, `
    db.prepare("INSERT INTO wallet_ledger_entries(id,transactionId,userId,amountMinor,currency,createdAt) VALUES('l1','t1','u1',200000,'NGN','2026-09-01T00:00:00.000Z')").run();
    const sub = s.createSubscription(db, 'u1', 'regular');
    const bal = db.prepare("SELECT COALESCE(SUM(amountMinor),0) AS n FROM wallet_ledger_entries WHERE userId='u1'").get().n;
    out({ planId: sub.planId, bal });
  `, { walletTables: true });
  assert.equal(r.planId, 'regular');
  assert.equal(r.bal, 200000 - 150000);
});

test('not waived: paid plan with an empty wallet keeps the original "Insufficient wallet balance" failure', () => {
  const r = run({ NEXA_WALLET_MODE: 'sandbox', NODE_ENV: 'test' }, `
    let msg = null, status = 'none';
    try { s.createSubscription(db, 'u1', 'regular'); } catch (e) { msg = e.message; status = e.status === undefined ? 'none' : e.status; }
    out({ msg, status });
  `, { walletTables: true });
  assert.match(r.msg, /Insufficient wallet balance/);
  assert.equal(r.status, 'none');
});

test('structure: subscription route maps 503, public view exposes feesWaived, checkout gate lets a zero fee through', () => {
  const subs = read('subscriptions.js');
  assert.match(subs, /e\.status===503\?503/);
  assert.match(subs, /feesWaived:serviceFeesWaived\(\)/);
  assert.match(subs, /if \(serviceFeesWaived\(\)\) return 0;/);
  const index = read('index.js');
  assert.match(index, /if \(feeMinor > balance\) return \{ ok: false/); // 0 > 0 is false: a zero fee never needs wallet money
});

test('structure: NEXA_FEES_WAIVED is documented in server/.env.example', () => {
  assert.match(read('.env.example'), /NEXA_FEES_WAIVED/);
});
