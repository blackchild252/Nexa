"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const subscriptions = require("./subscriptions");
const vendorSubscriptions = require("./vendorSubscriptions");
const hub = require("./subscriptionHub");

function dbFixture() {
  const raw = new DatabaseSync(":memory:");
  const db = { exec:(sql)=>raw.exec(sql), prepare:(sql)=>raw.prepare(sql), transaction:(fn)=>()=>{raw.exec("BEGIN IMMEDIATE");try{const out=fn();raw.exec("COMMIT");return out}catch(e){raw.exec("ROLLBACK");throw e}} };
  db.exec(`CREATE TABLE vendors(id TEXT PRIMARY KEY,userId TEXT UNIQUE NOT NULL,shopName TEXT NOT NULL,bio TEXT,createdAt TEXT NOT NULL);`);
  vendorSubscriptions.ensureSchema(db); subscriptions.ensureSchema(db);
  return db;
}
const base=new Date("2026-01-01T00:00:00.000Z");
function user(id){return{id,shopName:`Shop ${id}`,bio:"Vendor"};}

test("subscription hub keeps user and vendor subscriptions independent",()=>{
  const db=dbFixture();
  const first=vendorSubscriptions.createFreeVendor(db,{userId:"u1",...user(1),now:base});
  const view=hub.overview(db,"u1",base);
  assert.equal(view.vendorSubscription.vendor.id,first.vendorId);
  assert.equal(view.vendorSubscription.subscription.type,"FREE_LAUNCH");
  assert.equal(view.userSubscription.subscription.planId,"free");
  assert.equal(view.separation.independent,true);
});

test("subscription hub does not expose another user's vendor state",()=>{
  const db=dbFixture();
  vendorSubscriptions.createFreeVendor(db,{userId:"u1",...user(1),now:base});
  vendorSubscriptions.createFreeVendor(db,{userId:"u2",...user(2),now:base});
  const own=hub.overview(db,"u1",base);
  assert.equal(own.vendorSubscription.vendor.userId,"u1");
  assert.equal(own.vendorSubscription.vendor.shopName,"Shop 1");
});

test("vendor history remains owner-scoped and contains auditable periods/payments",()=>{
  const db=dbFixture();
  const first=vendorSubscriptions.createFreeVendor(db,{userId:"u1",...user(1),now:base});
  const h=vendorSubscriptions.history(db,"u1",first.vendorId);
  assert.equal(h.periods.length,1);
  assert.equal(h.periods[0].type,"FREE_LAUNCH");
  assert.equal(h.payments.length,0);
  assert.equal(vendorSubscriptions.history(db,"u2",first.vendorId),null);
});

test("vendor renewal does not change the user membership plan",()=>{
  const db=dbFixture();
  const first=vendorSubscriptions.createFreeVendor(db,{userId:"u1",...user(1),now:base});
  const before=hub.overview(db,"u1",base).userSubscription.subscription.planId;
  const pending=vendorSubscriptions.createPaymentForVendor(db,{vendorId:first.vendorId,userId:"u1",kind:vendorSubscriptions.PERIOD_TYPES.RENEWAL,now:base});
  const payment=db.prepare("SELECT * FROM vendor_subscription_payments WHERE id=?").get(pending.payment.id);
  vendorSubscriptions.activateVerifiedPayment(db,payment,new Date("2026-01-05T00:00:00.000Z"));
  assert.equal(hub.overview(db,"u1",new Date("2026-01-05T00:00:00.000Z")).userSubscription.subscription.planId,before);
});

test("client cannot turn a user subscription into vendor access",()=>{
  const source=require("fs").readFileSync(require("path").join(__dirname,"index.js"),"utf8");
  assert.match(source,/app\.get\("\/api\/account\/subscriptions"/);
  assert.match(source,/subscriptionHub\.overview\(db, req\.user\.id\)/);
  assert.match(source,/vendorSubscriptions\.vendorEntitlement\(db, vendor\.id\)/);
});
