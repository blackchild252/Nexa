"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { registerAdminDamiGovernance } = require("./adminDamiGovernance");
function openDb() {
  try { const Database = require("better-sqlite3"); return new Database(":memory:"); }
  catch (_) {
    const { DatabaseSync } = require("node:sqlite");
    const raw = new DatabaseSync(":memory:");
    return { exec: (sql) => raw.exec(sql), prepare: (sql) => raw.prepare(sql), close: () => raw.close() };
  }
}

function setup() {
  const db = openDb();
  const routes = new Map();
  const app = {};
  for (const method of ["get", "post", "delete"]) app[method] = (path, ...handlers) => routes.set(`${method.toUpperCase()} ${path}`, handlers);
  const auth = { authMiddleware: (_req, _res, next) => next() };
  const admin = {
    require: () => (req, res, next) => { if (req.adminRole !== "owner") return res.status(403).json({ error: "Administrator access required." }); return next(); },
    audit: () => {},
  };
  registerAdminDamiGovernance({ app, auth, admin, db });
  async function call(method, path, { userId = "owner1", role = "owner", body = {}, query = {}, params = {} } = {}) {
    const handlers = routes.get(`${method} ${path}`);
    assert.ok(handlers, `route registered: ${method} ${path}`);
    const req = { user: { id: userId }, adminRole: role, body, query, params };
    let status = 200, payload;
    const res = { status(n) { status = n; return this; }, json(value) { payload = value; return this; } };
    for (const handler of handlers) {
      let nextCalled = false;
      await handler(req, res, () => { nextCalled = true; });
      if (status >= 400 || payload !== undefined) break;
      if (!nextCalled && handler.length >= 3) break;
    }
    return { status, payload };
  }
  return { db, call };
}

test("Admin Knowledge Hub persists, cites, isolates and deletes documents", async () => {
  const { call, db } = setup();
  const created = await call("POST", "/api/admin/dami/knowledge", { body: { title: "Refund SOP", content: "Refund review requires evidence and a reason." } });
  assert.equal(created.status, 201);
  const id = created.payload.document.id;
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM admin_dami_knowledge WHERE ownerId=?").get("owner1").n, 1);
  const search = await call("GET", "/api/admin/dami/knowledge/search", { query: { q: "refund evidence" } });
  assert.equal(search.status, 200);
  assert.equal(search.payload.results[0].citation.documentId, id);
  assert.equal(search.payload.results[0].provenance.scope, "admin-operations");
  const other = await call("GET", "/api/admin/dami/knowledge/search", { userId: "owner2", query: { q: "refund evidence" } });
  assert.equal(other.payload.results.length, 0);
  const deleted = await call("DELETE", "/api/admin/dami/knowledge/:id", { params: { id } });
  assert.equal(deleted.payload.deleted, true);
  const after = await call("GET", "/api/admin/dami/knowledge/search", { query: { q: "refund evidence" } });
  assert.equal(after.payload.results.length, 0);
  db.close();
});

test("Admin workflows persist transitions, approval, idempotent receipts and audit without execution", async () => {
  const { call, db } = setup();
  const invalid = await call("POST", "/api/admin/dami/workflows", { body: { title: "Invalid workflow", steps: [{ title: "   " }] } });
  assert.equal(invalid.status, 400);
  const created = await call("POST", "/api/admin/dami/workflows", { body: { title: "Queue triage", steps: [{ title: "Review evidence" }] } });
  assert.equal(created.status, 201);
  const id = created.payload.workflow.id;
  for (const to of ["awaiting_approval", "approved", "active", "completed", "archived"]) {
    const result = await call("POST", "/api/admin/dami/workflows/:id/transition", { params: { id }, body: { to, reason: "Test transition" } });
    assert.equal(result.status, 200, `${to} transition`);
  }
  const receipt = await call("POST", "/api/admin/dami/workflows/:id/receipt", { params: { id }, body: { idempotencyKey: "stable-receipt-key-001" } });
  assert.equal(receipt.status, 200);
  assert.equal(receipt.payload.executed, false);
  const replay = await call("POST", "/api/admin/dami/workflows/:id/receipt", { params: { id }, body: { idempotencyKey: "stable-receipt-key-001" } });
  assert.equal(replay.payload.replayed, true);
  const audit = await call("GET", "/api/admin/dami/workflows/:id/audit", { params: { id } });
  assert.equal(audit.payload.events.some(e => e.eventType === "action.receipt_recorded"), true);
  assert.equal(audit.payload.externalActionExecution, false);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM admin_dami_receipts WHERE ownerId=?").get("owner1").n, 1);
  db.close();
});

test("Admin governance endpoints reject non-owner roles", async () => {
  const { call, db } = setup();
  const denied = await call("GET", "/api/admin/dami/knowledge", { role: "reviewer" });
  assert.equal(denied.status, 403);
  db.close();
});
