"use strict";
// B144 / M1835-39 — ownership tests for money routes, run over real HTTP.
// Rule under test: user A must not be able to read or change user B's money data.
const test = require("node:test");
const assert = require("node:assert/strict");
const { startServer } = require("./httpTestHarness");

let srv, A, B, db;
test.before(async () => {
  srv = await startServer();
  A = await srv.signup("alice"); B = await srv.signup("bob");
  db = srv.openDb();
});
test.after(async () => { try { db && db.close(); } catch (_) {} if (srv) await srv.stop(); });

const now = () => new Date().toISOString();

test("money routes reject unauthenticated callers", async () => {
  for (const [m, p] of [["GET", "/api/wallet"], ["POST", "/api/wallet/deposit"], ["POST", "/api/wallet/withdraw"], ["POST", "/api/wallet/send"],
    ["GET", "/api/mall/orders"], ["GET", "/api/yaayz/orders"], ["GET", "/api/leisure/kitchen/orders"]]) {
    const r = await srv.request(m, p, { body: m === "POST" ? {} : undefined });
    assert.equal(r.status, 401, `${m} ${p} must require login (got ${r.status})`);
  }
});

test("wallet: a transaction belongs to its owner only", async () => {
  const dep = await srv.request("POST", "/api/wallet/deposit", { token: A.token, body: { amount: 5000, idempotencyKey: "own-a-1" } });
  assert.ok([200, 201].includes(dep.status), `deposit failed: ${dep.text}`);
  const txId = dep.json.transaction.id;
  // B cannot reconcile or read provider status for A's transaction
  const rec = await srv.request("POST", `/api/wallet/transactions/${txId}/reconcile`, { token: B.token, body: {} });
  assert.ok([404, 409].includes(rec.status) && rec.status !== 200, `B reconciled A's tx: ${rec.status} ${rec.text}`);
  const ps = await srv.request("POST", `/api/wallet/transactions/${txId}/provider-status`, { token: B.token, body: {} });
  assert.ok([404, 409].includes(ps.status), `B read A's provider status: ${ps.status} ${ps.text}`);
  // B's history never lists A's transaction
  const hist = await srv.request("GET", "/api/wallet/transactions", { token: B.token });
  assert.equal(hist.status, 200);
  assert.ok(!hist.json.transactions.some((t) => t.id === txId), "B history leaked A's transaction");
  // A still sees it
  const own = await srv.request("GET", "/api/wallet/transactions", { token: A.token });
  assert.ok(own.json.transactions.some((t) => t.id === txId));
});

test("wallet: B cannot spend A's balance", async () => {
  const w = await srv.request("POST", "/api/wallet/withdraw", { token: B.token, body: { amount: 1000, idempotencyKey: "own-b-wd" } });
  assert.notEqual(w.status, 201, `B withdrew from an empty wallet: ${w.text}`);
  assert.equal(w.status, 409);
  const s = await srv.request("POST", "/api/wallet/send", { token: B.token, body: { recipientUserId: A.userId, amount: 1000, idempotencyKey: "own-b-send" } });
  assert.ok(s.status >= 400, `B sent money it does not have: ${s.status} ${s.text}`);
});

test("wallet: idempotency keys are scoped per user", async () => {
  const a = await srv.request("POST", "/api/wallet/deposit", { token: A.token, body: { amount: 700, idempotencyKey: "shared-key" } });
  const b = await srv.request("POST", "/api/wallet/deposit", { token: B.token, body: { amount: 900, idempotencyKey: "shared-key" } });
  assert.ok([200, 201].includes(a.status) && [200, 201].includes(b.status));
  assert.notEqual(a.json.transaction.id, b.json.transaction.id, "same key must not return another user's transaction");
  assert.equal(b.json.idempotent, false);
});

test("mall orders: B cannot see or cancel A's order", async () => {
  db.prepare("INSERT INTO mall_orders(id,userId,total,currency,status,createdAt) VALUES(?,?,?,?,?,?)").run("ord-owned-by-a", A.userId, 3000, "NGN", "placed", now());
  const list = await srv.request("GET", "/api/mall/orders", { token: B.token });
  assert.equal(list.status, 200);
  assert.ok(!list.json.orders.some((o) => o.id === "ord-owned-by-a"), "B order list leaked A's order");
  const cancel = await srv.request("POST", "/api/mall/orders/ord-owned-by-a/cancel", { token: B.token, body: {} });
  assert.equal(cancel.status, 404);
  assert.equal(db.prepare("SELECT status FROM mall_orders WHERE id=?").get("ord-owned-by-a").status, "placed");
});

test("yaayz orders: B cannot see A's ticket order", async () => {
  const t = now();
  db.prepare("INSERT INTO yaayz_ticket_listings(id,sellerId,title,price,currency,quantity,active,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?)").run("tkt-1", B.userId, "Own test show", 2000, "NGN", 10, 1, t, t);
  db.prepare("INSERT INTO yaayz_ticket_orders(id,ticketId,buyerId,quantity,total,currency,status,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?)").run("yo-a-1", "tkt-1", A.userId, 1, 2000, "NGN", "pending_payment", t, t);
  const mine = await srv.request("GET", "/api/yaayz/orders", { token: A.token });
  assert.ok(mine.json.orders.some((o) => o.id === "yo-a-1"));
  const theirs = await srv.request("GET", "/api/yaayz/orders", { token: B.token });
  assert.ok(!theirs.json.orders.some((o) => o.id === "yo-a-1"), "buyer list leaked another buyer's order (the seller is not the buyer)");
  const fee = await srv.request("POST", "/api/yaayz/orders/yo-a-1/fee-retry", { token: B.token, body: {} });
  assert.ok([403, 404, 409].includes(fee.status), `B ran fee-retry on A's order: ${fee.status} ${fee.text}`);
});

test("kitchen orders: B cannot list or read A's order or receipt", async () => {
  const t = now();
  db.prepare("INSERT INTO kitchen_orders(id,userId,items,total,currency,status,receiptImage,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?)").run("ko-a-1", A.userId, "[]", 4000, "NGN", "paid", "data:image/png;base64,AAAA", t, t);
  const list = await srv.request("GET", "/api/leisure/kitchen/orders", { token: B.token });
  assert.ok(!list.json.orders.some((o) => o.id === "ko-a-1"), "kitchen list leaked A's order");
  const data = await srv.request("GET", "/api/leisure/kitchen/orders/ko-a-1/receipt-data", { token: B.token });
  assert.equal(data.status, 404);
  const img = await srv.request("GET", "/api/leisure/kitchen/orders/ko-a-1/receipt", { token: B.token });
  assert.equal(img.status, 404);
  const retry = await srv.request("POST", "/api/leisure/kitchen/orders/ko-a-1/fee-retry", { token: B.token, body: {} });
  assert.ok([403, 404, 409].includes(retry.status), `B ran fee-retry on A's kitchen order: ${retry.status}`);
  const own = await srv.request("GET", "/api/leisure/kitchen/orders/ko-a-1/receipt-data", { token: A.token });
  assert.equal(own.status, 200);
});
