"use strict";
// M7780 over HTTP: a Manager asks for their own staff from the app. Boss, tier and unit come from the appointment, never the body.
const test = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const { createStaffLinks } = require("./staffLinks");
const { createStaffManagers } = require("./staffManagers");
const { createStaffLinkRoutes } = require("./staffLinkRoutes");

const dir = { id: "dir1", tier: "director" };
function setup() {
  const db = new DatabaseSync(":memory:");
  const links = createStaffLinks(db); const managers = createStaffManagers(db, links);
  const routes = []; const app = {}; for (const m of ["get", "post"]) app[m] = (p, ...h) => routes.push({ m, p, h });
  const known = ["kmgr", "bmgr", "plain", "s1", "s2", "s3", "dir1"];
  createStaffLinkRoutes({
    links, A: (req, res, next) => (req.user ? next() : res.status(401).json({ error: "Sign in required." })),
    userExists: (id) => known.includes(id), isTwoFactorVerified: () => true,
    resolveActor: (req) => { const m = managers.managerFor(req.user.id); return m ? { id: m.id, tier: "manager" } : null; },
    requestManagerStaff: (a, i) => managers.requestStaff(a, i),
  }).register(app);
  async function call(method, url, { user, body } = {}) {
    const r = routes.find((x) => x.m === method && x.p === url); if (!r) throw new Error("no route " + url);
    const out = { status: 200, json: null }; const res = { status(c) { out.status = c; return this; }, json(j) { out.json = j; return this; } };
    for (const h of r.h) { let n = false; await h({ user, body, params: {}, ip: "1.1.1.1" }, res, () => { n = true; }); if (!n) break; }
    return out;
  }
  managers.appoint(dir, { nexaUserId: "kmgr", unit: "kitchen", reason: "Runs the Kitchen" });
  managers.appoint(dir, { nexaUserId: "bmgr", unit: "blaca-essentials", reason: "Runs Blaca" });
  return { call, links, managers };
}
const ask = (h, user, body) => h.call("post", "/api/staff-links/requests", { user: { id: user }, body });

test("a Blaca Manager asks for staff; the link is pending for the Director and tied to Blaca", async () => {
  const h = setup();
  const r = await ask(h, "bmgr", { nexaUserId: "s1", permissions: ["products", "uploads"], requestKey: "k1" });
  assert.equal(r.status, 201); assert.equal(r.json.link.status, "pending");
  assert.equal(r.json.link.bossTier, "manager"); assert.equal(r.json.link.unit, "blaca-essentials");
  assert.equal(h.links.listForBoss("manager", "bmgr").length, 1);
  assert.equal((await ask(h, "bmgr", { nexaUserId: "s1", permissions: ["products", "uploads"], requestKey: "k1" })).status, 200, "same key replays");
});
test("the body cannot choose unit, boss or tier", async () => {
  const h = setup();
  const r = await ask(h, "bmgr", { nexaUserId: "s1", permissions: ["stock"], unit: "kitchen", bossId: "kmgr", bossTier: "ceo", requestedBy: "kmgr" });
  assert.equal(r.status, 201); assert.equal(r.json.link.unit, "blaca-essentials");
  assert.equal(h.links.listForBoss("manager", "kmgr").length, 0);
});
test("permissions outside the unit are refused (kitchen_sales is not a Blaca permission)", async () => {
  const h = setup();
  assert.equal((await ask(h, "bmgr", { nexaUserId: "s1", permissions: ["kitchen_sales"] })).json.code, "permission_not_for_unit");
  assert.equal((await ask(h, "kmgr", { nexaUserId: "s1", permissions: ["kitchen_sales"] })).status, 201);
});
test("a non-Manager, a suspended Manager and a removed Manager cannot ask", async () => {
  const h = setup();
  assert.equal((await ask(h, "plain", { nexaUserId: "s1", permissions: ["stock"] })).status, 403);
  h.managers.suspend(dir, "bmgr", "Under review");
  assert.equal((await ask(h, "bmgr", { nexaUserId: "s1", permissions: ["stock"] })).status, 403);
  h.managers.restore(dir, "bmgr", "Cleared");
  assert.equal((await ask(h, "bmgr", { nexaUserId: "s1", permissions: ["stock"] })).status, 201);
  h.managers.remove(dir, "bmgr", "Left the role");
  assert.equal((await ask(h, "bmgr", { nexaUserId: "s2", permissions: ["stock"] })).status, 403);
});
test("a Manager cannot request another Manager as staff, and unknown people are not found", async () => {
  const h = setup();
  assert.equal((await ask(h, "bmgr", { nexaUserId: "kmgr", permissions: ["stock"] })).status, 409);
  assert.equal((await ask(h, "bmgr", { nexaUserId: "ghost", permissions: ["stock"] })).status, 404);
});
