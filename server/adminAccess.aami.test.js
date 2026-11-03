"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { create } = require("./adminAccess");

function fakeDb() {
  return {
    exec() {},
    prepare() { return { get() { return undefined; }, all() { return []; }, run() { return { changes: 0 }; } }; },
  };
}
function run(middleware, req) {
  const res = { statusCode: 200, body: null, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; } };
  let next = false; middleware(req, res, () => { next = true; }); return { res, next };
}

test("Admin AAMI NEXA Director has only the explicitly granted business permissions", () => {
  const admin = create({ db: fakeDb(), isConfiguredAdmin: () => false });
  const req = { user: { id: "director-1" }, adminAamiAccess: { productId: "admin-aami", companyId: "nexa", role: "administrative_director" } };
  assert.equal(admin.canRequest(req, "vendors_read"), true);
  assert.equal(admin.canRequest(req, "vendors_moderate"), true);
  assert.equal(admin.canRequest(req, "admins"), false);
  // Owner-approved (B538): Administrative Director may read the audit log, the financial-operations views and the Customer Care queue.
  for (const p of ["audit", "payments", "staff_work"]) assert.equal(admin.canRequest(req, p), true, p);
  // Still never granted to Admin AAMI roles: owner-only, security and removal permissions.
  for (const p of ["security", "operations", "launch", "users_remove", "vendors_remove", "approvals", "approval_center"]) assert.equal(admin.canRequest(req, p), false, p);
  // General Manager and Group Director do not receive the new permissions.
  for (const role of ["general_manager", "group_director"]) {
    const r = { user: { id: "u" }, adminAamiAccess: { productId: "admin-aami", companyId: "nexa", role } };
    for (const p of ["audit", "payments", "staff_work"]) assert.equal(admin.canRequest(r, p), false, `${role} ${p}`);
  }
  assert.ok(admin.ADMIN_AAMI_PERMISSIONS.administrative_director instanceof Set);
});

test("legacy Admin permission middleware accepts a scoped NEXA grant only when the request carries it", () => {
  const admin = create({ db: fakeDb(), isConfiguredAdmin: () => false });
  const scoped = run(admin.require("vendors_read"), { user: { id: "director-1" }, adminAamiAccess: { productId: "admin-aami", companyId: "nexa", role: "administrative_director" } });
  assert.equal(scoped.next, true);
  const direct = run(admin.require("vendors_read"), { user: { id: "director-1" } });
  assert.equal(direct.next, false);
  assert.equal(direct.res.statusCode, 403);
  const crossCompany = run(admin.require("vendors_read"), { user: { id: "director-1" }, adminAamiAccess: { productId: "admin-aami", companyId: "lordgistics", role: "administrative_director" } });
  assert.equal(crossCompany.next, false);
  assert.equal(crossCompany.res.statusCode, 403);
});


test("an invalid or cross-company scoped grant never falls back to a legacy/global Admin role", () => {
  const admin = create({ db: fakeDb(), isConfiguredAdmin: (user) => user?.id === "global-owner" });
  const user = { id: "global-owner" };
  assert.equal(admin.canRequest({ user, adminAamiAccess: { productId: "admin-aami", companyId: "lordgistics", role: "administrative_director" } }, "users_read"), false);
  assert.equal(admin.canRequest({ user, adminAamiAccess: { productId: "admin-aami", companyId: "nexa", role: "owner" } }, "users_read"), false);
  assert.equal(admin.canRequest({ user }, "users_read"), true, "legacy Admin access remains available when no scoped grant is attached");
});
