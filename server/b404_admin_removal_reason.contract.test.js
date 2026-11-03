"use strict";
// Permanent account and vendor removal must carry a reason, and the reason must reach the audit log.
const test = require("node:test");
const assert = require("node:assert/strict");
const adminAccess = require("./adminAccess");
const adminOps = require("./adminOps");
const accountLifecycle = require("./accountLifecycle");
const vendorSubscriptions = require("./vendorSubscriptions");

function openDb() {
  try { const D = require("better-sqlite3"); return new D(":memory:"); } catch (_) {
    const { DatabaseSync } = require("node:sqlite");
    const raw = new DatabaseSync(":memory:");
    return { exec: (s) => raw.exec(s), prepare: (s) => raw.prepare(s), transaction: (fn) => (...a) => { raw.exec("BEGIN"); try { const r = fn(...a); raw.exec("COMMIT"); return r; } catch (e) { raw.exec("ROLLBACK"); throw e; } } };
  }
}
function makeApp() {
  const routes = [];
  const add = (method) => (p, ...handlers) => routes.push({ method, p, handlers });
  const app = { get: add("GET"), post: add("POST"), put: add("PUT"), patch: add("PATCH"), delete: add("DELETE") };
  app.call = async (method, url, { user, body } = {}) => {
    for (const r of routes) {
      if (r.method !== method) continue;
      const names = []; const re = new RegExp("^" + r.p.replace(/:([A-Za-z]+)/g, (_, n) => { names.push(n); return "([^/]+)"; }) + "$");
      const m = re.exec(url); if (!m) continue;
      const params = {}; names.forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]); });
      const req = { user, body: body || {}, query: {}, params };
      const out = { status: 200, body: null };
      const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
      let i = 0; const next = () => { const h = r.handlers[i++]; if (h) return h(req, res, next); };
      await next(); return out;
    }
    throw new Error("no route " + method + " " + url);
  };
  return app;
}
function setup() {
  process.env.NEXA_ADMIN_USER_IDS = "owner";
  const db = openDb();
  db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY, email TEXT, name TEXT, username TEXT, avatarUrl TEXT, createdAt TEXT, accountStatus TEXT NOT NULL DEFAULT 'active');
    CREATE TABLE vendors(id TEXT PRIMARY KEY, userId TEXT UNIQUE, shopName TEXT, bio TEXT, createdAt TEXT);`);
  for (const id of ["owner", "rev", "ann", "shopper"]) db.prepare("INSERT INTO users(id,email,name,createdAt) VALUES(?,?,?,?)").run(id, `${id}@x.test`, id, new Date().toISOString());
  db.prepare("INSERT INTO vendors(id,userId,shopName,createdAt) VALUES(?,?,?,?)").run("v1", "shopper", "Shopper Stores", new Date().toISOString());
  const admin = adminAccess.create({ db, isConfiguredAdmin: (u) => u && u.id === "owner" });
  db.prepare("INSERT INTO admin_users(userId,role,addedBy,createdAt) VALUES(?,?,?,?)").run("rev", "reviewer", "owner", "x");
  const app = makeApp();
  adminOps.register(app, { db, auth: { authMiddleware: (_q, _s, n) => n() }, admin });
  return { db, app };
}
const OWNER = { id: "owner", email: "owner@x.test", name: "owner" };
const REVIEWER = { id: "rev", email: "rev@x.test", name: "rev" };
const lastAudit = (db, action) => db.prepare("SELECT detail,actorId FROM admin_audit WHERE action=? ORDER BY createdAt DESC LIMIT 1").get(action);

test("removing an account without a real reason is refused and nothing is closed", async () => {
  const { app, db } = setup();
  let closed = 0; const real = accountLifecycle.closeAccount; accountLifecycle.closeAccount = () => { closed++; return {}; };
  try {
    for (const body of [undefined, {}, { reason: "" }, { reason: "  ab " }]) {
      const r = await app.call("DELETE", "/api/admin/users/ann", { user: OWNER, body });
      assert.equal(r.status, 400, JSON.stringify(body));
    }
    assert.equal(closed, 0);
    assert.equal(lastAudit(db, "user_removed_from_platform"), undefined);
  } finally { accountLifecycle.closeAccount = real; }
});

test("removing an account stores the trimmed, capped reason in the audit log", async () => {
  const { app, db } = setup();
  const real = accountLifecycle.closeAccount; accountLifecycle.closeAccount = () => ({ closed: true });
  try {
    const r = await app.call("DELETE", "/api/admin/users/ann", { user: OWNER, body: { reason: "  Repeated fraud reports  " } });
    assert.equal(r.status, 200); assert.equal(r.body.removed, true);
    const a = lastAudit(db, "user_removed_from_platform");
    assert.match(a.detail, /Repeated fraud reports/); assert.equal(a.actorId, "owner");
    await app.call("DELETE", "/api/admin/users/rev", { user: OWNER, body: { reason: "x".repeat(900) } });
  } finally { accountLifecycle.closeAccount = real; }
});

test("removing a vendor needs a reason and records it", async () => {
  const { app, db } = setup();
  let closed = 0; const real = vendorSubscriptions.closeVendorForAccount; vendorSubscriptions.closeVendorForAccount = () => { closed++; return {}; };
  try {
    assert.equal((await app.call("DELETE", "/api/admin/vendors/v1", { user: OWNER, body: {} })).status, 400);
    assert.equal(closed, 0);
    const r = await app.call("DELETE", "/api/admin/vendors/v1", { user: OWNER, body: { reason: "Counterfeit goods" } });
    assert.equal(r.status, 200); assert.equal(closed, 1);
    assert.match(lastAudit(db, "vendor_removed_from_platform").detail, /Counterfeit goods/);
  } finally { vendorSubscriptions.closeVendorForAccount = real; }
});

test("the removal routes stay owner-only, with or without a reason", async () => {
  const { app } = setup();
  const u = await app.call("DELETE", "/api/admin/users/ann", { user: REVIEWER, body: { reason: "Spam accounts" } });
  const v = await app.call("DELETE", "/api/admin/vendors/v1", { user: REVIEWER, body: { reason: "Spam shop" } });
  assert.equal(u.status, 403); assert.equal(v.status, 403);
});

test("removing yourself or another admin is still refused", async () => {
  const { app } = setup();
  assert.equal((await app.call("DELETE", "/api/admin/users/owner", { user: OWNER, body: { reason: "Testing" } })).status, 400);
  assert.equal((await app.call("DELETE", "/api/admin/users/rev", { user: OWNER, body: { reason: "Testing" } })).status, 403);
});
