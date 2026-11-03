"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const vs = require("./vendorSubscriptions");

function dbFixture() {
  const raw = new DatabaseSync(":memory:");
  const db = {
    exec: (sql) => raw.exec(sql),
    prepare: (sql) => raw.prepare(sql),
    transaction: (fn) => () => { raw.exec("BEGIN IMMEDIATE"); try { const out = fn(); raw.exec("COMMIT"); return out; } catch (e) { raw.exec("ROLLBACK"); throw e; } },
  };
  db.exec(`CREATE TABLE vendors(id TEXT PRIMARY KEY,userId TEXT UNIQUE NOT NULL,shopName TEXT NOT NULL,bio TEXT,createdAt TEXT NOT NULL);`);
  vs.ensureSchema(db);
  return db;
}

function user(id) { return { id, shopName: `Shop ${id}`, bio: "Vendor" }; }

const base = new Date("2026-01-01T00:00:00.000Z");

test("first 10 vendors receive exactly one FREE_LAUNCH period and #11 does not", () => {
  const db = dbFixture();
  for (let i = 1; i <= 10; i++) {
    const r = vs.createFreeVendor(db, { userId: `u${i}`, ...user(i), now: base });
    assert.equal(r.allocated, true);
    assert.equal(r.slot, i);
  }
  assert.equal(vs.countFreeSlots(db), 10);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM vendor_subscription_periods WHERE type='FREE_LAUNCH'").get().n, 10);
  const eleventh = vs.createFreeVendor(db, { userId: "u11", ...user(11), now: base });
  assert.equal(eleventh.freeAvailable, false);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM vendor_launch_allocations").get().n, 10);
});

test("existing vendor cannot claim another free slot", () => {
  const db = dbFixture();
  const first = vs.createFreeVendor(db, { userId: "u1", ...user(1), now: base });
  const again = vs.createFreeVendor(db, { userId: "u1", ...user(1), now: base });
  assert.equal(again.existing, true);
  assert.equal(vs.countFreeSlots(db), 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM vendor_subscription_periods WHERE vendorId=?").get(first.vendorId).n, 1);
});

test("server-defined payment amount and currency are enforced", () => {
  assert.equal(vs.assertServerAmount({status:"success",reference:"ref",currency:"NGN",amount:3000000},3000000,"ref"),true);
  assert.equal(vs.assertServerAmount({status:"success",reference:"ref",currency:"NGN",amount:2999999},3000000,"ref"),false);
  assert.equal(vs.assertServerAmount({status:"success",reference:"ref",currency:"USD",amount:3000000},3000000,"ref"),false);
  assert.equal(vs.assertServerAmount({status:"failed",reference:"ref",currency:"NGN",amount:3000000},3000000,"ref"),false);
});

test("verified paid entry activates once and duplicate verification is idempotent", () => {
  const db = dbFixture();
  const pending = vs.createPendingVendor(db, { userId:"u11", ...user(11), kind:vs.PERIOD_TYPES.PAID_ENTRY, now:base });
  const payment = db.prepare("SELECT * FROM vendor_subscription_payments WHERE id=?").get(pending.paymentId);
  const activated = vs.activateVerifiedPayment(db, payment, base);
  assert.equal(activated.alreadyVerified, false);
  assert.equal(activated.period.type, "PAID_ENTRY");
  assert.equal(db.prepare("SELECT status FROM vendors WHERE id=?").get(pending.vendorId).status, "active");
  const second = vs.activateVerifiedPayment(db, db.prepare("SELECT * FROM vendor_subscription_payments WHERE id=?").get(payment.id), base);
  assert.equal(second.alreadyVerified, true);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM vendor_subscription_periods WHERE paymentReference=?").get(payment.reference).n, 1);
});

test("renewal before expiry extends from the existing end and creates one 30-day period", () => {
  const db = dbFixture();
  const first = vs.createFreeVendor(db, { userId:"u1", ...user(1), now:base });
  const pending = vs.createPaymentForVendor(db, { vendorId:first.vendorId, userId:"u1", kind:vs.PERIOD_TYPES.RENEWAL, now:base });
  const payment = db.prepare("SELECT * FROM vendor_subscription_payments WHERE id=?").get(pending.payment.id);
  const renewal = vs.activateVerifiedPayment(db, payment, new Date("2026-01-05T00:00:00.000Z"));
  assert.equal(renewal.period.startAt, "2026-01-31T00:00:00.000Z");
  assert.equal(renewal.period.endAt, "2026-03-02T00:00:00.000Z");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM vendor_subscription_periods WHERE vendorId=?").get(first.vendorId).n, 2);
});

test("expiry is based on server time and renewal after expiry starts a new 30-day period", () => {
  const db = dbFixture();
  const first = vs.createFreeVendor(db, { userId:"u1", ...user(1), now:base });
  const afterExpiry = new Date("2026-02-01T00:00:00.000Z");
  vs.expireDue(db, afterExpiry);
  assert.equal(db.prepare("SELECT status FROM vendor_subscription_periods WHERE id=?").get(first.periodId).status, "EXPIRED");
  assert.equal(db.prepare("SELECT status FROM vendors WHERE id=?").get(first.vendorId).status, "inactive");
  const pending = vs.createPaymentForVendor(db, { vendorId:first.vendorId, userId:"u1", kind:vs.PERIOD_TYPES.RENEWAL, now:afterExpiry });
  const payment = db.prepare("SELECT * FROM vendor_subscription_payments WHERE id=?").get(pending.payment.id);
  const renewal = vs.activateVerifiedPayment(db, payment, afterExpiry);
  assert.equal(renewal.period.startAt, afterExpiry.toISOString());
  assert.equal(renewal.period.endAt, "2026-03-03T00:00:00.000Z");
  assert.equal(db.prepare("SELECT status FROM vendors WHERE id=?").get(first.vendorId).status, "active");
});

test("day-25 reminder is server-scheduled and deduplicated", () => {
  const db = dbFixture();
  const first = vs.createFreeVendor(db, { userId:"u1", ...user(1), now:base });
  const due = vs.dueReminders(db, new Date("2026-01-26T00:00:00.000Z"));
  assert.equal(due.length, 1);
  assert.equal(due[0].reminderAt, "2026-01-26T00:00:00.000Z");
  assert.equal(vs.markReminderSent(db, first.periodId, "u1", "DAY_25", "2026-01-26T00:01:00.000Z"), true);
  assert.equal(vs.markReminderSent(db, first.periodId, "u1", "DAY_25", "2026-01-26T00:02:00.000Z"), false);
  assert.equal(vs.dueReminders(db, new Date("2026-01-27T00:00:00.000Z")).length, 0);
});

test("duplicate renewal requests reuse one pending provider reference", () => {
  const db = dbFixture();
  const first = vs.createFreeVendor(db, { userId:"u1", ...user(1), now:base });
  const a = vs.createPaymentForVendor(db, { vendorId:first.vendorId, userId:"u1", kind:vs.PERIOD_TYPES.RENEWAL, now:base });
  const b = vs.createPaymentForVendor(db, { vendorId:first.vendorId, userId:"u1", kind:vs.PERIOD_TYPES.RENEWAL, now:base });
  assert.equal(a.payment.reference, b.payment.reference);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM vendor_subscription_payments WHERE vendorId=? AND status='PENDING'").get(first.vendorId).n, 1);
});

test("subscription history is owner-scoped", () => {
  const db = dbFixture();
  const a = vs.createFreeVendor(db, { userId:"u1", ...user(1), now:base });
  const b = vs.createFreeVendor(db, { userId:"u2", ...user(2), now:base });
  assert.ok(vs.history(db, "u1", a.vendorId));
  assert.equal(vs.history(db, "u1", b.vendorId), null);
});

test("pending vendor payment never activates until verified", () => {
  const db = dbFixture();
  const pending = vs.createPendingVendor(db, { userId:"u11", ...user(11), now:base });
  assert.equal(db.prepare("SELECT status FROM vendors WHERE id=?").get(pending.vendorId).status, "pending_payment");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM vendor_subscription_periods WHERE vendorId=?").get(pending.vendorId).n, 0);
  assert.equal(db.prepare("SELECT amountMinor,currency FROM vendor_subscription_payments WHERE id=?").get(pending.paymentId).amountMinor, vs.ENTRY_AMOUNT_MINOR);
  assert.equal(db.prepare("SELECT currency FROM vendor_subscription_payments WHERE id=?").get(pending.paymentId).currency, "NGN");
});

test("client-controlled pricing fields are not part of the server registration decision", () => {
  const source = require("fs").readFileSync(require("path").join(__dirname, "index.js"), "utf8");
  const registration = source.slice(source.indexOf('app.post("/api/mall/vendor/register"'), source.indexOf('app.post("/api/mall/vendor/subscription/entry/payment"'));
  assert.equal(/req\.body\?\.isFree|req\.body\?\.freeSlot|req\.body\?\.amount|req\.body\?\.startAt|req\.body\?\.endAt|req\.body\?\.active/.test(registration), false);
  assert.match(registration, /createFreeVendor\(db/);
  assert.match(registration, /ENTRY_AMOUNT|createPendingVendor/);
});

test("scheduler sends the day-25 reminder once and retries do not duplicate it", async () => {
  const db = dbFixture();
  const first = vs.createFreeVendor(db, { userId:"u1", ...user(1), now:base });
  const scheduler = require("./vendorSubscriptionScheduler");
  const sent = [];
  await scheduler.tick(db, { now:new Date("2026-01-26T00:00:00.000Z"), sendPush:async(...args)=>{sent.push(args);} , workerId:"test-worker" });
  await scheduler.tick(db, { now:new Date("2026-01-26T00:00:01.000Z"), sendPush:async(...args)=>{sent.push(args);} , workerId:"test-worker" });
  assert.equal(sent.length, 1);
  assert.match(String(sent[0][1]), /vendor subscription/i);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM vendor_subscription_reminders WHERE subscriptionPeriodId=?").get(first.periodId).n, 1);
});
