"use strict";
// B144 — Wallet top-up through Paystack, in-app funds only. Over real HTTP; no call leaves the machine
// (top-ups are seeded in the database and confirmed through the signed webhook, as Paystack would).
const test = require("node:test");
const assert = require("node:assert/strict");
const { startServer } = require("./httpTestHarness");

let srv, U, V, db;
test.before(async () => {
  srv = await startServer({ PAYMENTS_ENABLED: "true" });
  U = await srv.signup("topup"); V = await srv.signup("other"); db = srv.openDb();
});
test.after(async () => { try { db && db.close(); } catch (_) {} if (srv) await srv.stop(); });
const now = () => new Date().toISOString();
function seedTopup(userId, reference, amountMinor) {
  const t = now();
  db.prepare("INSERT INTO wallet_topups(id,userId,reference,amountMinor,currency,status,createdAt,updatedAt) VALUES(?,?,?,?,?,'pending',?,?)").run(`wtu_${reference}`, userId, reference, amountMinor, "NGN", t, t);
}
const charge = (id, reference, amount, extra = {}) => ({ event: "charge.success", data: { id, reference, status: "success", currency: "NGN", amount, ...extra } });
const balance = async (token) => (await srv.request("GET", "/api/wallet", { token })).json.balance.amount;

test("B145: the Paystack top-up routes no longer exist, so no new top-up can be created", async () => {
  for (const [m, p] of [["POST", "/api/wallet/topup/initialize"], ["POST", "/api/wallet/topup/verify"], ["POST", "/api/wallet/topup/recheck"], ["GET", "/api/wallet/topups"]]) {
    const r = await srv.request(m, p, { token: U.token, body: m === "POST" ? { amount: 5000 } : undefined });
    assert.equal(r.status, 404, `${m} ${p} should be gone, got ${r.status}`);
  }
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM wallet_topups WHERE userId=?").get(U.userId).n, 0);
});

test("a confirmed payment credits the wallet exactly once, even when Paystack retries", async () => {
  seedTopup(U.userId, "wallet-topup-ok", 500000);
  assert.equal(await balance(U.token), 0);
  assert.equal((await srv.postWebhook(charge(7001, "wallet-topup-ok", 500000))).status, 200);
  assert.equal(await balance(U.token), 5000);
  // same event again, and a different event id for the same reference
  assert.equal((await srv.postWebhook(charge(7001, "wallet-topup-ok", 500000))).status, 200);
  assert.equal((await srv.postWebhook(charge(7002, "wallet-topup-ok", 500000))).status, 200);
  assert.equal(await balance(U.token), 5000, "retries must not credit twice");
  const tx = db.prepare("SELECT * FROM wallet_transactions WHERE userId=? AND reference=?").all(U.userId, "wallet-topup-ok");
  assert.equal(tx.length, 1);
  assert.equal(tx[0].source, "paystack");
  assert.equal(tx[0].status, "completed");
  assert.equal(db.prepare("SELECT status FROM wallet_topups WHERE reference=?").get("wallet-topup-ok").status, "completed");
});

test("a wrong amount, wrong currency or failed charge never credits the wallet", async () => {
  seedTopup(V.userId, "wallet-topup-bad", 300000);
  await srv.postWebhook(charge(7010, "wallet-topup-bad", 100));
  await srv.postWebhook(charge(7011, "wallet-topup-bad", 300000, { currency: "USD" }));
  await srv.postWebhook(charge(7012, "wallet-topup-bad", 300000, { status: "failed" }));
  assert.equal(await balance(V.token), 0);
  assert.equal(db.prepare("SELECT status FROM wallet_topups WHERE reference=?").get("wallet-topup-bad").status, "pending");
});

test("an unsigned webhook cannot credit a wallet", async () => {
  seedTopup(V.userId, "wallet-topup-unsigned", 200000);
  const r = await srv.postWebhook(charge(7020, "wallet-topup-unsigned", 200000), { signature: "deadbeef" });
  assert.equal(r.status, 401);
  assert.equal(await balance(V.token), 0);
});

test("a top-up paid before B145 stays credited to its owner only", async () => {
  assert.equal(await balance(U.token), 5000);
  assert.equal(await balance(V.token), 0);
});

test("Paystack-funded money cannot be withdrawn", async () => {
  const fp = await srv.request("GET", "/api/subscription/fee-preview?serviceCode=wallet_withdrawal&amount=1000&currency=NGN", { token: U.token });
  assert.equal(fp.status, 200, `fee preview failed: ${fp.text}`);
  const w = await srv.request("POST", "/api/wallet/withdraw", { token: U.token, body: { amount: 1000, idempotencyKey: "wd-topup-1", feePreviewId: fp.json.preview.previewId } });
  assert.equal(w.status, 409, `withdrawal of in-app funds must be refused: ${w.status} ${w.text}`);
  assert.match(w.json.error, /in-app use/);
  assert.equal(await balance(U.token), 5000);
});

test("the in-app-only restriction travels with a transfer: the friend cannot withdraw it either", async () => {
  // U holds 5000 of Paystack-funded money. Make V a friend (both directions) and send 2000.
  const t = now();
  db.prepare("INSERT OR IGNORE INTO friendships(userId,friendId,createdAt) VALUES(?,?,?)").run(U.userId, V.userId, t);
  db.prepare("INSERT OR IGNORE INTO friendships(userId,friendId,createdAt) VALUES(?,?,?)").run(V.userId, U.userId, t);
  const fp = await srv.request("GET", "/api/subscription/fee-preview?serviceCode=wallet_transfer&amount=2000&currency=NGN", { token: U.token });
  assert.equal(fp.status, 200, fp.text);
  const sent = await srv.request("POST", "/api/wallet/send", { token: U.token, body: { recipientUserId: V.userId, amount: 2000, idempotencyKey: "send-restricted-1", feePreviewId: fp.json.preview.previewId } });
  assert.ok([200, 201].includes(sent.status), `send failed: ${sent.status} ${sent.text}`);
  const fp2 = await srv.request("GET", "/api/subscription/fee-preview?serviceCode=wallet_withdrawal&amount=500&currency=NGN", { token: V.token });
  const w = await srv.request("POST", "/api/wallet/withdraw", { token: V.token, body: { amount: 500, idempotencyKey: "wd-friend-1", feePreviewId: fp2.json.preview.previewId } });
  assert.equal(w.status, 409, `friend withdrew in-app money: ${w.status} ${w.text}`);
});
