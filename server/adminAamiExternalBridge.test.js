"use strict";
// V6.2.6: NEXA routes outside /api/admin/ (Mall moderation, Lifestyle reports) reachable by a verified Admin AAMI grant only.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { registerAdminAamiAccess, NEXA_SCOPED_EXTERNAL_ALLOWLIST, scopedNexaExternalPermission } = require("./adminAamiAccess");
const { create, } = require("./adminAccess");

const fakeDb = { exec() {}, prepare() { return { get() {}, all() { return []; }, run() { return { changes: 0 }; } }; }, transaction: (fn) => fn };
const admin = create({ db: fakeDb, isConfiguredAdmin: () => false });
const grant = (role, extra = {}) => ({ productId: "admin-aami", companyId: "nexa", role, ...extra });
function res() { return { statusCode: 200, body: null, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; } }; }
function rewriter() {
  const uses = [];
  registerAdminAamiAccess({ app: { post() {}, get() {}, use: (...a) => uses.push(a) }, db: { exec() {}, prepare() { return { get() {}, all() { return []; }, run() {} }; }, transaction: (f) => f }, auth: { authMiddleware() {} }, env: {} });
  return uses[uses.length - 1][0];   // the rewrite middleware is the last one installed
}
function pass(req) { const r = res(); let nextCalled = false; rewriter()(req, r, () => { nextCalled = true; }); return { r, nextCalled }; }
const call = (method, url, access = grant("administrative_director")) => { const req = { method, originalUrl: url, url, adminAamiAccess: access }; return { req, ...pass(req) }; };

test("the 21 bridged external calls (18 patterns) map to their real path and nothing else", () => {
  const cases = [
    ["GET", "mall/admin/status"], ["GET", "mall/admin/vendor-subscriptions/launch-offer"], ["GET", "mall/admin/reviews"], ["PATCH", "mall/admin/reviews/r1/moderation"],
    ["GET", "mall/admin/review-reports"], ["PATCH", "mall/admin/review-reports/q1/status"], ["GET", "mall/admin/disputes"], ["POST", "mall/admin/disputes/d1/resolve"],
    ["GET", "lifestyle/reports"], ["DELETE", "lifestyle/reports/p1/post"], ["POST", "lifestyle/reports/p1/dismiss"],
    ["GET", "lifestyle/comment-reports"], ["DELETE", "lifestyle/comment-reports/c1/comment"], ["POST", "lifestyle/comment-reports/c1/dismiss"],
    // V6.2.8: the seven Administrative Director calls
    ["GET", "fitness/admin/gyms"], ["POST", "fitness/admin/gyms/g1/review"], ["GET", "leisure/admin/operations"], ["GET", "leisure/kitchen/hub/admin/applications"],
    ["GET", "leisure/kitchen/hub/admin/audit"], ["POST", "leisure/kitchen/hub/admin/shops/s1/decision"], ["GET", "business/youtube/config"],
  ];
  for (const [method, p] of cases) {
    const out = call(method, `/api/admin-aami/nexa/x/${p}?status=open`);
    assert.equal(out.nextCalled, true, `${method} ${p}`);
    assert.equal(out.req.url, `/api/${p}?status=open`);
  }
  assert.equal(NEXA_SCOPED_EXTERNAL_ALLOWLIST.length, 18);
});

test("routes with no Director permission stay closed (other Mall and wallet routes)", () => {
  for (const [method, p] of [["GET", "mall/vendor/orders"], ["GET", "wallet/balance"], ["GET", "fitness/admin/gyms/g1"], ["POST", "fitness/admin/gyms"], ["GET", "leisure/kitchen/hub/admin/shops"],
    ["POST", "business/youtube/config"], ["GET", "admin/youtube/channels"]]) {
    const out = call(method, `/api/admin-aami/nexa/x/${p}`);
    assert.equal(out.nextCalled, false, `${method} ${p}`);
    assert.equal(out.r.statusCode, 404);
  }
});

test("wrong method, traversal, encoded slashes and extra segments are refused", () => {
  for (const [method, url] of [["DELETE", "/api/admin-aami/nexa/x/mall/admin/disputes"], ["GET", "/api/admin-aami/nexa/x/mall/admin/disputes/d1/resolve"], ["POST", "/api/admin-aami/nexa/x/mall/admin/disputes/d1/resolve/extra"],
    ["GET", "/api/admin-aami/nexa/x/mall/admin/../../admin/users"], ["GET", "/api/admin-aami/nexa/x/mall/admin%2fdisputes"], ["GET", "/api/admin-aami/nexa/x/lifestyle/reports/../../wallet"], ["GET", "/api/admin-aami/nexa/x/"]]) {
    const out = call(method, url);
    assert.equal(out.nextCalled, false, `${method} ${url}`);
  }
});

test("a missing or non-NEXA grant never reaches the external routes", () => {
  assert.equal(call("GET", "/api/admin-aami/nexa/x/mall/admin/disputes", null).r.statusCode, 403);
  assert.equal(call("GET", "/api/admin-aami/nexa/x/mall/admin/disputes", grant("administrative_director", { companyId: "lordgistics" })).r.statusCode, 403);
  assert.equal(call("GET", "/api/admin-aami/nexa/x/mall/admin/disputes", grant("administrative_director", { productId: "nexa-main" })).r.statusCode, 403);
});

test("the existing /api/admin/* bridge is unchanged", () => {
  const ok = call("GET", "/api/admin-aami/nexa/summary");
  assert.equal(ok.nextCalled, true); assert.equal(ok.req.url, "/api/admin/summary");
  assert.equal(call("GET", "/api/admin-aami/nexa/mall/admin/disputes").nextCalled, false, "without the /x/ prefix an external route is not reachable");
});

test("every allowlisted route's permission exists for the Administrative Director; writes and disputes are Director only", () => {
  const dir = admin.ADMIN_AAMI_PERMISSIONS.administrative_director;
  for (const [, perm] of NEXA_SCOPED_EXTERNAL_ALLOWLIST) assert.ok(dir.has(perm), perm);
  for (const role of ["general_manager", "group_director"]) {
    const set = admin.ADMIN_AAMI_PERMISSIONS[role];
    for (const p of ["mall_disputes", "mall_reviews_write", "social_reports_write"]) assert.equal(set.has(p), false, `${role} ${p}`);
    for (const p of ["mall", "violations"]) assert.equal(set.has(p), true, `${role} ${p}`);
  }
  assert.equal(scopedNexaExternalPermission("POST", "/api/mall/admin/disputes/d1/resolve"), "mall_disputes");
});

test("allowRoute: a scoped grant is decided only by its permissions; unscoped keeps the route's own check", () => {
  assert.equal(admin.allowRoute({ user: { id: "u" } }, "mall", true), true);
  assert.equal(admin.allowRoute({ user: { id: "u" } }, "mall", false), false);
  assert.equal(admin.allowRoute({ user: { id: "u" } }, "mall", undefined), false);
  assert.equal(admin.allowRoute({ user: { id: "u" }, adminAamiAccess: grant("general_manager") }, "mall_disputes", true), false, "owner flag must not widen a scoped grant");
  assert.equal(admin.allowRoute({ user: { id: "u" }, adminAamiAccess: grant("administrative_director") }, "mall_disputes", false), true);
  assert.equal(admin.allowRoute({ user: { id: "u" }, adminAamiAccess: grant("administrative_director", { companyId: "lordgistics" }) }, "mall", true), false);
  assert.equal(admin.allowRoute({ user: { id: "u" }, adminAamiAccess: grant("unknown_role") }, "mall", true), false);
});

test("scopedGate: unscoped requests pass through; scoped requests need the permission and respect step-up", () => {
  const gate = admin.scopedGate("mall_disputes");
  const run = (req) => { const r = res(); let n = false; gate(req, r, () => { n = true; }); return { r, n }; };
  assert.equal(run({ user: { id: "u" } }).n, true);
  assert.equal(run({ user: { id: "u" }, adminAamiAccess: grant("administrative_director") }).n, true);
  const gm = run({ user: { id: "u" }, adminAamiAccess: grant("general_manager") });
  assert.equal(gm.n, false); assert.equal(gm.r.statusCode, 403);
  const stepped = create({ db: fakeDb, isConfiguredAdmin: () => false });
  stepped.setStepUpPolicy({ actionFor: () => "financial_action", validate: () => false, requiresMfa: () => true });
  const r = res(); let n = false; stepped.scopedGate("mall_disputes")({ user: { id: "u" }, path: "/api/mall/admin/disputes/d1/resolve", method: "POST", adminAamiAccess: grant("administrative_director") }, r, () => { n = true; });
  assert.equal(n, false); assert.equal(r.statusCode, 428); assert.equal(r.body.code, "STEP_UP_REQUIRED");
});

test("source contract: the seven Mall routes and four Lifestyle writes use the scoped-aware guards", () => {
  const index = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
  for (const route of ["/api/mall/admin/reviews\"", "/api/mall/admin/reviews/:reviewId/moderation\"", "/api/mall/admin/review-reports\"", "/api/mall/admin/review-reports/:reportId/status\"", "/api/mall/admin/disputes\"", "/api/mall/admin/disputes/:disputeId/resolve\""]) {
    const line = index.split("\n").find((l) => l.includes(`"${route}`) || l.includes(route));
    assert.ok(line && line.includes("mallAdminFor("), route);
    assert.equal(line.includes("requireMallAdmin"), false, route);
  }
  for (const route of ["mall/admin/reviews/:reviewId/moderation", "mall/admin/review-reports/:reportId/status", "mall/admin/disputes/:disputeId/resolve"]) assert.ok(index.split("\n").find((l) => l.includes(route)).includes("scopedGate("), route);
  assert.ok(index.includes('adminAccess.allowRoute(req,"mall",isConfiguredAdmin(req.user))'));
  const life = fs.readFileSync(path.join(__dirname, "lifestyle.js"), "utf8");
  assert.equal((life.match(/scopedGate\("social_reports_write"\)/g) || []).length, 4);
  assert.equal((life.match(/mayReview\(req, "social_reports_write"\)/g) || []).length, 4);
});
