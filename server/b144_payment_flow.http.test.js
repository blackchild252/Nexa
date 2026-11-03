"use strict";
// B144 / M1840-44 — payment webhook behaviour over real HTTP.
const test = require("node:test");
const assert = require("node:assert/strict");
const { startServer } = require("./httpTestHarness");

let srv, U, db;
test.before(async () => { srv = await startServer(); U = await srv.signup("payer"); db = srv.openDb(); });
test.after(async () => { try { db && db.close(); } catch (_) {} if (srv) await srv.stop(); });
const now = () => new Date().toISOString();
const events = (ref) => db.prepare("SELECT * FROM mall_payment_events WHERE reference=?").all(ref);

test("webhook rejects missing, wrong and body-mismatched signatures", async () => {
  const ev = { event: "charge.success", data: { id: 9001, reference: "NO-SIG" } };
  assert.equal((await srv.postWebhook(ev, { signature: "" })).status, 401);
  assert.equal((await srv.postWebhook(ev, { secret: "some-other-secret" })).status, 401);
  const raw = JSON.stringify(ev);
  const sigOfOther = srv.signWebhook(JSON.stringify({ ...ev, data: { ...ev.data, reference: "OTHER" } }));
  assert.equal((await srv.request("POST", "/api/payments/paystack/webhook", { rawBody: raw, headers: { "x-paystack-signature": sigOfOther } })).status, 401);
  assert.equal(events("NO-SIG").length, 0, "unsigned events must not be recorded");
});

test("webhook retries of the same event are acknowledged once and recorded once", async () => {
  const ev = { event: "charge.failed", data: { id: 9002, reference: "RETRY-1" } };
  assert.equal((await srv.postWebhook(ev)).status, 200);
  assert.equal((await srv.postWebhook(ev)).status, 200);
  assert.equal((await srv.postWebhook(ev)).status, 200);
  const rows = events("RETRY-1");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].outcome, "ignored");
});

test("kitchen: a charge.success with the wrong amount never marks the order paid, and retries stay final", async () => {
  const t = now();
  db.prepare("INSERT INTO kitchen_orders(id,userId,items,total,currency,status,paymentRef,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?)").run("ko-pay-1", U.userId, "[]", 5000, "NGN", "pending_payment", "KIT-REF-1", t, t);
  const ev = { event: "charge.success", data: { id: 9003, reference: "KIT-REF-1", status: "success", currency: "NGN", amount: 100 } };
  assert.equal((await srv.postWebhook(ev)).status, 200);
  assert.equal((await srv.postWebhook(ev)).status, 200);
  const order = db.prepare("SELECT status,providerVerified FROM kitchen_orders WHERE id=?").get("ko-pay-1");
  assert.equal(order.status, "pending_payment");
  assert.equal(order.providerVerified, 0);
  const rows = events("KIT-REF-1");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].outcome, "kitchen_mismatch");
});

test("kitchen: a cancelled order is not revived by a late charge.success", async () => {
  const t = now();
  db.prepare("INSERT INTO kitchen_orders(id,userId,items,total,currency,status,paymentRef,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?)").run("ko-pay-2", U.userId, "[]", 5000, "NGN", "cancelled", "KIT-REF-2", t, t);
  const r = await srv.postWebhook({ event: "charge.success", data: { id: 9004, reference: "KIT-REF-2", status: "success", currency: "NGN", amount: 500000 } });
  assert.equal(r.status, 200);
  assert.equal(db.prepare("SELECT status FROM kitchen_orders WHERE id=?").get("ko-pay-2").status, "cancelled");
  assert.equal(events("KIT-REF-2")[0].outcome, "cancelled_kitchen_order");
});

test("an event stuck at 'received' (handler died) is processed again on retry", async () => {
  const t = now();
  db.prepare("INSERT INTO kitchen_orders(id,userId,items,total,currency,status,paymentRef,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?)").run("ko-pay-3", U.userId, "[]", 5000, "NGN", "pending_payment", "KIT-REF-3", t, t);
  db.prepare("INSERT INTO mall_payment_events(eventKey,reference,eventType,receivedAt,outcome) VALUES(?,?,?,?,?)").run("9005", "KIT-REF-3", "charge.success", t, "received");
  const r = await srv.postWebhook({ event: "charge.success", data: { id: 9005, reference: "KIT-REF-3", status: "success", currency: "NGN", amount: 100 } });
  assert.equal(r.status, 200);
  assert.equal(events("KIT-REF-3")[0].outcome, "kitchen_mismatch", "retryable 'received' event must be re-evaluated, not skipped");
});

test("yaayz: a cancelled ticket order is not revived by a late charge.success", async () => {
  const t = now();
  db.prepare("INSERT INTO yaayz_ticket_listings(id,sellerId,title,price,currency,quantity,active,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?)").run("tkt-pay", U.userId, "Show", 2000, "NGN", 5, 1, t, t);
  db.prepare("INSERT INTO yaayz_ticket_orders(id,ticketId,buyerId,quantity,total,currency,status,paymentRef,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?)").run("yo-pay-1", "tkt-pay", U.userId, 1, 2000, "NGN", "cancelled", "YZ-REF-1", t, t);
  const r = await srv.postWebhook({ event: "charge.success", data: { id: 9006, reference: "YZ-REF-1", status: "success", currency: "NGN", amount: 200000 } });
  assert.equal(r.status, 200);
  assert.equal(db.prepare("SELECT status FROM yaayz_ticket_orders WHERE id=?").get("yo-pay-1").status, "cancelled");
  assert.equal(events("YZ-REF-1")[0].outcome, "cancelled_ticket_order");
});

test("payment verify route requires login and never confirms another buyer's order", async () => {
  const anon = await srv.request("POST", "/api/yaayz/payments/verify", { body: { reference: "YZ-REF-1" } });
  assert.equal(anon.status, 401);
  const other = await srv.signup("stranger");
  const r = await srv.request("POST", "/api/yaayz/payments/verify", { token: other.token, body: { reference: "YZ-REF-1" } });
  assert.ok(r.status >= 400, `stranger verified someone else's payment: ${r.status} ${r.text}`);
  assert.equal(db.prepare("SELECT status FROM yaayz_ticket_orders WHERE id=?").get("yo-pay-1").status, "cancelled");
});
