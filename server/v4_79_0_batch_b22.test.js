"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const vs = require("./vendorSubscriptions");
const scheduler = require("./vendorSubscriptionScheduler");
const notifications = require("./notifications");
const jobQueue = require("./jobQueue");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");

function dbFixture() {
  const raw = new DatabaseSync(":memory:");
  const db = {
    exec: (sql) => raw.exec(sql),
    prepare: (sql) => raw.prepare(sql),
    transaction: (fn) => () => { raw.exec("BEGIN IMMEDIATE"); try { const out = fn(); raw.exec("COMMIT"); return out; } catch (e) { raw.exec("ROLLBACK"); throw e; } },
  };
  db.exec(`CREATE TABLE vendors(id TEXT PRIMARY KEY,userId TEXT UNIQUE NOT NULL,shopName TEXT NOT NULL,bio TEXT,createdAt TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active');`);
  db.exec(`CREATE TABLE notification_events(id TEXT PRIMARY KEY,userId TEXT,title TEXT,body TEXT,type TEXT,data TEXT,createdAt TEXT,readAt TEXT,dedupeKey TEXT);`);
  db.exec(`CREATE TABLE notification_deliveries(id TEXT PRIMARY KEY,eventId TEXT);`);
  jobQueue.ensureSchema(db);
  vs.ensureSchema(db);
  return db;
}
const base = new Date("2026-01-01T00:00:00.000Z");
function user(id) { return { userId:id, shopName:`Shop ${id}`, bio:"Vendor" }; }

test("vendor entitlement is the single active-access decision and legacy state is only fallback", () => {
  const db=dbFixture();
  const v=vs.createFreeVendor(db,{...user("u1"),now:base});
  assert.equal(vs.vendorEntitlement(db,v.vendorId,base).active,true);
  vs.expireDue(db,new Date("2026-02-01T00:00:00.000Z"));
  assert.equal(vs.vendorEntitlement(db,v.vendorId,new Date("2026-02-01T00:00:00.000Z")).active,false);
});

test("failed vendor payment can be retried without creating a subscription period", () => {
  const db=dbFixture();
  const v=vs.createPendingVendor(db,{...user("u11"),now:base});
  const first=db.prepare("SELECT * FROM vendor_subscription_payments WHERE id=?").get(v.paymentId);
  db.prepare("UPDATE vendor_subscription_payments SET status='FAILED' WHERE id=?").run(first.id);
  const retry=vs.retryPayment(db,{vendorId:v.vendorId,userId:"u11",now:base});
  assert.equal(retry.payment.kind,"PAID_ENTRY");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM vendor_subscription_periods WHERE vendorId=?").get(v.vendorId).n,0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM vendor_subscription_payments WHERE vendorId=?").get(v.vendorId).n,2);
});

test("day-25 reminder is routed to the existing Inbox notification contract", async () => {
  const db=dbFixture();
  const v=vs.createFreeVendor(db,{...user("u1"),now:base});
  const eventCalls=[];
  const result=await scheduler.tick(db,{now:new Date("2026-01-26T00:01:00.000Z"),sendPush:async(userId,title,body,data)=>{eventCalls.push({userId,title,body,data});}});
  assert.equal(result.length,2);
  assert.equal(result.some(r=>r.type===scheduler.REMINDER_JOB && r.sent===true),true);
  assert.equal(eventCalls.length,1);
  assert.equal(eventCalls[0].data.screen,"chat");
  assert.equal(eventCalls[0].data.action,"chat");
  assert.equal(eventCalls[0].data.dedupeKey,`vendor-subscription-day25:${v.periodId}`);
});

test("launch offer summary exposes allocation mechanics only to the operations layer", () => {
  const db=dbFixture();
  for(let i=1;i<=3;i++) vs.createFreeVendor(db,{...user(`u${i}`),now:base});
  const summary=vs.launchOfferSummary(db);
  assert.equal(summary.consumed,3);
  assert.equal(summary.remaining,7);
  assert.equal(summary.open,true);
  assert.equal(summary.allocations.length,3);
});

test("account closure helper deactivates vendor and cancels pending payment while retaining history", () => {
  const db=dbFixture();
  const v=vs.createFreeVendor(db,{...user("u1"),now:base});
  const pending=vs.createPaymentForVendor(db,{vendorId:v.vendorId,userId:"u1",kind:vs.PERIOD_TYPES.RENEWAL,now:base});
  const closed=vs.closeVendorForAccount(db,"u1",new Date("2026-01-10T00:00:00.000Z"));
  assert.equal(closed.changed,true);
  assert.equal(db.prepare("SELECT status FROM vendors WHERE id=?").get(v.vendorId).status,"inactive");
  assert.equal(db.prepare("SELECT status FROM vendor_subscription_periods WHERE id=?").get(v.periodId).status,"EXPIRED");
  assert.equal(db.prepare("SELECT status FROM vendor_subscription_payments WHERE id=?").get(pending.payment.id).status,"CANCELLED");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM vendor_subscription_periods WHERE vendorId=?").get(v.vendorId).n,1);
});

test("roadmap/version metadata records B22", () => {
  assert.match(fs.readFileSync(path.join(root,"MASTER_ROADMAP.md"),"utf8"),/106\. \*\*Vendor subscription entitlement guard/);
  assert.match(fs.readFileSync(path.join(root,"MASTER_ROADMAP.md"),"utf8"),/## V4\.79\.0 — Batch B22/);
});
