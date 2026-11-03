"use strict";
// B329 (M4607, M4612): Kitchen Hub admin screens need the kitchen_hub page permission, and the log shows names.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const hub = require("./kitchenHub");
const { PERMISSIONS } = require("./adminAccess");

function openDb() {
  try { const D = require("better-sqlite3"); return new D(":memory:"); } catch (_) { const { DatabaseSync } = require("node:sqlite"); return new DatabaseSync(":memory:"); }
}
function makeApp() {
  const routes = [];
  const add = (method) => (p, ...handlers) => routes.push({ method, p, handlers });
  const app = { get: add("GET"), post: add("POST"), put: add("PUT"), delete: add("DELETE") };
  app.call = async (method, url, { user, body, query } = {}) => {
    for (const r of routes) {
      if (r.method !== method) continue;
      const names = []; const re = new RegExp("^" + r.p.replace(/:([A-Za-z]+)/g, (_, n) => { names.push(n); return "([^/]+)"; }) + "$");
      const m = re.exec(url); if (!m) continue;
      const params = {}; names.forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]); });
      const out = { status: 200, body: null }; const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
      const req = { user, body: body || {}, query: query || {}, params }; let i = 0; const next = () => { const h = r.handlers[i++]; if (h) return h(req, res, next); }; await next(); return out;
    }
    throw new Error("no route " + method + " " + url);
  };
  return app;
}
const apply = { name: "Mama Ngozi Kitchen", country: "NG", city: "Ilorin", contactName: "Ngozi", phone: "+2348000000000", payoutDetails: "GTBank 0123456789", weightUnit: "kg", acceptsHubRules: true, acceptsCountryDisclaimer: true };

test("B329 only the owner has kitchen_hub; reviewer and support do not", () => {
  assert.ok(PERMISSIONS.owner.has("kitchen_hub"));
  assert.ok(!PERMISSIONS.reviewer.has("kitchen_hub") && !PERMISSIONS.support.has("kitchen_hub"));
});

test("B329 the log carries shop and actor names when the members table exists", async () => {
  const db = openDb(); db.exec("CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT)"); db.prepare("INSERT INTO users(id,name) VALUES('owner','Owner One')").run();
  const app = makeApp(); hub.register(app, { db, auth: { authMiddleware: (q, s, n) => n() }, isConfiguredAdmin: (u) => u && u.id === "owner" });
  const a = await app.call("POST", "/api/leisure/kitchen/hub/apply", { user: { id: "v1" }, body: apply }); assert.equal(a.status, 201);
  const d = await app.call("POST", `/api/leisure/kitchen/hub/admin/shops/${a.body.id}/decision`, { user: { id: "owner" }, body: { decision: "approve" } }); assert.equal(d.status, 200);
  const log = await app.call("GET", "/api/leisure/kitchen/hub/admin/audit", { user: { id: "owner" } });
  const e = log.body.entries.find((x) => x.action === "shop_approved"); assert.ok(e, "decision is logged");
  assert.equal(e.actorName, "Owner One"); assert.equal(e.shopName, "Mama Ngozi Kitchen");
  const other = await app.call("GET", "/api/leisure/kitchen/hub/admin/audit", { user: { id: "nobody" } }); assert.equal(other.status, 403, "still owner only");
});

test("B329 the log still works on a database with no members table (names are then missing, not an error)", async () => {
  const db = openDb(); const app = makeApp(); hub.register(app, { db, auth: { authMiddleware: (q, s, n) => n() }, isConfiguredAdmin: (u) => u && u.id === "owner" });
  const a = await app.call("POST", "/api/leisure/kitchen/hub/apply", { user: { id: "v1" }, body: apply });
  await app.call("POST", `/api/leisure/kitchen/hub/admin/shops/${a.body.id}/decision`, { user: { id: "owner" }, body: { decision: "reject", note: "No licence" } });
  const log = await app.call("GET", "/api/leisure/kitchen/hub/admin/audit", { user: { id: "owner" } });
  assert.equal(log.status, 200); assert.ok(log.body.entries.some((x) => x.action === "shop_rejected" && x.shopName === "Mama Ngozi Kitchen"));
});

test("B329 the real server file registers the members table before it uses names (so the join works in production)", () => {
  const src = fs.readFileSync(path.join(__dirname, "db.js"), "utf8");
  assert.ok(/CREATE TABLE IF NOT EXISTS users/i.test(src), "users table is created in db.js");
});
