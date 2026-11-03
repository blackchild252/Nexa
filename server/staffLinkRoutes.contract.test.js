"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { createStaffLinks } = require("./staffLinks");
const { createStaffLinkRoutes } = require("./staffLinkRoutes");

// Minimal stand-in for express: records routes, runs the middleware chain, captures json.
function harness(deps) {
  const routes = [];
  const app = {}; for (const m of ["get", "post"]) app[m] = (p, ...h) => routes.push({ m, p, h });
  const links = createStaffLinks(new DatabaseSync(":memory:"));
  createStaffLinkRoutes({ links, A: (req, res, next) => (req.user ? next() : res.status(401).json({ error: "Sign in required." })), userExists: (id) => ["u1", "u2", "boss1", "dir1"].includes(id), isTwoFactorVerified: () => true, resolveActor: () => null, ...deps, }).register(app);
  async function call(method, url, { user, body, params } = {}) {
    const r = routes.find((x) => x.m === method && new RegExp("^" + x.p.replace(/:[^/]+/g, "[^/]+") + "$").test(url));
    if (!r) throw new Error("no route " + method + " " + url);
    const keys = [...r.p.matchAll(/:([^/]+)/g)].map((k) => k[1]); const vals = (url.match(new RegExp("^" + r.p.replace(/:[^/]+/g, "([^/]+)") + "$")) || []).slice(1);
    const req = { user, body, params: params || Object.fromEntries(keys.map((k, i) => [k, vals[i]])), ip: "1.1.1.1" };
    let out = { status: 200, json: null };
    const res = { status(c) { out.status = c; return this; }, json(j) { out.json = j; return this; } };
    for (const h of r.h) { let nexted = false; await h(req, res, () => { nexted = true; }); if (!nexted) break; }
    return out;
  }
  return { call, routes, links };
}
const vendorActor = { id: "boss1", tier: "vendor", bossId: "vendorA", cap: ["products", "orders", "uploads"] };
const directorActor = { id: "dir1", tier: "director", bossId: "d", cap: [] };
const asActor = (map) => (req) => map[req.user && req.user.id] || null;

test("M7769 routes require a signed-in user", async () => {
  const h = harness({});
  for (const [m, u] of [["post", "/api/staff-links/requests"], ["get", "/api/staff-links"], ["post", "/api/staff-links/x/decision"], ["post", "/api/staff-links/door/business-hub/sign-in"], ["post", "/api/staff-links/uploads"], ["post", "/api/staff-links/uploads/x/decision"]]) {
    assert.equal((await h.call(m, u, {})).status, 401, u);
  }
});
test("M7769 only a resolved boss can request; boss tier, id and cap come from the server, not the body", async () => {
  const h = harness({ resolveActor: asActor({ boss1: vendorActor }) });
  assert.equal((await h.call("post", "/api/staff-links/requests", { user: { id: "u2" }, body: { nexaUserId: "u1", unit: "business-hub" } })).status, 403);
  const r = await h.call("post", "/api/staff-links/requests", { user: { id: "boss1" }, body: { nexaUserId: "u1", unit: "business-hub", permissions: ["orders"], bossTier: "ceo", bossId: "evil", requestedBy: "evil" } });
  assert.equal(r.status, 201); assert.equal(r.json.link.bossTier, "vendor"); assert.equal(r.json.link.status, "pending");
  assert.equal(h.links.listForBoss("vendor", "vendorA").length, 1); assert.equal(h.links.listForBoss("ceo", "evil").length, 0);
});
test("M7769 unknown person, over-cap permissions and a second link for one account are refused", async () => {
  const h = harness({ resolveActor: asActor({ boss1: vendorActor }) });
  const call = (body) => h.call("post", "/api/staff-links/requests", { user: { id: "boss1" }, body: { unit: "business-hub", ...body } });
  assert.equal((await call({ nexaUserId: "ghost" })).status, 404);
  assert.equal((await call({ nexaUserId: "u1", permissions: ["sales_view"] })).json.code, "over_cap");
  assert.equal((await call({ nexaUserId: "u1", permissions: ["orders"] })).status, 201);
  assert.equal((await call({ nexaUserId: "u1", permissions: ["orders"] })).status, 409);
});
test("M7770/M7771 decision: right tier approves; wrong tier, the boss and the subject are refused; responses expose no internals", async () => {
  const h = harness({ resolveActor: asActor({ boss1: vendorActor, dir1: directorActor, u2: { id: "u2", tier: "director", bossId: "x", cap: [] } }) });
  const l = (await h.call("post", "/api/staff-links/requests", { user: { id: "boss1" }, body: { nexaUserId: "u1", unit: "business-hub", permissions: ["orders"], requestKey: "k" } })).json.link;
  assert.equal((await h.call("post", `/api/staff-links/${l.id}/decision`, { user: { id: "boss1" }, body: { decision: "approved" } })).status, 403);
  const ok = await h.call("post", `/api/staff-links/${l.id}/decision`, { user: { id: "dir1" }, body: { decision: "approved" } });
  assert.equal(ok.json.link.status, "approved");
  for (const k of ["requestKey", "requestedBy", "approverId", "bossId"]) assert.ok(!(k in ok.json.link), k);
});
test("M7773 door: fails closed without 2FA, works with it, and never lets the client choose the landing place", async () => {
  const mkApproved = async (twofa) => {
    const h = harness({ resolveActor: asActor({ boss1: vendorActor, dir1: directorActor }), isTwoFactorVerified: () => twofa });
    const l = (await h.call("post", "/api/staff-links/requests", { user: { id: "boss1" }, body: { nexaUserId: "u1", unit: "business-hub", permissions: ["orders"] } })).json.link;
    await h.call("post", `/api/staff-links/${l.id}/decision`, { user: { id: "dir1" }, body: { decision: "approved" } });
    return h;
  };
  const no = await (await mkApproved(false)).call("post", "/api/staff-links/door/business-hub/sign-in", { user: { id: "u1" } });
  assert.equal(no.status, 401); assert.equal(no.json.code, "staff_sign_in_failed");
  const yes = await (await mkApproved(true)).call("post", "/api/staff-links/door/business-hub/sign-in", { user: { id: "u1" }, body: { destination: "elsewhere" } });
  assert.equal(yes.status, 200); assert.equal(yes.json.destination.bossId, "vendorA");
  const stranger = await (await mkApproved(true)).call("post", "/api/staff-links/door/business-hub/sign-in", { user: { id: "u2" } });
  assert.deepEqual(stranger.json, no.json);
});
test("M7777 uploads over HTTP: staff submit, other vendor's owner is refused, own owner decides", async () => {
  const other = { id: "boss2", tier: "vendor", bossId: "vendorB", cap: [] };
  const h = harness({ resolveActor: asActor({ boss1: vendorActor, boss2: other, dir1: directorActor }) });
  const l = (await h.call("post", "/api/staff-links/requests", { user: { id: "boss1" }, body: { nexaUserId: "u1", unit: "business-hub", permissions: ["uploads"] } })).json.link;
  await h.call("post", `/api/staff-links/${l.id}/decision`, { user: { id: "dir1" }, body: { decision: "approved" } });
  const up = await h.call("post", "/api/staff-links/uploads", { user: { id: "u1" }, body: { kind: "product", payload: { name: "Hat" } } });
  assert.equal(up.status, 201); assert.equal(up.json.upload.status, "pending");
  assert.equal((await h.call("post", `/api/staff-links/uploads/${up.json.upload.id}/decision`, { user: { id: "boss2" }, body: { decision: "approved" } })).status, 403);
  assert.equal((await h.call("post", `/api/staff-links/uploads/${up.json.upload.id}/decision`, { user: { id: "boss1" }, body: { decision: "approved" } })).json.upload.status, "approved");
});
test("source: index.js wiring is fail-closed (2FA read from the session marker, only the vendor owner resolves)", () => {
  const src = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
  assert.match(src, /isTwoFactorVerified: \(req\) => !!\(req\.user && req\.user\.twoFactorVerified === true\)/);
  assert.match(src, /createStaffLinkRoutes\(\{[\s\S]*?\}\)\.register\(app\)/);
  assert.match(src, /tier: "vendor", bossId: v\.id/);
  assert.doesNotMatch(src, /tier: "(ceo|director|founder)", bossId/);
});
test("M7773 over HTTP: the Kitchen and Blaca doors need login and 2FA, and only let in Manager staff of that unit", async () => {
  const mk = (twofa) => {
    const h = harness({ isTwoFactorVerified: () => twofa });
    const { link } = h.links.createPendingLink({ nexaUserId: "u1", bossTier: "manager", bossId: "m1", unit: "kitchen", permissions: ["uploads"], requestedBy: "m1" }, { bossCap: ["uploads"] });
    h.links.decideLink(link.id, { id: "dir1", tier: "director" }, "approved");
    return h;
  };
  const doors = ["kitchen", "blaca-essentials"].map((d) => `/api/staff-links/door/${d}/sign-in`);
  const h = mk(true);
  for (const u of doors) assert.equal((await h.call("post", u, {})).status, 401, "needs login: " + u);
  const yes = await h.call("post", doors[0], { user: { id: "u1" }, body: { destination: "elsewhere", unit: "blaca-essentials" } });
  assert.equal(yes.status, 200);
  assert.deepEqual({ ...yes.json.destination }, { section: "manager-section", bossTier: "manager", bossId: "m1", unit: "kitchen" });
  const wrongDoor = await h.call("post", doors[1], { user: { id: "u1" } });
  const hub = await h.call("post", "/api/staff-links/door/business-hub/sign-in", { user: { id: "u1" } });
  assert.equal(wrongDoor.status, 401); assert.equal(wrongDoor.json.code, "staff_sign_in_failed");
  assert.deepEqual(hub.json, wrongDoor.json);
  const no2fa = await mk(false).call("post", doors[0], { user: { id: "u1" } });
  const stranger = await h.call("post", doors[0], { user: { id: "u2" } });
  assert.equal(no2fa.status, 401);
  assert.deepEqual(no2fa.json, wrongDoor.json);
  assert.deepEqual(stranger.json, wrongDoor.json);
});
test("M7773 over HTTP: the Blaca Essentials door lets in Blaca Manager staff only with a verified 2FA", async () => {
  const mk = (twofa) => {
    const h = harness({ isTwoFactorVerified: () => twofa });
    const { link } = h.links.createPendingLink({ nexaUserId: "u1", bossTier: "manager", bossId: "m2", unit: "blaca-essentials", permissions: ["stock"], requestedBy: "m2" }, { bossCap: ["stock"] });
    h.links.decideLink(link.id, { id: "dir1", tier: "director" }, "approved");
    return h;
  };
  const url = "/api/staff-links/door/blaca-essentials/sign-in";
  const yes = await mk(true).call("post", url, { user: { id: "u1" } });
  assert.equal(yes.status, 200);
  assert.deepEqual({ ...yes.json.destination }, { section: "manager-section", bossTier: "manager", bossId: "m2", unit: "blaca-essentials" });
  const no = await mk(false).call("post", url, { user: { id: "u1" } });
  assert.equal(no.status, 401); assert.equal(no.json.code, "staff_sign_in_failed");
  const kitchenDoor = await mk(true).call("post", "/api/staff-links/door/kitchen/sign-in", { user: { id: "u1" } });
  assert.deepEqual(kitchenDoor.json, no.json, "Blaca staff are refused at the Kitchen door with the same answer");
});
