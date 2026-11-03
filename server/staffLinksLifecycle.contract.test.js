"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const L = require("./staffLinks");

const ALL = L.PERMISSIONS;
function setup() {
  const { DatabaseSync } = require("node:sqlite"); // real SQLite engine
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT); CREATE TABLE vendor_staff (id TEXT PRIMARY KEY, vendorId TEXT NOT NULL, userId TEXT, name TEXT, role TEXT NOT NULL DEFAULT 'staff', status TEXT NOT NULL DEFAULT 'invited', inviteCode TEXT, createdAt TEXT NOT NULL, joinedAt TEXT, removedAt TEXT);");
  for (const u of ["u1", "u2", "u3", "u4", "u5", "u6", "v1u", "d1", "c1"]) db.prepare("INSERT INTO users (id,name) VALUES (?,?)").run(u, `User ${u}`);
  const s = L.createStaffLinks(db);
  return { db, s };
}
const vendorBoss = { id: "v1u", tier: "vendor", bossId: "v1" };
const director = { id: "d1", tier: "director" };
const ceo = { id: "c1", tier: "ceo" };
function approvedLink(s, over = {}) {
  const { link } = s.createPendingLink({ nexaUserId: "u1", bossTier: "vendor", bossId: "v1", unit: "business-hub", permissions: ["products", "orders", "uploads"], requestedBy: "v1u", ...over }, { bossCap: ALL });
  return s.decideLink(link.id, director, "approved", null);
}
const session = (id = "u1") => ({ authenticated: true, twoFactorVerified: true, nexaUserId: id });
const refuses = (fn, code) => assert.throws(fn, (e) => (code ? e.code === code : e instanceof L.StaffLinkError));
const accountStillThere = (db, id) => assert.ok(db.prepare("SELECT 1 FROM users WHERE id = ?").get(id));

// ---- M7778 / M7779 unit rules
test("M7778/M7779: each unit accepts only the permissions that belong to it", () => {
  const { s } = setup();
  const mk = (unit, permissions, n) => s.createPendingLink({ nexaUserId: n, bossTier: "manager", bossId: "m1", unit, permissions, requestedBy: "m1" }, { bossCap: ALL });
  assert.equal(mk("kitchen", ["uploads", "kitchen_sales", "sales_view"], "u1").link.unit, "kitchen");
  assert.equal(mk("blaca-essentials", ["products", "uploads", "stock", "sales_view"], "u2").link.unit, "blaca-essentials");
  refuses(() => mk("kitchen", ["products"], "u3"), "permission_not_for_unit");
  refuses(() => mk("blaca-essentials", ["kitchen_sales"], "u3"), "permission_not_for_unit");
  refuses(() => mk("business-hub", ["kitchen_sales"], "u3"), "permission_not_for_unit");
  assert.equal(mk("admin", ["kitchen_sales", "products"], "u3").link.unit, "admin", "units not listed stay unrestricted until their own milestone");
});

// ---- M7781 suspension, removal, cascade
test("M7781: suspending a link stops staff authority at once on every path", () => {
  const { s } = setup(); const l = approvedLink(s);
  s.authorizeStaffAction("u1", "v1", "products");
  assert.equal(s.suspendLink(l.id, vendorBoss, "Under review").status, "suspended");
  refuses(() => s.authorizeStaffAction("u1", "v1", "products"), "forbidden");
  refuses(() => s.staffDoorSignIn("business-hub", session()), "staff_sign_in_failed");
  refuses(() => s.submitUpload("u1", "product", { name: "x" }), "forbidden");
});
test("M7781: who may suspend, remove and resume", () => {
  const { s } = setup(); const l = approvedLink(s);
  refuses(() => s.suspendLink(l.id, { id: "u1", tier: "vendor", bossId: "v1" }, "I suspend myself"), "forbidden");
  refuses(() => s.suspendLink(l.id, { id: "m9", tier: "manager" }, "wrong tier"), "forbidden");
  refuses(() => s.suspendLink(l.id, { id: "v2u", tier: "vendor", bossId: "v2" }, "other vendor"), "forbidden");
  refuses(() => s.suspendLink(l.id, vendorBoss, "x"), "reason_required");
  s.suspendLink(l.id, vendorBoss, "Under review");
  refuses(() => s.resumeLink(l.id, vendorBoss, "Boss undoing it"), "forbidden");
  assert.equal(s.resumeLink(l.id, director, "Cleared").status, "approved");
  s.authorizeStaffAction("u1", "v1", "products");
  refuses(() => s.resumeLink(l.id, director, "Not suspended"), "wrong_state");
});
test("M7781: removing staff never deletes the NEXA account, and frees the one link", () => {
  const { db, s } = setup(); const l = approvedLink(s);
  assert.equal(s.removeLink(l.id, vendorBoss, "Left the shop").status, "removed");
  accountStillThere(db, "u1");
  refuses(() => s.authorizeStaffAction("u1", "v1", "products"), "forbidden");
  assert.equal(s.createPendingLink({ nexaUserId: "u1", bossTier: "vendor", bossId: "v2", unit: "business-hub", permissions: ["products"], requestedBy: "v2u" }, { bossCap: ALL }).link.status, "pending");
});
test("M7781: suspending a boss pauses all their staff, and lifting it restores them exactly", () => {
  const { s } = setup();
  approvedLink(s, { nexaUserId: "u1" }); approvedLink(s, { nexaUserId: "u2" }); approvedLink(s, { nexaUserId: "u3", bossId: "v2", requestedBy: "v2u" });
  const r = s.suspendBoss("vendor", "v1", director, "Shop under investigation");
  assert.deepEqual(r.affectedUserIds.sort(), ["u1", "u2"]);
  for (const u of ["u1", "u2"]) { refuses(() => s.authorizeStaffAction(u, "v1", "products"), "forbidden"); refuses(() => s.staffDoorSignIn("business-hub", session(u)), "staff_sign_in_failed"); }
  s.authorizeStaffAction("u3", "v2", "products");
  assert.equal(s.bossIsHeld("vendor", "v1"), true);
  assert.deepEqual(s.listForBoss("vendor", "v1").map((l) => l.status), ["approved", "approved"], "links themselves are untouched");
  refuses(() => s.suspendBoss("vendor", "v1", director, "again"), "already_held");
  assert.deepEqual(s.restoreBoss("vendor", "v1", director, "Cleared").restoredUserIds.sort(), ["u1", "u2"]);
  s.authorizeStaffAction("u1", "v1", "products");
  refuses(() => s.restoreBoss("vendor", "v1", director, "again"), "not_held");
});
test("M7781: only the approving tier may hold or remove a boss, never the boss itself", () => {
  const { s } = setup(); approvedLink(s);
  refuses(() => s.suspendBoss("vendor", "v1", vendorBoss, "self"), "forbidden");
  refuses(() => s.suspendBoss("vendor", "v1", { id: "m9", tier: "manager" }, "no way"), "forbidden");
  refuses(() => s.suspendBoss("vendor", "v1", ceo, "skips the director"), "forbidden");
  refuses(() => s.removeBoss("vendor", "v1", vendorBoss, "self"), "forbidden");
  refuses(() => s.suspendBoss("founder", "x", director, "bad tier"), "forbidden");
  refuses(() => s.suspendBoss("manager", "d1", director, "same person is boss and approver"), "forbidden");
  refuses(() => s.removeBoss("manager", "d1", director, "same person is boss and approver"), "forbidden");
});
test("M7781: removing a boss removes all their staff links and keeps every account", () => {
  const { db, s } = setup(); approvedLink(s, { nexaUserId: "u1" }); approvedLink(s, { nexaUserId: "u2" });
  assert.deepEqual(s.removeBoss("vendor", "v1", director, "Shop closed").affectedUserIds.sort(), ["u1", "u2"]);
  assert.deepEqual(s.listForBoss("vendor", "v1").map((l) => l.status), ["removed", "removed"]);
  accountStillThere(db, "u1"); accountStillThere(db, "u2");
});

// ---- M7782 non-enumerating door
test("M7782: every door refusal is the same answer, and failed attempts change nothing", () => {
  const { db, s } = setup(); const l = approvedLink(s, { nexaUserId: "u1" });
  s.createPendingLink({ nexaUserId: "u2", bossTier: "vendor", bossId: "v1", unit: "business-hub", permissions: ["products"], requestedBy: "v1u" }, { bossCap: ALL });
  approvedLink(s, { nexaUserId: "u3", bossTier: "manager", bossId: "m1", requestedBy: "m1", unit: "kitchen", permissions: ["uploads"] }).id;
  const mgrLink = s.liveLinkFor("u3");
  assert.ok(mgrLink);
  s.suspendLink(l.id, vendorBoss, "hold"); // u1 suspended
  const seen = new Set();
  const attempts = [["business-hub", session("u1")], ["business-hub", session("u2")], ["business-hub", session("u3")], ["business-hub", session("nobody")], ["business-hub", { ...session("u1"), twoFactorVerified: false }], ["business-hub", { ...session("u1"), authenticated: false }], ["business-hub", null], ["admin", session("u1")], ["moon", session("u1")]];
  for (const [door, sess] of attempts) { try { s.staffDoorSignIn(door, sess); assert.fail("should refuse"); } catch (e) { seen.add(JSON.stringify([e.status, e.code, e.message])); } }
  assert.equal(seen.size, 1, [...seen].join(" | "));
  assert.ok(!/v1|u1|u2|u3|vendor|manager|staff link/i.test([...seen][0].replace("staff_sign_in_failed", "").replace("Staff sign-in", "")));
  assert.equal(db.prepare("SELECT COUNT(*) n FROM staff_links WHERE activatedAt IS NOT NULL").get().n, 0);
});
test("M7782 (source level): the door route is rate limited and the limiter is keyed per user", () => {
  const routes = fs.readFileSync(path.join(__dirname, "staffLinkRoutes.js"), "utf8");
  const index = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
  assert.match(routes, /door\/business-hub\/sign-in", A, \.\.\.limiter/);
  const wired = index.slice(index.indexOf("createStaffLinkRoutes({"), index.indexOf("}).register(app);", index.indexOf("createStaffLinkRoutes({")));
  assert.match(wired, /limiter: \[rateLimit\(\{ windowMs: 15 \* 60 \* 1000, max: 30/);
  assert.match(wired, /keyFn: \(req\) => \(req\.user && req\.user\.id\) \|\| req\.ip/);
});

// ---- M7783 audit trail
test("M7783: every link and upload decision leaves one audit row, with reason and no credential fields", () => {
  const { db, s } = setup();
  const { link } = s.createPendingLink({ nexaUserId: "u1", bossTier: "vendor", bossId: "v1", unit: "business-hub", permissions: ["products", "uploads"], requestedBy: "v1u", requestKey: "k1" }, { bossCap: ALL });
  s.createPendingLink({ nexaUserId: "u1", bossTier: "vendor", bossId: "v1", unit: "business-hub", permissions: ["products", "uploads"], requestedBy: "v1u", requestKey: "k1" }, { bossCap: ALL }); // retry: no second row
  s.decideLink(link.id, director, "approved", null);
  const up = s.submitUpload("u1", "product", { name: "Shoe" });
  s.decideUpload(up.id, { id: "v1u", bossId: "v1" }, "rejected", "Photo is blurry");
  s.suspendLink(link.id, vendorBoss, "Review");
  s.resumeLink(link.id, director, "Cleared");
  s.removeLink(link.id, vendorBoss, "Left");
  assert.deepEqual(s.auditForLink(link.id).map((r) => r.action), ["link_requested", "link_approved", "upload_rejected", "link_suspended", "link_resumed", "link_removed"]);
  const rows = s.auditForLink(link.id);
  assert.equal(rows[2].reason, "Photo is blurry");
  assert.equal(rows[0].actorId, "v1u");
  const cols = db.prepare("PRAGMA table_info(staff_link_audit)").all().map((c) => c.name);
  assert.ok(cols.every((c) => !/pass|secret|token|code|otp|2fa|totp|credential/i.test(c)), cols.join(","));
  assert.equal(s.auditForBoss("vendor", "v1").length, rows.length);
});
test("M7783: rejection and boss actions are recorded too", () => {
  const { s } = setup();
  const { link } = s.createPendingLink({ nexaUserId: "u1", bossTier: "vendor", bossId: "v1", unit: "business-hub", permissions: ["products"], requestedBy: "v1u" }, { bossCap: ALL });
  s.decideLink(link.id, director, "rejected", "Not verified");
  s.suspendBoss("vendor", "v1", director, "Hold"); s.restoreBoss("vendor", "v1", director, "Clear"); s.removeBoss("vendor", "v1", director, "Closed");
  const acts = s.auditForBoss("vendor", "v1").map((r) => r.action);
  for (const a of ["link_requested", "link_rejected", "boss_suspended", "boss_restored", "boss_removed"]) assert.ok(acts.includes(a), a);
});
test("M7783: if the audit row cannot be written the change is rolled back", () => {
  const { db, s } = setup();
  const { link } = s.createPendingLink({ nexaUserId: "u1", bossTier: "vendor", bossId: "v1", unit: "business-hub", permissions: ["products"], requestedBy: "v1u" }, { bossCap: ALL });
  db.exec("DROP TABLE staff_link_audit");
  assert.throws(() => s.decideLink(link.id, director, "approved", null));
  assert.equal(db.prepare("SELECT status FROM staff_links WHERE id = ?").get(link.id).status, "pending");
});

// ---- M7784 migration
function seedOld(db) {
  const ins = db.prepare("INSERT INTO vendor_staff (id,vendorId,userId,name,role,status,inviteCode,createdAt) VALUES (?,?,?,?,?,?,?,?)");
  ins.run("s1", "v1", "u1", "U1", "staff", "active", null, "2026-01-01");
  ins.run("s2", "v1", "u2", "U2", "manager", "active", null, "2026-01-02");
  ins.run("s3", "v1", null, null, "staff", "invited", "ABCD2345", "2026-01-03");
  ins.run("s4", "v1", "u4", "U4", "staff", "removed", null, "2026-01-04");
  ins.run("s5", "v1", "u5", "U5", "staff", "active", null, "2026-01-05");
  ins.run("s6", "v2", "u5", "U5", "staff", "active", null, "2026-01-06");
  ins.run("s7", "v1", "u6", "U6", "staff", "active", null, "2026-01-07");
}
test("M7784: the plan writes nothing and sorts every old row into create, already done, conflict or skipped", () => {
  const { db, s } = setup(); seedOld(db);
  s.createPendingLink({ nexaUserId: "u6", bossTier: "manager", bossId: "m1", unit: "kitchen", permissions: ["uploads"], requestedBy: "m1" }, { bossCap: ALL });
  const before = db.prepare("SELECT COUNT(*) n FROM staff_links").get().n;
  const plan = s.planVendorStaffMigration();
  assert.equal(db.prepare("SELECT COUNT(*) n FROM staff_links").get().n, before);
  assert.deepEqual(plan.wouldCreate.map((e) => e.nexaUserId).sort(), ["u1", "u2"]);
  assert.deepEqual(plan.conflicts.map((c) => [c.nexaUserId, c.reason]).sort(), [["u5", "staff_of_several_vendors"], ["u5", "staff_of_several_vendors"], ["u6", "already_has_other_link"]]);
  assert.deepEqual(plan.skipped, { invited: 1, removed: 1, other: 0 });
  assert.equal(plan.notMigrated.managerPowers, 1);
});
test("M7784: apply needs the confirm word, keeps vendor_staff untouched, is safe to repeat, and migrated staff can sign in", () => {
  const { db, s } = setup(); seedOld(db);
  const snap = JSON.stringify(db.prepare("SELECT * FROM vendor_staff ORDER BY id").all());
  refuses(() => s.applyVendorStaffMigration({}), "confirm_required");
  refuses(() => s.applyVendorStaffMigration({ confirm: "yes" }), "confirm_required");
  const r = s.applyVendorStaffMigration({ confirm: "MIGRATE_VENDOR_STAFF" });
  assert.deepEqual(r, { created: 3, conflictsLeftAlone: 2, alreadyMigrated: 0 });
  assert.equal(JSON.stringify(db.prepare("SELECT * FROM vendor_staff ORDER BY id").all()), snap, "old access table is not changed");
  const l = db.prepare("SELECT * FROM staff_links WHERE nexaUserId = 'u1'").get();
  assert.deepEqual([l.status, l.bossTier, l.bossId, l.unit, l.permissions, l.approverTier], ["approved", "vendor", "v1", "business-hub", '["orders","products"]', "migration"]);
  const d = s.staffDoorSignIn("business-hub", session("u1"));
  assert.deepEqual([d.destination.section, d.destination.bossId], ["vendor-shop", "v1"]);
  const again = s.applyVendorStaffMigration({ confirm: "MIGRATE_VENDOR_STAFF" });
  assert.deepEqual([again.created, again.alreadyMigrated], [0, 3]);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM staff_links").get().n, 3);
  assert.equal(s.auditForBoss("vendor", "v1").filter((a) => a.action === "migrated").length, 3);
});
test("M7784: rollback removes only untouched migrated links and can be followed by a new apply", () => {
  const { db, s } = setup(); seedOld(db);
  s.applyVendorStaffMigration({ confirm: "MIGRATE_VENDOR_STAFF" });
  const l2 = db.prepare("SELECT id FROM staff_links WHERE nexaUserId = 'u2'").get();
  s.suspendLink(l2.id, vendorBoss, "Changed after migration");
  refuses(() => s.rollbackVendorStaffMigration({}), "confirm_required");
  assert.deepEqual(s.rollbackVendorStaffMigration({ confirm: "ROLLBACK_VENDOR_STAFF_MIGRATION" }), { removed: 2, leftAlone: 1 });
  assert.equal(db.prepare("SELECT COUNT(*) n FROM staff_links").get().n, 1);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM vendor_staff WHERE status='active'").get().n, 5, "old access still there");
});
test("M7784 (finding, source level): the old password-creating staff route still exists and is unchanged", () => {
  const src = fs.readFileSync(path.join(__dirname, "staff.js"), "utf8");
  assert.match(src, /app\.post\("\/api\/mall\/vendor\/staff\/accounts"/);
});

// ---- M7788 security
test("M7788: retried requests and replays create one link and one audit row", () => {
  const { s } = setup();
  for (let i = 0; i < 5; i++) s.createPendingLink({ nexaUserId: "u1", bossTier: "vendor", bossId: "v1", unit: "business-hub", permissions: ["products"], requestedBy: "v1u", requestKey: "same" }, { bossCap: ALL });
  assert.equal(s.listForBoss("vendor", "v1").length, 1);
  assert.equal(s.auditForBoss("vendor", "v1").length, 1);
  refuses(() => s.createPendingLink({ nexaUserId: "u2", bossTier: "vendor", bossId: "v1", unit: "business-hub", permissions: ["products"], requestedBy: "v1u", requestKey: "same" }, { bossCap: ALL }), "request_key_reuse");
});
test("M7788: link hopping and old links give no authority", () => {
  const { s } = setup(); const l = approvedLink(s);
  refuses(() => s.createPendingLink({ nexaUserId: "u1", bossTier: "vendor", bossId: "v2", unit: "business-hub", permissions: ["products"], requestedBy: "v2u" }, { bossCap: ALL }), "already_linked");
  s.removeLink(l.id, vendorBoss, "Left");
  s.createPendingLink({ nexaUserId: "u1", bossTier: "vendor", bossId: "v2", unit: "business-hub", permissions: ["products"], requestedBy: "v2u" }, { bossCap: ALL });
  refuses(() => s.authorizeStaffAction("u1", "v1", "products"), "forbidden");
  refuses(() => s.authorizeStaffAction("u1", "v2", "products"), "forbidden"); // v2 link still pending
});
test("M7788: staff cannot approve, suspend or remove their own link or climb to another tier", () => {
  const { s } = setup(); const l = approvedLink(s);
  for (const tier of ["vendor", "manager", "director", "ceo", "founder"]) {
    refuses(() => s.decideLink(l.id, { id: "u1", tier }, "approved", null));
    refuses(() => s.suspendLink(l.id, { id: "u1", tier, bossId: "v1" }, "self"), "forbidden");
    refuses(() => s.removeLink(l.id, { id: "u1", tier, bossId: "v1" }, "self"), "forbidden");
  }
  refuses(() => s.resumeLink(l.id, { id: "u1", tier: "director" }, "self"), "forbidden");
});
test("M7788: staff can never be made admin or founder staff, hold credentials, or use another door", () => {
  const { s } = setup();
  assert.ok(!L.PERMISSIONS.some((p) => /admin|founder|owner|ceo|all/i.test(p)));
  assert.ok(!L.BOSS_TIERS.includes("founder"));
  for (const k of ["password", "totpSecret", "inviteCode", "token"]) refuses(() => s.createPendingLink({ nexaUserId: "u1", bossTier: "vendor", bossId: "v1", unit: "business-hub", permissions: ["products"], requestedBy: "v1u", [k]: "x" }, { bossCap: ALL }), "credential_field");
  refuses(() => s.createPendingLink({ nexaUserId: "u1", bossTier: "vendor", bossId: "v1", unit: "business-hub", permissions: ["admin"], requestedBy: "v1u" }, { bossCap: ALL }), "bad_permissions");
  approvedLink(s);
  for (const door of ["admin", "central", "ceo", "kitchen"]) refuses(() => s.staffDoorSignIn(door, session()), "staff_sign_in_failed");
});
test("M7788: many failed door attempts (brute force) change no data and leak nothing", () => {
  const { db, s } = setup(); approvedLink(s);
  const before = JSON.stringify([db.prepare("SELECT * FROM staff_links").all(), db.prepare("SELECT COUNT(*) n FROM staff_link_audit").get()]);
  for (let i = 0; i < 300; i++) refuses(() => s.staffDoorSignIn("business-hub", { ...session("u1"), twoFactorVerified: false }), "staff_sign_in_failed");
  assert.equal(JSON.stringify([db.prepare("SELECT * FROM staff_links").all(), db.prepare("SELECT COUNT(*) n FROM staff_link_audit").get()]), before);
});
test("M7788: a staff member cannot decide uploads, and cannot cross vendors", () => {
  const { s } = setup(); approvedLink(s);
  approvedLink(s, { nexaUserId: "u2", bossId: "v2", requestedBy: "v2u" });
  const up = s.submitUpload("u1", "product", { name: "Shoe" });
  refuses(() => s.decideUpload(up.id, { id: "u1", bossId: "v1" }, "approved", null), "self_approval");
  refuses(() => s.decideUpload(up.id, { id: "v2u", bossId: "v2" }, "approved", null), "forbidden");
  refuses(() => s.decideUpload(up.id, { id: "u2", bossId: "v2" }, "approved", null), "forbidden");
  assert.equal(s.decideUpload(up.id, { id: "v1u", bossId: "v1" }, "approved", null).status, "approved");
});
