"use strict";
// B144 — wallet hardening: exact amounts, honest idempotency, held funds, correct in-app-only maths, fee rows in
// history, and no top-up lock-out after a Paystack outage. Real wallet code against a real SQLite database.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const wallet = require("./wallet");
const topup = require("./walletTopup");
const subs = require("./subscriptions");
const payments = require("./payments");

function makeDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, name TEXT, username TEXT, accountStatus TEXT DEFAULT 'active');
    CREATE TABLE friendships (userId TEXT NOT NULL, friendId TEXT NOT NULL);
    CREATE TABLE wallet_accounts (id TEXT PRIMARY KEY, userId TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'NGN', status TEXT NOT NULL DEFAULT 'active', providerStatus TEXT NOT NULL DEFAULT 'sandbox', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE wallet_transactions (id TEXT PRIMARY KEY, userId TEXT NOT NULL, type TEXT NOT NULL CHECK (type IN ('deposit','withdrawal','transfer')), direction TEXT NOT NULL, amountMinor INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'NGN', status TEXT NOT NULL, source TEXT NOT NULL, counterpartyUserId TEXT, reference TEXT NOT NULL, providerReference TEXT, idempotencyKey TEXT, description TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL, completedAt TEXT, metadata TEXT NOT NULL DEFAULT '{}');
    CREATE UNIQUE INDEX idx_wtx_idem ON wallet_transactions(userId,idempotencyKey) WHERE idempotencyKey IS NOT NULL;
    CREATE TABLE wallet_ledger_entries (id TEXT PRIMARY KEY, transactionId TEXT NOT NULL, userId TEXT NOT NULL, amountMinor INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'NGN', createdAt TEXT NOT NULL);
    INSERT INTO users(id,email,name) VALUES('u1','a@x.test','Ada'),('u2','b@x.test','Bayo');
    INSERT INTO friendships(userId,friendId) VALUES('u1','u2'),('u2','u1');
  `);
  subs.ensureSchema(db);
  topup.ensureSchema(db);
  return db;
}
function fund(db, userId, amountMinor) { // a settled Paystack top-up (restricted, in-app only)
  const t = topup.createTopup(db, userId, amountMinor);
  topup.settleTopup(db, t.reference, { status: "success", reference: t.reference, currency: "NGN", amount: amountMinor });
}
function sandboxMoney(db, userId, naira, key) { return wallet.deposit(db, userId, { amount: naira, idempotencyKey: key }); }
function preview(db, userId, code, amount) { return subs.feePreview(db, userId, code, { amountMinor: Math.round(amount * 100) }).previewId; }

test("amounts with more than two decimal places are rejected, not rounded", () => {
  for (const bad of ["10.005", "0.294", 1.005, "19.999"]) assert.throws(() => wallet.toMinor(bad), /2 decimal places/);
  for (const bad of ["100.001", 250.555]) assert.throws(() => topup.parseAmountMinor(bad), /2 decimal places/);
  assert.equal(wallet.toMinor("10.50"), 1050); assert.equal(wallet.toMinor(1.1), 110); assert.equal(wallet.toMinor(0.07), 7);
  assert.equal(topup.parseAmountMinor("1234.56"), 123456);
});

test("the same idempotency key replays the same request, but a different request is refused", () => {
  const db = makeDb();
  const a = sandboxMoney(db, "u1", 100, "k1");
  const b = sandboxMoney(db, "u1", 100, "k1");
  assert.equal(b.idempotent, true); assert.equal(b.transaction.id, a.transaction.id);
  assert.equal(wallet.balanceMinor(db, "u1"), 10000);
  assert.throws(() => sandboxMoney(db, "u1", 5000, "k1"), (e) => e.status === 409 && /different request/.test(e.message));
  assert.equal(wallet.balanceMinor(db, "u1"), 10000);
});

test("a retried send with the same key moves the money once", () => {
  const db = makeDb(); sandboxMoney(db, "u1", 1000, "seed");
  const pid = preview(db, "u1", "wallet_transfer", 200);
  const first = wallet.send(db, "u1", { recipientUserId: "u2", amount: 200, idempotencyKey: "send-1", feePreviewId: pid });
  const retry = wallet.send(db, "u1", { recipientUserId: "u2", amount: 200, idempotencyKey: "send-1", feePreviewId: pid });
  assert.equal(retry.idempotent, true); assert.equal(retry.transaction.id, first.transaction.id);
  assert.equal(wallet.balanceMinor(db, "u2"), 20000);
  assert.equal(wallet.balanceMinor(db, "u1"), 100000 - 20000 - 10000);
  const other = preview(db, "u1", "wallet_transfer", 300);
  assert.throws(() => wallet.send(db, "u1", { recipientUserId: "u2", amount: 300, idempotencyKey: "send-1", feePreviewId: other }), (e) => e.status === 409);
});

test("pending withdrawals hold their funds so the same money cannot be spent twice", () => {
  const db = makeDb(); sandboxMoney(db, "u1", 1000, "seed");
  const pending = (n) => db.transaction(() => wallet.recordProviderTransaction(db, { userId: "u1", type: "withdrawal", direction: "debit", amountMinor: 60000, currency: "NGN", source: "bank", reference: "WD" + n, description: "w" }, { status: "pending" }))();
  pending(1);
  assert.equal(wallet.balanceMinor(db, "u1"), 100000);
  assert.equal(wallet.availableMinor(db, "u1"), 40000);
  assert.equal(topup.withdrawableMinor(db, "u1"), 40000);
  const pid = preview(db, "u1", "wallet_transfer", 500);
  assert.throws(() => wallet.send(db, "u1", { recipientUserId: "u2", amount: 500, idempotencyKey: "s", feePreviewId: pid }), /Insufficient/);
  const pid2 = preview(db, "u1", "wallet_transfer", 300);
  assert.doesNotThrow(() => wallet.send(db, "u1", { recipientUserId: "u2", amount: 300, idempotencyKey: "s2", feePreviewId: pid2 }));
});

test("spending a top-up frees later unrestricted money for withdrawal", () => {
  const db = makeDb(); fund(db, "u1", 100000);
  assert.equal(topup.withdrawableMinor(db, "u1"), 0);
  // NEXA charges spend restricted money first
  db.prepare("INSERT INTO wallet_ledger_entries(id,transactionId,userId,amountMinor,currency,createdAt) VALUES('f1','charge1','u1',-30000,'NGN','2999-01-01T00:00:00.000Z')").run();
  assert.equal(topup.inAppOnlyMinor(db, "u1"), 70000);
  sandboxMoney(db, "u1", 500, "later");
  assert.equal(wallet.balanceMinor(db, "u1"), 120000);
  assert.equal(topup.inAppOnlyMinor(db, "u1"), 70000);
  assert.equal(topup.withdrawableMinor(db, "u1"), 50000);
  db.prepare("INSERT INTO wallet_ledger_entries(id,transactionId,userId,amountMinor,currency,createdAt) VALUES('f2','charge2','u1',-70000,'NGN','2999-01-02T00:00:00.000Z')").run();
  assert.equal(topup.inAppOnlyMinor(db, "u1"), 0);
});

test("the in-app-only part still travels with a transfer and is not withdrawable by the friend", () => {
  const db = makeDb(); fund(db, "u1", 100000);
  const pid = preview(db, "u1", "wallet_transfer", 400);
  wallet.send(db, "u1", { recipientUserId: "u2", amount: 400, idempotencyKey: "r1", feePreviewId: pid });
  assert.equal(topup.inAppOnlyMinor(db, "u2"), 40000);
  assert.equal(topup.withdrawableMinor(db, "u2"), 0);
  assert.equal(topup.inAppOnlyMinor(db, "u1"), 50000);      // 1000 - 100 fee - 400 sent
  sandboxMoney(db, "u2", 50, "u2-own");
  assert.equal(topup.withdrawableMinor(db, "u2"), 5000);
});

test("NEXA fee charges show up in wallet history and pagination keeps working", () => {
  const db = makeDb(); sandboxMoney(db, "u1", 1000, "seed");
  for (let i = 0; i < 3; i++) {
    const pid = preview(db, "u1", "wallet_transfer", 10 + i);
    wallet.send(db, "u1", { recipientUserId: "u2", amount: 10 + i, idempotencyKey: "h" + i, feePreviewId: pid });
  }
  const all = wallet.historyPage(db, "u1", { limit: 100 }).transactions;
  const fees = all.filter((t) => t.type === "fee");
  assert.equal(fees.length, 3);
  assert.ok(fees.every((t) => t.direction === "debit" && t.amount === 100 && t.status === "completed"));
  const signed = all.reduce((n, t) => n + (t.direction === "credit" ? t.amount : -t.amount), 0);
  assert.equal(Math.round(signed * 100), wallet.balanceMinor(db, "u1"), "history rows add up to the balance");
  let cursor = null, seen = [];
  do { const p = wallet.historyPage(db, "u1", { limit: 3, cursor }); seen.push(...p.transactions.map((t) => t.id)); cursor = p.nextCursor; } while (cursor);
  assert.equal(seen.length, all.length); assert.equal(new Set(seen).size, seen.length);
  assert.equal(wallet.summary(db, "u1").transactions.filter((t) => t.type === "fee").length, 3);
});

test("Paystack top-ups are not offered provider reconciliation", () => {
  const db = makeDb(); fund(db, "u1", 100000);
  const tx = db.prepare("SELECT id FROM wallet_transactions WHERE userId='u1' AND source='paystack'").get();
  const r = wallet.reconcileProviderStatus(db, "u1", tx.id);
  assert.equal(r.reconciliation.applicable, false); assert.equal(r.reconciliation.reason, "paystack_topup");
  assert.equal(wallet.providerTransactionStatus(db, "u1", tx.id).provider.source, "paystack");
});

test("a Paystack outage does not leave pending top-ups that lock the user out", async () => {
  const db = makeDb();
  const routes = {}; const app = { post: (p, ...h) => { routes[p] = h[h.length - 1]; }, get: () => {} };
  topup.register({ app, auth: { authMiddleware: (r, s, n) => n() }, db, rateLimit: null });
  const saved = { init: payments.initialize, enabled: payments.isEnabled, key: process.env.PAYSTACK_SECRET_KEY, mode: process.env.PAYMENT_MODE };
  process.env.PAYSTACK_SECRET_KEY = "sk_test_x"; process.env.PAYMENT_MODE = "live";
  payments.isEnabled = () => true; payments.initialize = async () => { throw new Error("paystack down"); };
  try {
    const call = async (body) => { const out = {}; await routes["/api/wallet/topup/initialize"]({ user: { id: "u1", email: "a@x.test" }, body }, { status(c) { out.status = c; return this; }, json(j) { out.json = j; return this; } }); return out; };
    for (let i = 0; i < 7; i++) { const r = await call({ amount: 1000 }); assert.equal(r.status, 502, "attempt " + i); }
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM wallet_topups WHERE status='pending'").get().n, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM wallet_topups WHERE status='failed'").get().n, 7);
    payments.initialize = async () => ({ authorization_url: "https://checkout.paystack.test/x" });
    const ok = await call({ amount: 1000 }); assert.equal(ok.status, 201);
  } finally { payments.initialize = saved.init; payments.isEnabled = saved.enabled; process.env.PAYSTACK_SECRET_KEY = saved.key || ""; process.env.PAYMENT_MODE = saved.mode || ""; if (!saved.key) delete process.env.PAYSTACK_SECRET_KEY; if (!saved.mode) delete process.env.PAYMENT_MODE; }
});

test("the Wallet screen reuses one key per attempt and hides provider buttons on top-ups", () => {
  const ui = fs.readFileSync(path.join(__dirname, "../src/Wallet.tsx"), "utf8");
  assert.match(ui, /attemptKey\.current\.key/);
  assert.match(ui, /attemptKey\.current = null/);
  assert.doesNotMatch(ui, /idempotencyKey:`wallet-\$\{action\}-\$\{Date\.now\(\)\}/);
  assert.match(ui, /x\.source !== "internal" && x\.source !== "paystack"/);
});
