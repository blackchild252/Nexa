"use strict";
// V6.2.8: seven formerly owner-only NEXA routes are reachable by a verified Administrative Director grant, and by nobody else new.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const hub = require("./kitchenHub");
const { create, PERMISSIONS } = require("./adminAccess");
const { scopedNexaExternalPermission } = require("./adminAamiAccess");

function openDb() {
  try { const D = require("better-sqlite3"); return new D(":memory:"); } catch (_) { const { DatabaseSync } = require("node:sqlite"); return new DatabaseSync(":memory:"); }
}
function makeApp() {
  const routes = [];
  const add = (method) => (p, ...handlers) => routes.push({ method, p, handlers });
  const app = { get: add("GET"), post: add("POST"), put: add("PUT"), delete: add("DELETE") };
  app.call = async (method, url, { user, body, query, adminAamiAccess } = {}) => {
    for (const r of routes) {
      if (r.method !== method) continue;
      const names = []; const re = new RegExp("^" + r.p.replace(/:([A-Za-z]+)/g, (_, n) => { names.push(n); return "([^/]+)"; }) + "$");
      const m = re.exec(url); if (!m) continue;
      const params = {}; names.forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]); });
      const out = { status: 200, body: null }; const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
      const req = { user, body: body || {}, query: query || {}, params }; if (adminAamiAccess !== undefined) req.adminAamiAccess = adminAamiAccess;
      let i = 0; const next = () => { const h = r.handlers[i++]; if (h) return h(req, res, next); }; await next(); return out;
    }
    throw new Error("no route " + method + " " + url);
  };
  return app;
}
const SEVEN = [
  ["GET", "/api/fitness/admin/gyms", "fitness_gyms"],
  ["POST", "/api/fitness/admin/gyms/g1/review", "fitness_gyms_write"],
  ["GET", "/api/leisure/admin/operations", "leisure_ops"],
  ["GET", "/api/leisure/kitchen/hub/admin/applications", "kitchen_hub"],
  ["GET", "/api/leisure/kitchen/hub/admin/audit", "kitchen_hub"],
  ["POST", "/api/leisure/kitchen/hub/admin/shops/s1/decision", "kitchen_hub_decide"],
  ["GET", "/api/business/youtube/config", "creator_content"],
];
const NEW_PERMS = ["fitness_gyms", "fitness_gyms_write", "leisure_ops", "kitchen_hub", "kitchen_hub_decide", "creator_content"];
const grant = (role, extra = {}) => ({ productId: "admin-aami", companyId: "nexa", role, ...extra });
const fakeDb = { exec() {}, prepare() { return { get() {}, all() { return []; }, run() { return { changes: 0 }; } }; } };
const admin = create({ db: fakeDb, isConfiguredAdmin: () => false });

test("each of the seven routes maps to its own Director permission on Main", () => {
  for (const [method, p, perm] of SEVEN) assert.equal(scopedNexaExternalPermission(method, p), perm, `${method} ${p}`);
});

test("only the Administrative Director gets the six permissions; General Manager, Group Director, reviewer and support get none", () => {
  for (const perm of NEW_PERMS) {
    assert.equal(admin.ADMIN_AAMI_PERMISSIONS.administrative_director.has(perm), true, `director ${perm}`);
    assert.equal(admin.ADMIN_AAMI_PERMISSIONS.general_manager.has(perm), false, `general_manager ${perm}`);
    assert.equal(admin.ADMIN_AAMI_PERMISSIONS.group_director.has(perm), false, `group_director ${perm}`);
    assert.equal(PERMISSIONS.reviewer.has(perm), false, `reviewer ${perm}`);
    assert.equal(PERMISSIONS.support.has(perm), false, `support ${perm}`);
    assert.equal(PERMISSIONS.owner.has(perm), true, `owner ${perm}`);
  }
});

test("canRequest: a scoped grant is decided by its role only; a malformed or other-company grant is refused", () => {
  for (const perm of NEW_PERMS) {
    assert.equal(admin.canRequest({ user: { id: "u" }, adminAamiAccess: grant("administrative_director") }, perm), true, perm);
    assert.equal(admin.canRequest({ user: { id: "u" }, adminAamiAccess: grant("general_manager") }, perm), false, perm);
    assert.equal(admin.canRequest({ user: { id: "u" }, adminAamiAccess: grant("group_director") }, perm), false, perm);
    assert.equal(admin.canRequest({ user: { id: "u" }, adminAamiAccess: grant("administrative_director", { companyId: "lordgistics" }) }, perm), false, perm);
    assert.equal(admin.canRequest({ user: { id: "u" }, adminAamiAccess: grant("administrative_director", { productId: "nexa-main" }) }, perm), false, perm);
    assert.equal(admin.canRequest({ user: { id: "u" }, adminAamiAccess: null }, perm), false, perm);
    assert.equal(admin.allowRoute({ user: { id: "owner" }, adminAamiAccess: grant("general_manager") }, perm, true), false, `owner list never applies to a scoped request: ${perm}`);
    assert.equal(admin.allowRoute({ user: { id: "owner" } }, perm, true), true, `unscoped owner keeps access: ${perm}`);
    assert.equal(admin.allowRoute({ user: { id: "nobody" } }, perm, false), false, `unscoped non-owner refused: ${perm}`);
  }
});

test("Kitchen Hub routes (real handlers): Director with the grant works, General Manager, wrong company and plain users are refused, owner unchanged", async () => {
  const db = openDb(); db.exec("CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT)");
  const adminAccess = create({ db, isConfiguredAdmin: (u) => !!u && u.id === "owner" });
  const app = makeApp();
  hub.register(app, { db, auth: { authMiddleware: (q, s, n) => n() }, isConfiguredAdmin: (u) => !!u && u.id === "owner", admin: { allowRoute: (...a) => adminAccess.allowRoute(...a), scopedGate: (p) => (q, s, n) => adminAccess.scopedGate(p)(q, s, n) } });
  const apply = { name: "Mama Ngozi Kitchen", country: "NG", city: "Ilorin", contactName: "Ngozi", phone: "+2348000000000", payoutDetails: "GTBank 0123456789", weightUnit: "kg", acceptsHubRules: true, acceptsCountryDisclaimer: true };
  const a = await app.call("POST", "/api/leisure/kitchen/hub/apply", { user: { id: "v1" }, body: apply }); assert.equal(a.status, 201);
  const dir = { user: { id: "dir" }, adminAamiAccess: grant("administrative_director") };
  assert.equal((await app.call("GET", "/api/leisure/kitchen/hub/admin/applications", dir)).status, 200);
  assert.equal((await app.call("GET", "/api/leisure/kitchen/hub/admin/audit", dir)).status, 200);
  for (const bad of [
    { user: { id: "gm" }, adminAamiAccess: grant("general_manager") },
    { user: { id: "gd" }, adminAamiAccess: grant("group_director") },
    { user: { id: "dir2" }, adminAamiAccess: grant("administrative_director", { companyId: "lordgistics" }) },
    { user: { id: "owner" }, adminAamiAccess: grant("general_manager") },
    { user: { id: "nobody" } },
  ]) {
    assert.equal((await app.call("GET", "/api/leisure/kitchen/hub/admin/applications", bad)).status, 403, JSON.stringify(bad));
    assert.equal((await app.call("GET", "/api/leisure/kitchen/hub/admin/audit", bad)).status, 403);
    assert.equal((await app.call("POST", `/api/leisure/kitchen/hub/admin/shops/${a.body.id}/decision`, { ...bad, body: { decision: "approve" } })).status, 403);
  }
  const pending = db.prepare("SELECT status FROM hub_shops WHERE id=?").get(a.body.id); assert.equal(pending.status, "pending", "refused calls changed nothing");
  const d = await app.call("POST", `/api/leisure/kitchen/hub/admin/shops/${a.body.id}/decision`, { ...dir, body: { decision: "approve" } }); assert.equal(d.status, 200);
  assert.equal(db.prepare("SELECT status FROM hub_shops WHERE id=?").get(a.body.id).status, "approved");
  const owner = await app.call("GET", "/api/leisure/kitchen/hub/admin/applications", { user: { id: "owner" } }); assert.equal(owner.status, 200);
  const entry = db.prepare("SELECT actorId,action FROM hub_audit WHERE shopId=? AND action='shop_approved'").get(a.body.id);
  assert.equal(entry.actorId, "dir", "the Director's own id is in the Kitchen Hub log");
});

test("Kitchen Hub keeps the owner-only check when no admin helper is passed", async () => {
  const db = openDb(); const app = makeApp();
  hub.register(app, { db, auth: { authMiddleware: (q, s, n) => n() }, isConfiguredAdmin: (u) => !!u && u.id === "owner" });
  assert.equal((await app.call("GET", "/api/leisure/kitchen/hub/admin/audit", { user: { id: "dir" }, adminAamiAccess: grant("administrative_director") })).status, 403);
  assert.equal((await app.call("GET", "/api/leisure/kitchen/hub/admin/audit", { user: { id: "owner" } })).status, 200);
});

test("source contract: fitness and leisure routes use the grant-aware check; the review write also uses the scoped gate; YouTube config needs creator_content", () => {
  const src = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
  const line = (needle) => { const i = src.indexOf(needle); assert.ok(i >= 0, needle); return src.slice(i, src.indexOf("\n", src.indexOf("\n", i) + 1)); };
  assert.match(line('app.get("/api/leisure/admin/operations"'), /allowRoute\(req, "leisure_ops", isConfiguredAdmin\(req\.user\)\)/);
  assert.match(line('app.get("/api/fitness/admin/gyms"'), /allowRoute\(req, "fitness_gyms", isConfiguredAdmin\(req\.user\)\)/);
  const review = line('app.post("/api/fitness/admin/gyms/:id/review"');
  assert.match(review, /adminAccess\.scopedGate\("fitness_gyms_write"\)/); assert.match(review, /allowRoute\(req, "fitness_gyms_write", isConfiguredAdmin\(req\.user\)\)/);
  assert.doesNotMatch(review, /if\s*\(\s*!isConfiguredAdmin\(req\.user\)\)/);
  const yt = fs.readFileSync(path.join(__dirname, "youtubeContent.js"), "utf8");
  assert.match(yt, /"\/api\/business\/youtube\/config",auth\.authMiddleware,admin\?\.require \? admin\.require\("creator_content"\)/);
  assert.match(src, /require\("\.\/kitchenHub"\)\.register\(app,\{[^}]*admin:\{allowRoute/);
});
