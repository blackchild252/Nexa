"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("./staffLinks");
const M = require("./staffManagers");

const DIR = { id: "dir1", tier: "director" };
const session = (id, over = {}) => ({ authenticated: true, twoFactorVerified: true, nexaUserId: id, ...over });
function rig() {
  const { DatabaseSync } = require("node:sqlite"); // real SQLite engine
  const db = new DatabaseSync(":memory:");
  const links = L.createStaffLinks(db);
  const mgrs = M.createStaffManagers(db, links);
  const staffUnder = (managerId, staffId, perms = ["uploads"]) => {
    const { link } = mgrs.requestStaff({ id: managerId }, { nexaUserId: staffId, permissions: perms });
    return links.decideLink(link.id, DIR, "approved");
  };
  return { db, links, mgrs, staffUnder };
}
const failCode = (fn) => { try { fn(); return "no error"; } catch (e) { return e.code; } };

test("M7773: Kitchen staff sign in at the Kitchen door under their Manager", () => {
  const { links, mgrs, staffUnder } = rig();
  mgrs.appoint(DIR, { nexaUserId: "m1", unit: "kitchen", reason: "Runs the kitchen" });
  staffUnder("m1", "s1");
  const r = links.staffDoorSignIn("kitchen", session("s1"));
  assert.deepEqual({ ...r.destination }, { section: "manager-section", bossTier: "manager", bossId: "m1", unit: "kitchen" });
  assert.deepEqual(r.permissions, ["uploads"]);
});

test("M7773: Blaca Essentials staff sign in at the Blaca door under their Manager", () => {
  const { links, mgrs, staffUnder } = rig();
  mgrs.appoint(DIR, { nexaUserId: "m2", unit: "blaca-essentials", reason: "Runs Blaca" });
  staffUnder("m2", "s2", ["stock"]);
  const r = links.staffDoorSignIn("blaca-essentials", session("s2"));
  assert.deepEqual({ ...r.destination }, { section: "manager-section", bossTier: "manager", bossId: "m2", unit: "blaca-essentials" });
});

test("M7773: staff only get in at their own unit's door, never another", () => {
  const { links, mgrs, staffUnder } = rig();
  mgrs.appoint(DIR, { nexaUserId: "m1", unit: "kitchen", reason: "Runs the kitchen" });
  mgrs.appoint(DIR, { nexaUserId: "m2", unit: "blaca-essentials", reason: "Runs Blaca" });
  staffUnder("m1", "sk");
  staffUnder("m2", "sb", ["stock"]);
  assert.equal(failCode(() => links.staffDoorSignIn("blaca-essentials", session("sk"))), "staff_sign_in_failed");
  assert.equal(failCode(() => links.staffDoorSignIn("kitchen", session("sb"))), "staff_sign_in_failed");
  assert.equal(failCode(() => links.staffDoorSignIn("business-hub", session("sk"))), "staff_sign_in_failed");
  assert.equal(failCode(() => links.staffDoorSignIn("business-hub", session("sb"))), "staff_sign_in_failed");
});

test("M7773: vendor staff cannot use the Kitchen or Blaca doors", () => {
  const { links } = rig();
  for (const unit of ["kitchen", "blaca-essentials", "business-hub"]) {
    const { link } = links.createPendingLink({ nexaUserId: "v-" + unit, bossTier: "vendor", bossId: "v1", unit, permissions: ["uploads"], requestedBy: "v1" }, { bossCap: L.PERMISSIONS });
    links.decideLink(link.id, DIR, "approved");
  }
  for (const unit of ["kitchen", "blaca-essentials"]) assert.equal(failCode(() => links.staffDoorSignIn(unit, session("v-" + unit))), "staff_sign_in_failed", unit);
});

test("M7773: a Manager signing in at their own unit's door is not staff and is refused", () => {
  const { links, mgrs } = rig();
  mgrs.appoint(DIR, { nexaUserId: "m1", unit: "kitchen", reason: "Runs the kitchen" });
  assert.equal(failCode(() => links.staffDoorSignIn("kitchen", session("m1"))), "staff_sign_in_failed");
});

test("M7773: the new doors fail closed without a verified 2FA and every failure looks identical", () => {
  const { links, mgrs, staffUnder } = rig();
  mgrs.appoint(DIR, { nexaUserId: "m1", unit: "kitchen", reason: "Runs the kitchen" });
  staffUnder("m1", "s1");
  const msgs = new Set();
  for (const door of ["kitchen", "blaca-essentials"]) {
    for (const sess of [session("s1", { twoFactorVerified: false }), session("s1", { authenticated: false }), session("ghost"), session(""), null, undefined]) {
      try { links.staffDoorSignIn(door, sess); msgs.add("signed in"); } catch (e) { msgs.add(e.status + e.code + e.message); }
    }
  }
  assert.equal(msgs.size, 1, [...msgs].join(" | "));
  assert.ok(!msgs.has("signed in"));
});

test("M7773: hostile door names are refused", () => {
  const { links, mgrs, staffUnder } = rig();
  mgrs.appoint(DIR, { nexaUserId: "m1", unit: "kitchen", reason: "Runs the kitchen" });
  staffUnder("m1", "s1");
  for (const door of ["__proto__", "constructor", "toString", "hasOwnProperty", "Kitchen", "kitchen ", "", "admin", "central", null, undefined, 7, {}, ["kitchen"]]) {
    assert.equal(failCode(() => links.staffDoorSignIn(door, session("s1"))), "staff_sign_in_failed", String(door));
  }
});

test("M7780 decision: two Managers in the same unit each have their own staff, and each person lands under their own Manager", () => {
  const { links, mgrs, staffUnder } = rig();
  mgrs.appoint(DIR, { nexaUserId: "m1", unit: "kitchen", reason: "Morning kitchen" });
  mgrs.appoint(DIR, { nexaUserId: "m3", unit: "kitchen", reason: "Evening kitchen" });
  staffUnder("m1", "a");
  staffUnder("m3", "b");
  assert.equal(links.staffDoorSignIn("kitchen", session("a")).destination.bossId, "m1");
  assert.equal(links.staffDoorSignIn("kitchen", session("b")).destination.bossId, "m3");
  mgrs.suspend(DIR, "m1", "Under review");
  assert.equal(failCode(() => links.staffDoorSignIn("kitchen", session("a"))), "staff_sign_in_failed", "paused with their Manager");
  assert.equal(links.staffDoorSignIn("kitchen", session("b")).destination.bossId, "m3", "the other Manager's staff are not affected");
  mgrs.remove(DIR, "m3", "Left the team");
  assert.equal(failCode(() => links.staffDoorSignIn("kitchen", session("b"))), "staff_sign_in_failed");
});

test("M7773: the Business Hub door is unchanged: vendor staff only", () => {
  const { links, mgrs, staffUnder } = rig();
  mgrs.appoint(DIR, { nexaUserId: "m1", unit: "kitchen", reason: "Runs the kitchen" });
  staffUnder("m1", "s1");
  const { link } = links.createPendingLink({ nexaUserId: "u1", bossTier: "vendor", bossId: "v1", unit: "business-hub", permissions: ["products"], requestedBy: "v1" }, { bossCap: L.PERMISSIONS });
  links.decideLink(link.id, DIR, "approved");
  assert.equal(links.staffDoorSignIn("business-hub", session("u1")).destination.section, "vendor-shop");
  assert.equal(failCode(() => links.staffDoorSignIn("business-hub", session("s1"))), "staff_sign_in_failed");
});
