"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const ops = require("./financialOperations");
const read = (f) => fs.readFileSync(path.join(__dirname, f), "utf8");

function makeDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE wallet_transactions(id TEXT PRIMARY KEY,type TEXT,direction TEXT,amountMinor INTEGER,currency TEXT,status TEXT,source TEXT,reference TEXT,providerReference TEXT,createdAt TEXT,completedAt TEXT);
  CREATE TABLE wallet_ledger_entries(id TEXT PRIMARY KEY,transactionId TEXT,userId TEXT,amountMinor INTEGER,currency TEXT,createdAt TEXT);
  CREATE TABLE mall_payment_events(eventKey TEXT PRIMARY KEY,reference TEXT,eventType TEXT,receivedAt TEXT,outcome TEXT,bodyHash TEXT);`);
  return db;
}
const now = new Date("2026-10-09T12:00:00.000Z");

test("Block 06 classifies ledger anomalies and stale pending items without changing money state", () => {
  const db = makeDb();
  db.prepare("INSERT INTO wallet_transactions VALUES(?,?,?,?,?,?,?,?,?,?,?)").run("w1","deposit","credit",5000,"NGN","completed","provider","NEXA-1","pr-1","2026-10-09T10:00:00.000Z","2026-10-09T10:00:00.000Z");
  db.prepare("INSERT INTO wallet_transactions VALUES(?,?,?,?,?,?,?,?,?,?,?)").run("w2","withdrawal","debit",2000,"NGN","pending","provider","NEXA-2","pr-2","2026-10-09T10:00:00.000Z",null);
  db.prepare("INSERT INTO wallet_ledger_entries VALUES(?,?,?,?,?,?)").run("l2","w2","u1",-2000,"NGN","2026-10-09T10:00:00.000Z");
  const summary = ops.reconcile(db,{now,providerState:{mode:"live",status:"not_connected",ready:false}});
  assert.equal(summary.transactionCount,2);
  assert.equal(summary.providerReconciliation.status,"not_connected");
  assert.equal(summary.fxQuoteReadiness.status,"not_connected");
  assert.equal(summary.fxQuoteReadiness.quoteAvailable,false);
  assert.equal(summary.fxQuoteReadiness.conversionAvailable,false);
  assert.match(summary.fxQuoteReadiness.note,/No FX quote adapter is registered/);
  assert.equal(ops.getSummary(db,{mode:"live",status:"not_connected"}).runId,summary.runId);
  assert.ok(summary.findingsDetected >= 2);
  ops.reconcile(db,{now,providerState:{mode:"live",status:"not_connected",ready:false}});
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM wallet_reconciliation_exceptions WHERE status='open'").get().n,3);
  const open = ops.listExceptions(db,{status:"open",limit:100});
  assert.ok(open.items.some((x)=>x.category === "missing_ledger_entry"));
  assert.ok(open.items.some((x)=>x.category === "unexpected_ledger_entry"));
  assert.ok(open.items.some((x)=>x.category === "stale_pending_withdrawal"));
  assert.equal(db.prepare("SELECT status FROM wallet_transactions WHERE id='w2'").get().status,"pending");
});

test("provider reference duplication, amount mismatch and currency mismatch are surfaced", () => {
  const db = makeDb();
  const insertTx = db.prepare("INSERT INTO wallet_transactions VALUES(?,?,?,?,?,?,?,?,?,?,?)");
  insertTx.run("a","deposit","credit",100,"NGN","completed","provider","r1","dup","2026-10-09T10:00:00.000Z","2026-10-09T10:00:00.000Z");
  insertTx.run("b","deposit","credit",200,"USD","completed","provider","r2","dup","2026-10-09T10:00:00.000Z","2026-10-09T10:00:00.000Z");
  db.prepare("INSERT INTO wallet_ledger_entries VALUES(?,?,?,?,?,?)").run("la","a","u1",-50,"USD","2026-10-09T10:00:00.000Z");
  ops.reconcile(db,{now,providerState:{mode:"sandbox",status:"sandbox"}});
  const cats = ops.listExceptions(db,{status:"open",limit:100}).items.map((x)=>x.category);
  assert.ok(cats.includes("duplicate_provider_reference"));
  assert.ok(cats.includes("amount_mismatch"));
  assert.ok(cats.includes("currency_mismatch"));
  assert.equal(ops.providerSummary({mode:"sandbox",status:"sandbox"}).status,"sandbox_simulation_only");
});

test("review requires a reason, is terminal, and explicitly leaves financial state unchanged", () => {
  const db = makeDb();
  ops.ensureSchema(db);
  db.prepare("INSERT INTO wallet_reconciliation_exceptions(id,source,sourceId,reference,category,severity,status,detailsJson,firstSeenAt,lastSeenAt) VALUES(?,?,?,?,?,?,?,?,?,?)").run("e1","wallet_transaction","tx1","r1","missing_ledger_entry","critical","open","{}",now.toISOString(),now.toISOString());
  assert.throws(()=>ops.reviewException(db,{exceptionId:"e1",actorId:"admin",actorRole:"owner",reason:"short",now}),/at least 10/);
  const result = ops.reviewException(db,{exceptionId:"e1",actorId:"admin",actorRole:"owner",reason:"Reviewed against source record",now});
  assert.equal(result.status,"reviewed"); assert.equal(result.financialStateChanged,false);
  assert.throws(()=>ops.reviewException(db,{exceptionId:"e1",actorId:"admin",actorRole:"owner",reason:"Second review attempt",now}),/terminal review state/);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM wallet_reconciliation_audit").get().n,1);
});

test("bounded search and route contracts preserve Main financial authority", () => {
  const src = read("index.js");
  for (const route of ["/api/admin/financial-operations/reconcile","/api/admin/financial-operations/summary","/api/admin/financial-operations/assignees","/api/admin/financial-operations/exceptions","/api/admin/financial-operations/exceptions/:exceptionId/assign","/api/admin/financial-operations/transactions","/api/admin/financial-operations/exceptions/:exceptionId/review"]) assert.ok(src.includes(route), route);
  assert.match(src,/adminAccess\.require\("payments"\)/);
  assert.match(read("financialOperations.js"),/No external provider transaction feed is registered/);
  assert.match(read("financialOperations.js"),/financialStateChanged: false/);
  assert.match(read("financialOperations.js"),/fxQuoteReadiness/);
});


test("exception assignment is Main-authorized, reasoned, audited, and survives a rescan", () => {
  const db = makeDb();
  db.prepare("INSERT INTO wallet_transactions VALUES(?,?,?,?,?,?,?,?,?,?,?)").run("w-assign","deposit","credit",5000,"NGN","completed","provider","NEXA-ASSIGN",null,"2026-10-09T10:00:00.000Z","2026-10-09T10:00:00.000Z");
  const summary = ops.reconcile(db,{now,providerState:{mode:"live",status:"not_connected"}});
  const exception = ops.listExceptions(db,{status:"open",limit:50}).items.find((x)=>x.category === "missing_ledger_entry");
  assert.ok(exception);
  assert.throws(()=>ops.assignException(db,{exceptionId:exception.id,assignedTo:"staff1",actorId:"owner",actorRole:"owner",reason:"Assign for review",canAssign:()=>false,now}),/does not have Main-authorized/);
  const assigned = ops.assignException(db,{exceptionId:exception.id,assignedTo:"owner1",actorId:"owner",actorRole:"owner",reason:"Assign to financial owner",canAssign:(id)=>id === "owner1",now});
  assert.equal(assigned.status,"assigned");
  ops.reconcile(db,{now,providerState:{mode:"live",status:"not_connected"}});
  const active = ops.listExceptions(db,{status:"active",limit:50}).items.find((x)=>x.id === exception.id);
  assert.equal(active.status,"assigned"); assert.equal(active.assignedTo,"owner1");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM wallet_reconciliation_audit WHERE action='exception_assigned'").get().n,1);
  assert.equal(summary.transactionCount,1);
});
