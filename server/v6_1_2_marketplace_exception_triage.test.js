"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const triage = require("./marketplaceExceptionTriage");
function openDb() {
  try { const Database = require("better-sqlite3"); return new Database(":memory:"); }
  catch (_) { const { DatabaseSync } = require("node:sqlite"); const raw = new DatabaseSync(":memory:"); return { exec: (s) => raw.exec(s), prepare: (s) => raw.prepare(s), close: () => raw.close() }; }
}
function fixture() {
  const db = openDb();
  db.exec("CREATE TABLE mall_orders (id TEXT PRIMARY KEY, userId TEXT NOT NULL, status TEXT NOT NULL)");
  db.prepare("INSERT INTO mall_orders VALUES(?,?,?)").run("order-1", "buyer-1", "cancelled");
  triage.ensureSchema(db);
  return db;
}
function input(extra = {}) { return { orderId: "order-1", category: "delivery", sourceType: "delivery_event", sourceId: "scan-1", actorId: "staff-1", actorRole: "staff", summary: "Delivery scan missing", evidence: ["carrier timeline checked"], requestKey: "block12-exception-001", genRowId: () => "exception-1", now: "2026-10-09T00:00:00.000Z", ...extra }; }
test("Block 12 creates provenance-rich exception metadata with idempotent replay and no order mutation", () => {
  const db = fixture();
  try {
    const first = triage.create(db, input());
    const replay = triage.create(db, input({ summary: "replayed payload", genRowId: () => "another-id" }));
    assert.equal(first.ok, true); assert.equal(first.duplicate, false); assert.equal(first.exception.evidenceComplete, true);
    assert.equal(replay.ok, true); assert.equal(replay.duplicate, true); assert.equal(replay.exception.id, "exception-1");
    assert.equal(db.prepare("SELECT status FROM mall_orders WHERE id=?").get("order-1").status, "cancelled");
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM marketplace_exceptions").get().n, 1);
  } finally { db.close?.(); }
});
test("Block 12 rejects missing source lineage, missing evidence, invalid categories and orphan order references", () => {
  const db = fixture();
  try {
    assert.equal(triage.create(db, input({ sourceId: "" })).ok, false);
    const noEvidence = triage.create(db, input({ evidence: [], requestKey: "block12-no-evidence-1", genRowId: () => "exception-no-evidence" }));
    assert.equal(noEvidence.ok, true); assert.equal(noEvidence.exception.evidenceComplete, false); assert.ok(noEvidence.exception.missingEvidence.includes("evidence"));
    assert.equal(triage.create(db, input({ category: "invented" })).ok, false);
    assert.equal(triage.create(db, input({ orderId: "missing-order" })).status, 404);
  } finally { db.close?.(); }
});
test("Block 12 triage supports acknowledgement and optimistic version checks", () => {
  const db = fixture();
  try {
    triage.create(db, input());
    const ack = triage.transition(db, { id: "exception-1", action: "acknowledged", actorId: "admin-1", requestKey: "triage-ack-0001", expectedVersion: 1, now: "2026-10-09T00:01:00.000Z" });
    assert.equal(ack.ok, true); assert.equal(ack.exception.status, "acknowledged"); assert.equal(ack.exception.version, 2);
    assert.equal(triage.transition(db, { id: "exception-1", action: "reviewing", actorId: "admin-1", requestKey: "triage-review-0001", expectedVersion: 1 }).status, 409);
  } finally { db.close?.(); }
});
test("Block 12 terminal exception state cannot be reopened and replay is idempotent", () => {
  const db = fixture();
  try {
    triage.create(db, input());
    const closed = triage.transition(db, { id: "exception-1", action: "resolved", actorId: "admin-1", requestKey: "triage-resolve-0001", expectedVersion: 1, now: "2026-10-09T00:02:00.000Z" });
    const replay = triage.transition(db, { id: "exception-1", action: "resolved", actorId: "admin-1", requestKey: "triage-resolve-0001" });
    const reopen = triage.transition(db, { id: "exception-1", action: "open", actorId: "admin-1", requestKey: "triage-reopen-0001" });
    assert.equal(closed.ok, true); assert.equal(closed.exception.terminal, true); assert.equal(replay.duplicate, true); assert.equal(reopen.status, 409);
  } finally { db.close?.(); }
});
test("Block 12 bounded exception search and pagination are deterministic", () => {
  const db = fixture();
  try {
    for (let i = 1; i <= 3; i++) triage.create(db, input({ sourceId: `scan-${i}`, requestKey: `block12-exception-${String(i).padStart(3,"0")}`, genRowId: () => `exception-${i}`, now: `2026-10-09T00:0${i}:00.000Z` }));
    const page = triage.list(db, { status: "all", q: "delivery", limit: 2, offset: 1 });
    assert.equal(page.total, 3); assert.equal(page.exceptions.length, 2); assert.equal(page.limit, 2); assert.equal(page.offset, 1);
    assert.deepEqual(page.exceptions.map((r) => r.id), ["exception-2", "exception-1"]);
  } finally { db.close?.(); }
});
test("Block 12 diagnostics are read-only and detect orphan records, duplicate refunds, missing dispute decisions and cancellation inventory review", () => {
  const d = triage.diagnostics({ orders: [{ id: "o1", status: "cancelled" }], events: [{ orderId: "missing" }], disputes: [{ orderId: "missing" }, { orderId: "o1", status: "resolved", resolution: "" }], refunds: [{ orderId: "o1", reference: "r1" }, { orderId: "o1", reference: "r1" }, { orderId: "missing", reference: "r2" }], orderItems: [{ orderId: "o1", status: "placed" }] });
  assert.equal(d.orphanEvents, 1); assert.equal(d.orphanDisputes, 1); assert.equal(d.orphanRefunds, 1); assert.equal(d.duplicateRefunds, 1); assert.equal(d.resolvedDisputesMissingDecision, 1); assert.equal(d.cancellationInventoryReview, 1); assert.equal(d.requiresReview, true); assert.equal(d.providerCalls, false); assert.equal(d.mutationsPerformed, false);
});
test("Block 12 timeline actor role is explicit and unknown identities remain unknown", () => {
  assert.equal(triage.actorRoleForEvent({ actorId: "buyer-1" }, { buyerId: "buyer-1" }), "buyer");
  assert.equal(triage.actorRoleForEvent({ actorId: "seller-1" }, { sellerIds: ["seller-1"] }), "seller");
  assert.equal(triage.actorRoleForEvent({ actorId: "mystery" }, { buyerId: "buyer-1", sellerIds: ["seller-1"] }), "unknown");
  assert.equal(triage.actorRoleForEvent({}, {}), "unknown");
});
test("Block 12 API is permission-gated, bounded, and cannot mutate financial/order/provider state", () => {
  const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
  const triageSource = fs.readFileSync(path.join(__dirname, "marketplaceExceptionTriage.js"), "utf8");
  assert.match(source, /app\.get\("\/api\/admin\/marketplace\/exceptions", auth\.authMiddleware, adminAccess\.require\("mall"\)/);
  assert.match(source, /app\.post\("\/api\/admin\/marketplace\/exceptions\/:id\/triage", auth\.authMiddleware, adminAccess\.require\("mall"\)/);
  assert.match(triageSource, /LIMIT \? OFFSET \?/); assert.match(triageSource, /requestKey TEXT NOT NULL UNIQUE/);
  assert.doesNotMatch(triageSource, /UPDATE mall_orders|UPDATE mall_refunds|INSERT INTO mall_refunds|provider\.call/i);
});
test("Block 12 sanitized exception response omits actor IDs and private identity fields", () => {
  const normalized = triage.normalizeException({ id: "x", orderId: "o1", actorId: "private-actor-id", actorRole: "staff", category: "delivery", sourceType: "delivery_event", sourceId: "d1", summary: "Check delivery", status: "open", createdAt: "2026-10-09T00:00:00Z", updatedAt: "2026-10-09T00:00:00Z" });
  assert.equal(normalized.actorRole, "staff"); assert.equal(Object.hasOwn(normalized, "actorId"), false); assert.equal(Object.hasOwn(normalized, "email"), false);
});

test("Block 12 rejects request-key reuse across cases and handles empty/oversized lists safely", () => {
  const db = fixture();
  try {
    triage.create(db, input());
    triage.create(db, input({ sourceId: "scan-2", requestKey: "block12-exception-002", genRowId: () => "exception-2" }));
    const first = triage.transition(db, { id: "exception-1", action: "acknowledged", actorId: "admin-1", requestKey: "triage-key-shared-001", expectedVersion: 1 });
    const crossCase = triage.transition(db, { id: "exception-2", action: "acknowledged", actorId: "admin-1", requestKey: "triage-key-shared-001", expectedVersion: 1 });
    const empty = triage.list(db, { q: "no-match", limit: 9999, offset: 999999 });
    const oversized = triage.list(db, { status: "invalid", limit: 9999, offset: -10 });
    assert.equal(first.ok, true); assert.equal(crossCase.status, 409); assert.equal(empty.total, 0); assert.equal(empty.limit, 100); assert.equal(empty.offset, 100000); assert.equal(oversized.limit, 100); assert.equal(oversized.offset, 0); assert.equal(oversized.status, "all");
  } finally { db.close?.(); }
});

test("Block 13 exposes category evidence expectations, bounded triage history, SLA metadata and category counts", () => {
  const db = fixture();
  try {
    triage.create(db, input());
    triage.transition(db, { id: "exception-1", action: "acknowledged", actorId: "admin-1", requestKey: "block13-history-0001", expectedVersion: 1, now: "2026-10-09T00:01:00.000Z" });
    const page = triage.list(db, { status: "all", limit: 10, offset: 0 });
    assert.equal(page.countsByCategory.delivery, 1);
    assert.ok(page.exceptions[0].categoryEvidenceRequired.includes("delivery event or carrier reference"));
    assert.ok(Array.isArray(page.exceptions[0].eventHistory));
    assert.equal(page.exceptions[0].eventHistory.length, 1);
    assert.equal(page.exceptions[0].eventHistory[0].toStatus, "acknowledged");
    assert.equal(page.exceptions[0].slaMinutes, 240);
    assert.ok(page.exceptions[0].ageMinutes >= 0);
    assert.equal(page.readOnly, true); assert.equal(page.mutationsPerformed, false);
  } finally { db.close?.(); }
});
test("Block 13 source diagnostics fail safely when a canonical source table is unavailable", () => {
  const result = triage.sourceRecordExists(fixture(), { sourceType: "delivery_event", sourceId: "d-1", orderId: "order-1" });
  assert.equal(result.available, false); assert.equal(result.exists, null); assert.equal(result.reason, "source_table_unavailable");
});

test("Block 13 refund currency diagnostics flag malformed source metadata without changing refund state", () => {
  const result = triage.diagnostics({ orders: [{ id: "order-1", status: "paid" }], refunds: [
    { id: "r1", orderId: "order-1", reference: "ref-1", amount: 10, currency: "NGN" },
    { id: "r2", orderId: "order-1", reference: "ref-2", amount: -1, currency: "ngn" }
  ] });
  assert.equal(result.refundCurrencyIntegrity, 1); assert.equal(result.providerCalls, false); assert.equal(result.mutationsPerformed, false);
});
test("Block 13 audit retention readiness never purges records or invents a retention period", () => {
  const db = fixture();
  try {
    triage.create(db, input());
    triage.transition(db, { id: "exception-1", action: "acknowledged", actorId: "admin-1", requestKey: "block13-retention-0001", expectedVersion: 1, now: "2026-10-09T00:01:00.000Z" });
    const readiness = triage.auditRetentionReadiness(db);
    assert.equal(readiness.available, true); assert.equal(readiness.totalEvents, 1);
    assert.equal(readiness.retentionPolicy, "not_configured_no_auto_purge"); assert.equal(readiness.purgePerformed, false);
    const indexes = db.prepare("PRAGMA index_list('marketplace_exceptions')").all().map((item) => item.name);
    assert.ok(indexes.includes("idx_marketplace_exceptions_status_updated"));
    assert.ok(indexes.includes("idx_marketplace_exceptions_source"));
  } finally { db.close?.(); }
});

test("Block 13 create idempotency rejects request-key reuse for a different source", () => {
  const db = fixture();
  try {
    const first = triage.create(db, input());
    const mismatch = triage.create(db, input({ sourceId: "different-source" }));
    assert.equal(first.ok, true); assert.equal(mismatch.ok, false); assert.equal(mismatch.status, 409);
    assert.equal(mismatch.conflict.code, "request_key_reused");
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM marketplace_exceptions").get().n, 1);
  } finally { db.close?.(); }
});
test("Block 13 replay conflicts expose safe stale/terminal metadata without private identities", () => {
  const db = fixture();
  try {
    triage.create(db, input());
    const stale = triage.transition(db, { id: "exception-1", action: "acknowledged", actorId: "admin-1", requestKey: "block13-stale-0001", expectedVersion: 99 });
    assert.equal(stale.conflict.code, "stale_version"); assert.equal(stale.conflict.currentVersion, 1);
    const closed = triage.transition(db, { id: "exception-1", action: "resolved", actorId: "admin-1", requestKey: "block13-close-0001", expectedVersion: 1 });
    const terminal = triage.transition(db, { id: "exception-1", action: "acknowledged", actorId: "admin-1", requestKey: "block13-term-0001" });
    assert.equal(closed.ok, true); assert.equal(terminal.conflict.code, "terminal_record");
    assert.equal(Object.hasOwn(terminal.conflict, "actorId"), false);
  } finally { db.close?.(); }
});
test("Block 13 seller-suspension evidence is explicit and cancellation diagnostics avoid false positives", () => {
  const normalized = triage.normalizeException({ category: "seller_suspension", sourceType: "seller_status", sourceId: "seller-1", evidence: [], status: "open" });
  assert.ok(normalized.categoryEvidenceRequired.includes("seller status source reference"));
  const d = triage.diagnostics({ orders: [{ id: "cancelled-1", status: "cancelled" }], orderItems: [{ orderId: "cancelled-1", status: "returned" }, { orderId: "cancelled-1", status: "cancelled" }] });
  assert.equal(d.cancellationInventoryReview, 0);
});

test("Block 13 route error recovery returns safe service-unavailable responses", () => {
  const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
  assert.match(source, /marketplace-exceptions-read-model[\s\S]{0,220}status\(503\)\.json\(\{ error: "Marketplace exceptions are unavailable\.", authority: "main", readOnly: true, mutationsPerformed: false \}\)/);
  assert.match(source, /result\.conflict \? \{ conflict: result\.conflict \} : \{\}/);
});
test("Block 13 combined duplicate, stale and empty query combinations remain deterministic", () => {
  const db = fixture();
  try {
    const first = triage.create(db, input());
    const duplicate = triage.create(db, input());
    const stale = triage.transition(db, { id: "exception-1", action: "acknowledged", actorId: "admin-1", requestKey: "block13-stale-combo-01", expectedVersion: 8 });
    const empty = triage.list(db, { q: "absent", limit: 1000, offset: 1000000 });
    const counts1 = triage.list(db, { status: "all" }).countsByCategory;
    const counts2 = triage.list(db, { status: "all" }).countsByCategory;
    assert.equal(first.ok, true); assert.equal(duplicate.duplicate, true); assert.equal(stale.conflict.code, "stale_version");
    assert.equal(empty.total, 0); assert.deepEqual(counts1, counts2); assert.equal(counts1.delivery, 1);
  } finally { db.close?.(); }
});
