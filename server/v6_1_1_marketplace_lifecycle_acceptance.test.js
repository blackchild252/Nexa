"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ops = require("./marketplaceOperations");
const investigations = require("./marketplaceInvestigations");
function openDb() {
  try { const Database = require("better-sqlite3"); return new Database(":memory:"); }
  catch (_) { const { DatabaseSync } = require("node:sqlite"); const raw = new DatabaseSync(":memory:"); return { exec: (s) => raw.exec(s), prepare: (s) => raw.prepare(s), close: () => raw.close() }; }
}
test("Block 11 SQLite acceptance: persisted order fixture, investigation idempotency, and no order mutation", () => {
  const db = openDb();
  try {
    db.exec("CREATE TABLE mall_orders (id TEXT PRIMARY KEY, status TEXT NOT NULL, userId TEXT NOT NULL, vendorId TEXT NOT NULL, paymentStatus TEXT NOT NULL, createdAt TEXT NOT NULL)");
    db.prepare("INSERT INTO mall_orders VALUES(?,?,?,?,?,?)").run("order-1", "placed", "buyer-1", "seller-1", "unpaid", "2026-10-01T00:00:00.000Z");
    investigations.ensureSchema(db);
    const input = { orderId: "order-1", category: "delivery", reason: "Check missing delivery scan", actorId: "admin-1", requestKey: "block11-key-0001", genRowId: () => "investigation-1", now: "2026-10-02T00:00:00.000Z" };
    const first = investigations.create(db, input);
    const replay = investigations.create(db, { ...input, reason: "Replay should not create another record", genRowId: () => "different-id" });
    assert.equal(first.ok, true); assert.equal(first.duplicate, false);
    assert.equal(replay.ok, true); assert.equal(replay.duplicate, true);
    assert.equal(investigations.list(db, { status: "all" }).investigations.length, 1);
    const persisted = db.prepare("SELECT status,paymentStatus FROM mall_orders WHERE id=?").get("order-1");
    assert.equal(persisted.status, "placed"); assert.equal(persisted.paymentStatus, "unpaid");
    assert.equal(investigations.create(db, { ...input, orderId: "missing-order", requestKey: "block11-key-0002" }).status, 404);
  } finally { db.close?.(); }
});
test("Block 11 lifecycle invariants fail closed for malformed and terminal states", () => {
  assert.equal(ops.canTransitionOrder("completed", "cancelled"), false);
  assert.equal(ops.normalizeMarketplaceState("payment", "made_up"), null);
  assert.equal(ops.buyerOrderEligibility({ buyerId: "buyer-a", orderOwnerId: "buyer-b" }).eligible, false);
  assert.equal(ops.sellerOrderEligibility({ sellerActive: false, sellerId: "seller-a", orderSellerId: "seller-a" }).eligible, false);
  assert.equal(ops.disputeTransitionResult("resolved", "open").ok, false);
  assert.equal(ops.payoutTransitionResult("paid", "held").ok, false);
});
test("Block 11 snapshot and route expose bounded read-only data without provider or mutation calls", () => {
  const snapshot = ops.summarizeMarketplaceCommandCenter({ orders: [{ id: "a", status: "placed" }, { id: "b", status: "unknown-status" }], vendors: [{ id: "s1" }] });
  assert.equal(snapshot.readOnly, true); assert.equal(snapshot.orders.byStatus.unknown, 1); assert.equal(snapshot.sellers.suspended, null);
  const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
  const route = source.slice(source.indexOf('app.get("/api/admin/marketplace/operations"'), source.indexOf('// Investigation records are operational audit metadata'));
  assert.match(route, /auth\.authMiddleware, adminAccess\.require\("mall"\)/);
  assert.match(route, /providerCalls: false, mutationsPerformed: false/);
  assert.doesNotMatch(route, /UPDATE mall_orders|UPDATE mall_refunds|INSERT INTO mall_refunds|provider\./i);
  assert.match(route, /LIMIT 100/); assert.match(route, /LIMIT 50/);
});
test("Block 11 timeline ordering is deterministic and bounded", () => {
  const events = Array.from({ length: 130 }, (_, i) => ({ id: `e${String(i).padStart(3, "0")}`, toStatus: "accepted", createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString() }));
  const result = ops.normalizeOrderTimeline(events, 20);
  assert.equal(result.length, 20); assert.equal(result[0].id, "e110"); assert.equal(result.at(-1).id, "e129");
});
