"use strict";
// B144 — pending wallet top-ups are re-checked with Paystack, credited once, and mismatches reach the attention report.
const test = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");
const pr = require("./paymentReconciler");
const topup = require("./walletTopup");
const wallet = require("./wallet");
const pa = require("./paymentAttention");

const NOW = new Date("2026-10-01T12:00:00.000Z");
const ago = (m) => new Date(NOW.getTime() - m * 60000).toISOString();

function makeDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE mall_payment_events (eventKey TEXT PRIMARY KEY, reference TEXT NOT NULL, eventType TEXT NOT NULL, receivedAt TEXT NOT NULL, outcome TEXT NOT NULL DEFAULT 'received', bodyHash TEXT);
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, name TEXT, username TEXT, accountStatus TEXT DEFAULT 'active');
    CREATE TABLE wallet_accounts (id TEXT PRIMARY KEY, userId TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'NGN', status TEXT NOT NULL DEFAULT 'active', providerStatus TEXT NOT NULL DEFAULT 'sandbox', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE wallet_transactions (id TEXT PRIMARY KEY, userId TEXT NOT NULL, type TEXT NOT NULL, direction TEXT NOT NULL, amountMinor INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'NGN', status TEXT NOT NULL, source TEXT NOT NULL, counterpartyUserId TEXT, reference TEXT NOT NULL, providerReference TEXT, idempotencyKey TEXT, description TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL, completedAt TEXT, metadata TEXT NOT NULL DEFAULT '{}');
    CREATE UNIQUE INDEX idx_wtx_idem ON wallet_transactions(userId,idempotencyKey) WHERE idempotencyKey IS NOT NULL;
    CREATE TABLE wallet_ledger_entries (id TEXT PRIMARY KEY, transactionId TEXT NOT NULL, userId TEXT NOT NULL, amountMinor INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'NGN', createdAt TEXT NOT NULL);
    INSERT INTO users(id,email) VALUES('u1','a@x.test');
  `);
  topup.ensureSchema(db);
  return db;
}
function pending(db, amountMinor, ageMinutes) {
  const row = topup.createTopup(db, "u1", amountMinor);
  const at = ago(ageMinutes);
  db.prepare("UPDATE wallet_topups SET createdAt=?,updatedAt=? WHERE id=?").run(at, at, row.id);
  return row;
}
const paid = (row, over = {}) => ({ status: "success", reference: row.reference, currency: "NGN", amount: row.amountMinor, ...over });
const deps = (answers, pushes = []) => ({
  verify: async (ref) => { const a = answers[ref]; if (a instanceof Error) throw a; return a || { status: "abandoned", reference: ref }; },
  settleTopup: topup.settleTopup,
  sendPush: (...a) => { pushes.push(a); },
});

test("a paid but unconfirmed top-up is credited once, even across repeated ticks", async () => {
  const db = makeDb(); const t = pending(db, 500000, 30);
  const pushes = []; const d = deps({ [t.reference]: paid(t) }, pushes);
  const first = await pr.reconcileTopups(db, d, { now: NOW });
  assert.equal(first.confirmed, 1);
  assert.equal(wallet.balanceMinor(db, "u1"), 500000);
  await pr.reconcileTopups(db, d, { now: new Date(NOW.getTime() + 3600000) });
  assert.equal(wallet.balanceMinor(db, "u1"), 500000);
  assert.equal(pushes.length, 1);
});

test("a wrong amount is never credited and is listed in the attention report", async () => {
  const db = makeDb(); const t = pending(db, 500000, 30);
  const s = await pr.reconcileTopups(db, deps({ [t.reference]: paid(t, { amount: 100 }) }), { now: NOW });
  assert.equal(s.flagged, 1);
  assert.equal(wallet.balanceMinor(db, "u1"), 0);
  const report = pa.attentionReport(db, { now: NOW });
  assert.equal(report.counts.amount_or_status_mismatch, 1);
  // flagged references are not re-checked
  const again = await pr.reconcileTopups(db, deps({ [t.reference]: paid(t) }), { now: new Date(NOW.getTime() + 3600000) });
  assert.equal(again.checked, 0);
});

test("top-ups that are too new, too old, or unpaid are left alone or backed off", async () => {
  const db = makeDb();
  const fresh = pending(db, 200000, 5); const old = pending(db, 200000, 60 * 60);
  const unpaid = pending(db, 200000, 30);
  const calls = []; const d = { ...deps({}), verify: async (r) => { calls.push(r); return { status: "abandoned", reference: r }; } };
  const s = await pr.reconcileTopups(db, d, { now: NOW });
  assert.deepEqual(calls, [unpaid.reference]);
  assert.equal(s.waiting, 1);
  const soon = await pr.reconcileTopups(db, d, { now: new Date(NOW.getTime() + 5 * 60000) });
  assert.equal(soon.checked, 0);
  assert.equal(wallet.balanceMinor(db, "u1"), 0);
  assert.ok(fresh && old);
});

test("provider errors do not use up an attempt and stop the run after three in a row", async () => {
  const db = makeDb(); const refs = [1, 2, 3, 4].map(() => pending(db, 200000, 30));
  const errs = Object.fromEntries(refs.map((r) => [r.reference, new Error("down")]));
  const s = await pr.reconcileTopups(db, deps(errs), { now: NOW });
  assert.equal(s.providerErrors, 3); assert.equal(s.stoppedEarly, true);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM mall_payment_events").get().n, 0);
});

test("the live job is wired to run the top-up pass", () => {
  const src = require("fs").readFileSync(require("path").join(__dirname, "index.js"), "utf8");
  assert.match(src, /reconcileTopups\(db, reconcilerDeps\)/);
  assert.match(src, /settleTopup: \(\.\.\.args\)/);
});
