"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("./staffLinks");
const M = require("./staffManagers");
const B = require("./staffBridgePermissions");

const DIR = { id: "dir1", tier: "director" };
function rig() {
  const { DatabaseSync } = require("node:sqlite"); // real SQLite engine
  const db = new DatabaseSync(":memory:");
  const links = L.createStaffLinks(db);
  const mgrs = M.createStaffManagers(db, links);
  return { db, links, mgrs };
}
const appointK = (mgrs, over = {}) => mgrs.appoint(DIR, { nexaUserId: "m1", unit: "kitchen", reason: "Runs the kitchen", ...over });
const codes = (fn) => { try { fn(); return "no error"; } catch (e) { return e.code; } };

test("M7780: the Administrative Director appoints a Manager and names the unit", () => {
  const { mgrs } = rig();
  const row = appointK(mgrs);
  assert.equal(row.nexaUserId, "m1");
  assert.equal(row.unit, "kitchen");
  assert.equal(row.status, "approved");
  assert.equal(row.appointedBy, "dir1");
  assert.deepEqual(mgrs.managerFor("m1"), { id: "m1", tier: "manager", unit: "kitchen" });
  const a = mgrs.auditForManager("m1");
  assert.equal(a.length, 1);
  assert.equal(a[0].action, "manager_appointed");
  assert.equal(a[0].actorId, "dir1");
});

test("M7780: nobody but a Director can appoint, suspend, restore or remove a Manager", () => {
  const { mgrs } = rig();
  appointK(mgrs);
  const others = [{ id: "c1", tier: "ceo" }, { id: "f1", tier: "founder" }, { id: "m1", tier: "manager" }, { id: "v1", tier: "vendor" }, { id: "x", tier: "admin" }, { id: "", tier: "director" }, { tier: "director" }, null, undefined, "director", {}];
  for (const a of others) {
    assert.equal(codes(() => mgrs.appoint(a, { nexaUserId: "m2", unit: "kitchen", reason: "try it" })), "forbidden", JSON.stringify(a));
    assert.equal(codes(() => mgrs.suspend(a, "m1", "try it")), "forbidden");
    assert.equal(codes(() => mgrs.restore(a, "m1", "try it")), "forbidden");
    assert.equal(codes(() => mgrs.remove(a, "m1", "try it")), "forbidden");
  }
  assert.equal(mgrs.managerFor("m1").unit, "kitchen", "nothing changed");
});

test("M7780: the unit must come from the fixed list; staff-only, admin and hostile units are refused", () => {
  const { mgrs } = rig();
  for (const unit of ["central", "admin", "", "KITCHEN", "__proto__", "constructor", null, undefined, 7, {}, ["kitchen"]]) {
    assert.equal(codes(() => appointK(mgrs, { nexaUserId: "mx", unit })), "bad_unit", String(unit));
  }
  for (const unit of M.MANAGER_UNITS) assert.ok(mgrs.appoint(DIR, { nexaUserId: "u-" + unit, unit, reason: "unit test" }));
});

test("M7780: a Director cannot appoint themselves, and a reason is needed", () => {
  const { mgrs } = rig();
  assert.equal(codes(() => appointK(mgrs, { nexaUserId: "dir1" })), "self_appoint");
  for (const reason of [undefined, "", "  ", "ab", "x".repeat(501), 5]) assert.equal(codes(() => appointK(mgrs, { reason })), "reason_required");
  for (const nexaUserId of [undefined, "", null, 5, "x".repeat(101)]) assert.equal(codes(() => appointK(mgrs, { nexaUserId })), "bad_user");
  assert.equal(mgrs.listManagers().length, 0);
});

test("M7780: one live appointment per account; after removal the account can be appointed again", () => {
  const { mgrs } = rig();
  appointK(mgrs);
  assert.equal(codes(() => appointK(mgrs, { unit: "blaca-essentials" })), "already_manager");
  mgrs.remove(DIR, "m1", "Left the team");
  assert.equal(mgrs.managerFor("m1"), null);
  assert.equal(appointK(mgrs, { unit: "blaca-essentials" }).unit, "blaca-essentials");
});

test("M7780: an account that already works as staff cannot be appointed, and a Manager cannot be made staff", () => {
  const { mgrs, links } = rig();
  links.createPendingLink({ nexaUserId: "s1", bossTier: "vendor", bossId: "v1", unit: "business-hub", permissions: ["products"], requestedBy: "v1" }, { bossCap: L.PERMISSIONS });
  assert.equal(codes(() => appointK(mgrs, { nexaUserId: "s1" })), "already_staff");
  appointK(mgrs);
  assert.equal(codes(() => mgrs.requestStaff({ id: "m1" }, { nexaUserId: "m1", permissions: ["uploads"] })), "already_manager"); // a Manager cannot make themselves staff
  mgrs.appoint(DIR, { nexaUserId: "m2", unit: "kitchen", reason: "second kitchen manager" });
  assert.equal(codes(() => mgrs.requestStaff({ id: "m1" }, { nexaUserId: "m2", permissions: ["uploads"] })), "already_manager");
});

test("M7780: a Manager's staff request is forced into the Manager's own unit and boss", () => {
  const { mgrs, db } = rig();
  appointK(mgrs);
  const ok = mgrs.requestStaff({ id: "m1" }, { nexaUserId: "s2", permissions: ["uploads", "kitchen_sales"] });
  assert.equal(ok.link.bossTier, "manager");
  assert.equal(ok.link.bossId, "m1");
  assert.equal(ok.link.unit, "kitchen");
  assert.equal(ok.link.status, "pending");
  assert.equal(ok.link.requestedBy, "m1");
  // tampering with boss, tier or unit is refused, not quietly corrected
  assert.equal(codes(() => mgrs.requestStaff({ id: "m1" }, { nexaUserId: "s3", unit: "business-hub", permissions: ["uploads"] })), "forbidden");
  assert.equal(codes(() => mgrs.requestStaff({ id: "m1" }, { nexaUserId: "s3", bossId: "v1", permissions: ["uploads"] })), "forbidden");
  assert.equal(codes(() => mgrs.requestStaff({ id: "m1" }, { nexaUserId: "s3", bossTier: "director", permissions: ["uploads"] })), "forbidden");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM staff_links").get().n, 1);
});

test("M7780: a Manager's staff get only what the unit allows", () => {
  const { mgrs } = rig();
  appointK(mgrs); // kitchen: uploads, kitchen_sales, sales_view
  assert.equal(codes(() => mgrs.requestStaff({ id: "m1" }, { nexaUserId: "s2", permissions: ["products"] })), "permission_not_for_unit");
  assert.equal(codes(() => mgrs.requestStaff({ id: "m1" }, { nexaUserId: "s2", permissions: ["orders"] })), "permission_not_for_unit");
});

test("M7780: only an appointed Manager who is not on hold can ask for staff", () => {
  const { mgrs } = rig();
  for (const who of [{ id: "nobody" }, { id: "dir1", tier: "director" }, null, undefined, {}, "m1"]) {
    assert.equal(codes(() => mgrs.requestStaff(who, { nexaUserId: "s2", permissions: ["uploads"] })), "forbidden");
  }
  appointK(mgrs);
  mgrs.suspend(DIR, "m1", "Under review");
  assert.equal(codes(() => mgrs.requestStaff({ id: "m1" }, { nexaUserId: "s2", permissions: ["uploads"] })), "forbidden");
  mgrs.restore(DIR, "m1", "Cleared");
  assert.ok(mgrs.requestStaff({ id: "m1" }, { nexaUserId: "s2", permissions: ["uploads"] }));
});

test("M7780: the Director approves the Manager's staff; the Manager and the CEO cannot", () => {
  const { mgrs, links } = rig();
  appointK(mgrs);
  const { link } = mgrs.requestStaff({ id: "m1" }, { nexaUserId: "s2", permissions: ["uploads"] });
  assert.throws(() => links.decideLink(link.id, { id: "m1", tier: "manager" }, "approved"));
  assert.throws(() => links.decideLink(link.id, { id: "c1", tier: "ceo" }, "approved"));
  assert.equal(links.decideLink(link.id, DIR, "approved").status, "approved");
});

test("M7780: suspending a Manager pauses their staff at once; restoring brings them back", () => {
  const { mgrs, links } = rig();
  appointK(mgrs);
  const { link } = mgrs.requestStaff({ id: "m1" }, { nexaUserId: "s2", permissions: ["uploads"] });
  links.decideLink(link.id, DIR, "approved");
  assert.ok(links.authorizeStaffAction("s2", "m1", "uploads"));
  const r = mgrs.suspend(DIR, "m1", "Under review");
  assert.deepEqual(r.affectedUserIds, ["s2"]);
  assert.equal(mgrs.managerFor("m1"), null);
  assert.throws(() => links.authorizeStaffAction("s2", "m1", "uploads"));
  assert.equal(codes(() => mgrs.suspend(DIR, "m1", "Again")), "already_held");
  mgrs.restore(DIR, "m1", "Cleared");
  assert.ok(links.authorizeStaffAction("s2", "m1", "uploads"));
  assert.equal(mgrs.managerFor("m1").unit, "kitchen");
  assert.deepEqual(mgrs.auditForManager("m1").map((x) => x.action), ["manager_appointed", "manager_suspended", "manager_restored"]);
});

test("M7780: removing a Manager ends the appointment and their staff links, and leaves the people alone", () => {
  const { mgrs, links, db } = rig();
  appointK(mgrs);
  const { link } = mgrs.requestStaff({ id: "m1" }, { nexaUserId: "s2", permissions: ["uploads"] });
  links.decideLink(link.id, DIR, "approved");
  const r = mgrs.remove(DIR, "m1", "Left the team");
  assert.deepEqual(r.affectedUserIds, ["s2"]);
  assert.equal(db.prepare("SELECT status FROM staff_links WHERE id = ?").get(link.id).status, "removed");
  assert.equal(db.prepare("SELECT status FROM staff_managers WHERE nexaUserId = 'm1'").get().status, "removed");
  assert.equal(mgrs.managerFor("m1"), null);
  assert.equal(codes(() => mgrs.remove(DIR, "m1", "Twice")), "not_found");
  assert.equal(codes(() => mgrs.suspend(DIR, "nobody", "No such person")), "not_found");
  assert.equal(mgrs.listManagers().length, 0);
});

test("M7780: a failed change leaves nothing half done", () => {
  const { mgrs, db } = rig();
  appointK(mgrs);
  assert.equal(codes(() => mgrs.remove({ id: "m1", tier: "director" }, "m1", "Remove myself")), "forbidden"); // a Director cannot act on themselves
  assert.equal(mgrs.managerFor("m1").unit, "kitchen");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM staff_manager_audit").get().n, 1, "no audit row for a refused change");
});

test("M7780 + M7786: the Manager's unit for the Admin bridge comes from the appointment, never from the caller", () => {
  const { mgrs } = rig();
  appointK(mgrs);
  const caller = mgrs.bridgeCaller("m1", ["staff.read", "staff.request"]);
  assert.equal(caller.unit, "kitchen");
  assert.equal(B.authorizeBridgeCall(caller, "staff.read", { unit: "kitchen" }), true);
  assert.throws(() => B.authorizeBridgeCall(caller, "staff.read", { unit: "business-hub" }), (e) => e.code === "other_unit");
  assert.throws(() => B.authorizeBridgeCall({ ...caller, tier: "manager" }, "staff.approve", { unit: "kitchen" }), (e) => e.code === "tier_cannot_hold" || e.code === "not_granted");
  assert.equal(mgrs.bridgeCaller("nobody", ["staff.read"]), null);
  mgrs.suspend(DIR, "m1", "Under review");
  assert.equal(mgrs.bridgeCaller("m1", ["staff.read"]), null, "a Manager on hold has no bridge access");
});

test("M7780: the tables hold no credential, code or 2FA columns", () => {
  const { db } = rig();
  for (const t of ["staff_managers", "staff_manager_audit"]) {
    const cols = db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
    assert.equal(cols.some((c) => /pass|secret|token|code|otp|2fa|credential/i.test(c)), false, cols.join(","));
  }
});

test("M7780: links are required", () => {
  const { DatabaseSync } = require("node:sqlite");
  assert.throws(() => M.createStaffManagers(new DatabaseSync(":memory:"), null));
});
