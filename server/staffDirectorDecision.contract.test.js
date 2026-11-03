"use strict";
// M7780/M7786 over HTTP: the Administrative Director sees and decides staff requests. The Director is read from an active
// Admin AAMI grant stored in Main, never from the request.
const test = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const { createStaffLinks } = require("./staffLinks");
const { createStaffManagers } = require("./staffManagers");
const { createStaffDirectors } = require("./staffDirector");
const { createStaffLinkRoutes } = require("./staffLinkRoutes");

const GRANT_SQL = `CREATE TABLE admin_aami_privileged_access (
  applicationId TEXT PRIMARY KEY, targetUserId TEXT NOT NULL, companyId TEXT NOT NULL, productId TEXT NOT NULL, role TEXT NOT NULL,
  status TEXT NOT NULL, activationConfirmed INTEGER NOT NULL DEFAULT 0, seq INTEGER NOT NULL, lastEventId TEXT NOT NULL, reason TEXT NOT NULL, updatedAt TEXT NOT NULL)`;
let n = 0;
function grant(db, user, o = {}) {
  n++; const g = { companyId: "nexa", productId: "admin-aami", role: "administrative_director", status: "active", activationConfirmed: 1, ...o };
  db.prepare("INSERT INTO admin_aami_privileged_access VALUES (?,?,?,?,?,?,?,?,?,?,?)").run("app" + n, user, g.companyId, g.productId, g.role, g.status, g.activationConfirmed, 1, "e" + n, "test", "2026-10-27T00:00:00Z");
}
function setup({ withTable = true } = {}) {
  const db = new DatabaseSync(":memory:");
  if (withTable) db.exec(GRANT_SQL);
  const links = createStaffLinks(db); const managers = createStaffManagers(db, links); const directors = createStaffDirectors(db);
  const routes = []; const app = {}; for (const m of ["get", "post"]) app[m] = (p, ...h) => routes.push({ m, p, h });
  const known = ["kmgr", "bmgr", "plain", "s1", "s2", "dir1", "dir2", "gm1"];
  createStaffLinkRoutes({
    links, A: (req, res, next) => (req.user ? next() : res.status(401).json({ error: "Sign in required." })),
    userExists: (id) => known.includes(id), isTwoFactorVerified: () => true,
    resolveActor: (req) => { const m = managers.managerFor(req.user.id); return m ? { id: m.id, tier: "manager" } : null; },
    requestManagerStaff: (a, i) => managers.requestStaff(a, i),
    resolveApprover: (req) => directors.directorFor(req.user && req.user.id),
  }).register(app);
  async function call(method, url, { user, body, id } = {}) {
    const r = routes.find((x) => x.m === method && x.p === url); if (!r) throw new Error("no route " + url);
    const out = { status: 200, json: null }; const res = { status(c) { out.status = c; return this; }, json(j) { out.json = j; return this; } };
    for (const h of r.h) { let nx = false; await h({ user, body, params: { id }, ip: "1.1.1.1" }, res, () => { nx = true; }); if (!nx) break; }
    return out;
  }
  if (withTable) grant(db, "dir1");
  managers.appoint({ id: "dir1", tier: "director" }, { nexaUserId: "bmgr", unit: "blaca-essentials", reason: "Runs Blaca" });
  managers.appoint({ id: "dir1", tier: "director" }, { nexaUserId: "kmgr", unit: "kitchen", reason: "Runs Kitchen" });
  return { db, call, links, managers };
}
const ask = (h, u, body) => h.call("post", "/api/staff-links/requests", { user: { id: u }, body });
const pending = (h, u) => h.call("get", "/api/staff-links/pending", { user: { id: u } });
const decide = (h, u, id, body) => h.call("post", "/api/staff-links/:id/decision", { user: { id: u }, id, body });

test("the Director sees a Manager's pending request and approves it; the staff link becomes approved", async () => {
  const h = setup();
  const r = await ask(h, "bmgr", { nexaUserId: "s1", permissions: ["products", "uploads"] });
  const list = await pending(h, "dir1");
  assert.equal(list.status, 200); assert.equal(list.json.links.length, 1);
  assert.equal(list.json.links[0].id, r.json.link.id); assert.equal(list.json.links[0].bossId, "bmgr"); assert.equal(list.json.links[0].unit, "blaca-essentials");
  const d = await decide(h, "dir1", r.json.link.id, { decision: "approved" });
  assert.equal(d.status, 200); assert.equal(d.json.link.status, "approved");
  assert.equal((await pending(h, "dir1")).json.links.length, 0);
});
test("a rejection needs a reason and keeps it", async () => {
  const h = setup();
  const r = await ask(h, "kmgr", { nexaUserId: "s1", permissions: ["kitchen_sales"] });
  assert.equal((await decide(h, "dir1", r.json.link.id, { decision: "rejected" })).json.code, "reason_required");
  const d = await decide(h, "dir1", r.json.link.id, { decision: "rejected", reason: "Not a Kitchen hire" });
  assert.equal(d.json.link.status, "rejected"); assert.equal(d.json.link.decisionReason, "Not a Kitchen hire");
});
test("only the first decision wins", async () => {
  const h = setup(); grant(h.db, "dir2");
  const r = await ask(h, "bmgr", { nexaUserId: "s1", permissions: ["stock"] });
  assert.equal((await decide(h, "dir1", r.json.link.id, { decision: "approved" })).status, 200);
  const again = await decide(h, "dir2", r.json.link.id, { decision: "rejected", reason: "Too late" });
  assert.equal(again.status, 409); assert.equal(again.json.code, "already_decided");
});
test("a Manager, a plain user and signed-out callers cannot see or decide", async () => {
  const h = setup();
  const r = await ask(h, "bmgr", { nexaUserId: "s1", permissions: ["stock"] });
  for (const u of ["bmgr", "kmgr", "plain"]) {
    assert.equal((await pending(h, u)).status, 403, u + " list");
    assert.equal((await decide(h, u, r.json.link.id, { decision: "approved" })).status, 403, u + " decide");
  }
  assert.equal((await h.call("get", "/api/staff-links/pending", {})).status, 401);
  assert.equal(h.links.listForBoss("manager", "bmgr")[0].status, "pending");
});
test("only an ACTIVE, confirmed Administrative Director grant for NEXA counts", async () => {
  const h = setup(); const r = await ask(h, "bmgr", { nexaUserId: "s1", permissions: ["stock"] });
  grant(h.db, "gm1", { role: "general_manager" });
  grant(h.db, "plain", { status: "suspended" });
  grant(h.db, "s2", { companyId: "lordgistics" });
  grant(h.db, "unconfirmed", { activationConfirmed: 0 });
  for (const u of ["gm1", "plain", "s2", "unconfirmed"]) assert.equal((await decide(h, u, r.json.link.id, { decision: "approved" })).status, 403, u);
  h.db.prepare("UPDATE admin_aami_privileged_access SET status = 'revoked' WHERE targetUserId = 'dir1'").run();
  assert.equal((await decide(h, "dir1", r.json.link.id, { decision: "approved" })).status, 403, "revoked Director");
});
test("the body cannot make anyone a Director", async () => {
  const h = setup(); const r = await ask(h, "bmgr", { nexaUserId: "s1", permissions: ["stock"] });
  const d = await decide(h, "plain", r.json.link.id, { decision: "approved", tier: "director", approverTier: "director", id: "dir1" });
  assert.equal(d.status, 403);
});
test("a Director cannot approve their own account's request, and a missing grant table fails closed", async () => {
  const h = setup(); grant(h.db, "bmgr");
  const r = await ask(h, "bmgr", { nexaUserId: "s1", permissions: ["stock"] });
  assert.equal((await decide(h, "bmgr", r.json.link.id, { decision: "approved" })).json.code, "self_approval");
  const bare = setup({ withTable: false });
  assert.equal((await pending(bare, "dir1")).status, 403);
});
test("unknown request id is 404 for the Director", async () => {
  const h = setup();
  assert.equal((await decide(h, "dir1", "nope", { decision: "approved" })).status, 404);
});
