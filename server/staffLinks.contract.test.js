"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("./staffLinks");

function freshDb() {
  const { DatabaseSync } = require("node:sqlite"); // real SQLite engine; same prepare/run/get/all/exec surface staffLinks uses
  return new DatabaseSync(":memory:");
}
const ALL = L.PERMISSIONS;
function mk(db) { const s = L.createStaffLinks(db); const c = s.createPendingLink; s.createPendingLink = (i, o = {}) => c(i, { bossCap: ALL, ...o }); return s; }
const base = { nexaUserId: "u1", bossTier: "vendor", bossId: "v1", unit: "business-hub", permissions: ["products", "orders"], requestedBy: "v1" };

test("M7767 record is built pending with no credentials and sorted unique permissions", () => {
  const r = L.buildLinkRecord({ ...base, permissions: ["orders", "products", "orders"] });
  assert.equal(r.status, "pending");
  assert.equal(r.permissions, '["orders","products"]');
  assert.equal(r.approverId, null);
});
test("M7767 credential-like fields are refused", () => {
  for (const k of ["password", "inviteCode", "totpSecret", "token", "otp"]) {
    assert.throws(() => L.buildLinkRecord({ ...base, [k]: "x" }), (e) => e.code === "credential_field");
  }
});
test("M7767 bad tier, unit, self-link and bad permissions are refused", () => {
  assert.throws(() => L.buildLinkRecord({ ...base, bossTier: "founder" }), (e) => e.code === "bad_tier");
  assert.throws(() => L.buildLinkRecord({ ...base, unit: "moon" }), (e) => e.code === "bad_unit");
  assert.throws(() => L.buildLinkRecord({ ...base, bossId: "u1" }), (e) => e.code === "self_link");
  assert.throws(() => L.buildLinkRecord({ ...base, permissions: ["Bad Name"] }), (e) => e.code === "bad_permissions");
  assert.throws(() => L.buildLinkRecord(null), (e) => e.status === 400);
});
test("M7767 approver map follows the owner decisions and nobody approves their own tier", () => {
  assert.deepEqual({ ...L.APPROVER_TIER }, { ceo: "founder", director: "ceo", manager: "director", vendor: "director" });
  for (const t of L.BOSS_TIERS) assert.notEqual(L.APPROVER_TIER[t], t);
});
test("M7768 one live link per account across tiers and units", () => {
  const s = mk(freshDb());
  assert.equal(s.createPendingLink(base).replayed, false);
  assert.throws(() => s.createPendingLink({ ...base, bossTier: "manager", bossId: "m9", unit: "kitchen", permissions: ["uploads"], requestedBy: "m9" }), (e) => e.code === "already_linked" && e.status === 409);
  assert.equal(s.liveLinkFor("u1").bossId, "v1");
});
test("M7768 retried request with the same key returns the same row; reusing the key for another person is refused", () => {
  const s = mk(freshDb());
  const a = s.createPendingLink({ ...base, requestKey: "k1" });
  const b = s.createPendingLink({ ...base, requestKey: "k1" });
  assert.equal(b.replayed, true);
  assert.equal(b.link.id, a.link.id);
  assert.throws(() => s.createPendingLink({ ...base, nexaUserId: "u2", requestKey: "k1" }), (e) => e.code === "request_key_reuse");
});
test("M7768 a removed or rejected link frees the account; the database index itself blocks a bypass", () => {
  const db = freshDb(); const s = mk(db);
  const a = s.createPendingLink(base);
  db.prepare("UPDATE staff_links SET status='removed' WHERE id=?").run(a.link.id);
  assert.equal(s.liveLinkFor("u1"), null);
  const b = s.createPendingLink({ ...base, bossId: "v2", requestedBy: "v2" });
  assert.equal(b.replayed, false);
  assert.throws(() => db.prepare("INSERT INTO staff_links (id,nexaUserId,bossTier,bossId,unit,permissions,status,requestedBy,createdAt,updatedAt) VALUES ('x','u1','vendor','v3','business-hub','[]','approved','v3','t','t')").run(), /UNIQUE/i);
});
test("M7768 many simultaneous requests for one account leave exactly one live link", async () => {
  const db = freshDb(); const s = mk(db);
  const results = await Promise.allSettled(Array.from({ length: 25 }, (_, i) => Promise.resolve().then(() => s.createPendingLink({ ...base, bossId: "b" + i, requestedBy: "b" + i }))));
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM staff_links WHERE nexaUserId='u1'").get().n, 1);
});

// ---- M7770 / M7771 approval
function pending(s, over = {}) { return s.createPendingLink({ ...base, ...over }).link; }
test("M7770 approve and reject record approver, tier and reason; rejection frees the account", () => {
  const s = mk(freshDb());
  const l = pending(s);
  const done = s.decideLink(l.id, { id: "dir1", tier: "director" }, "approved");
  assert.equal(done.status, "approved"); assert.equal(done.approverId, "dir1"); assert.equal(done.approverTier, "director");
  const s2 = mk(freshDb());
  const l2 = pending(s2);
  assert.throws(() => s2.decideLink(l2.id, { id: "dir1", tier: "director" }, "rejected", ""), (e) => e.code === "reason_required");
  const rej = s2.decideLink(l2.id, { id: "dir1", tier: "director" }, "rejected", "Not on the team");
  assert.equal(rej.status, "rejected");
  assert.equal(s2.liveLinkFor("u1"), null);
});
test("M7770 a boss, requester or subject can never decide the request", () => {
  const s = mk(freshDb());
  const l = pending(s, { bossTier: "manager", bossId: "m1", requestedBy: "m1" });
  for (const id of ["m1", "u1"]) assert.throws(() => s.decideLink(l.id, { id, tier: "director" }, "approved"), (e) => e.code === "self_approval");
  assert.equal(s.liveLinkFor("u1").status, "pending");
});
test("M7771 approval chain by tier: director for vendor/manager staff, ceo for director staff, founder for ceo staff", () => {
  const cases = [["vendor", "director"], ["manager", "director"], ["director", "ceo"], ["ceo", "founder"]];
  for (const [bossTier, approverTier] of cases) {
    for (const wrong of ["director", "ceo", "founder", "manager", "vendor"].filter((t) => t !== approverTier)) {
      const s = mk(freshDb());
      const l = pending(s, { bossTier, bossId: "b1", requestedBy: "b1" });
      assert.throws(() => s.decideLink(l.id, { id: "a1", tier: wrong }, "approved"), (e) => e.code === "wrong_tier", bossTier + " by " + wrong);
    }
    const s = mk(freshDb());
    const l = pending(s, { bossTier, bossId: "b1", requestedBy: "b1" });
    assert.equal(s.decideLink(l.id, { id: "a1", tier: approverTier }, "approved").status, "approved");
  }
});
test("M7770 a second decision on the same request is refused", () => {
  const s = mk(freshDb());
  const l = pending(s);
  s.decideLink(l.id, { id: "dir1", tier: "director" }, "approved");
  assert.throws(() => s.decideLink(l.id, { id: "dir2", tier: "director" }, "rejected", "late"), (e) => e.code === "already_decided");
  assert.throws(() => s.decideLink("nope", { id: "dir1", tier: "director" }, "approved"), (e) => e.code === "not_found");
  assert.throws(() => s.decideLink(l.id, null, "approved"), (e) => e.status === 403);
});

// ---- M7772 / M7773 / M7774 staff door
const ok = (id = "u1") => ({ authenticated: true, twoFactorVerified: true, nexaUserId: id });
function approved(s, over = {}) { const l = pending(s, over); return s.decideLink(l.id, { id: "dir1", tier: "director" }, "approved"); }
test("M7772 an approved account signs in with its own NEXA identity; no account is created and the link is marked active once", () => {
  const db = freshDb(); const s = mk(db);
  approved(s);
  const before = db.prepare("SELECT COUNT(*) AS n FROM staff_links").get().n;
  const r = s.staffDoorSignIn("business-hub", ok(), () => "T1");
  assert.equal(r.nexaUserId, "u1");
  s.staffDoorSignIn("business-hub", ok(), () => "T2");
  const row = db.prepare("SELECT activatedAt FROM staff_links WHERE nexaUserId='u1'").get();
  assert.equal(row.activatedAt, "T1");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM staff_links").get().n, before);
});
test("M7772 sign-in needs authentication and 2FA from the server session, and a link that is approved", () => {
  const s = mk(freshDb());
  pending(s); // still pending
  const failures = [ok(), { ...ok(), twoFactorVerified: false }, { ...ok(), twoFactorVerified: "true" }, { ...ok(), authenticated: false }, null, {}, ok("nobody")];
  for (const sess of failures) assert.throws(() => s.staffDoorSignIn("business-hub", sess), (e) => e.status === 401 && e.code === "staff_sign_in_failed");
});
test("M7773 the Business Hub door accepts only staff whose boss is a vendor", () => {
  const s = mk(freshDb());
  approved(s, { bossTier: "manager", bossId: "m1", requestedBy: "m1", unit: "kitchen", permissions: ["uploads"] });
  assert.throws(() => s.staffDoorSignIn("business-hub", ok()), (e) => e.code === "staff_sign_in_failed");
  assert.throws(() => s.staffDoorSignIn("admin", ok()), (e) => e.code === "staff_sign_in_failed");
});
test("M7773 every failure looks identical, so nothing reveals staff status or boss", () => {
  const s = mk(freshDb());
  approved(s, { bossTier: "manager", bossId: "m1", requestedBy: "m1", unit: "kitchen", permissions: ["uploads"] });
  const msgs = new Set();
  for (const sess of [ok(), ok("ghost"), { ...ok(), twoFactorVerified: false }]) { try { s.staffDoorSignIn("business-hub", sess); } catch (e) { msgs.add(e.status + e.code + e.message); } }
  assert.equal(msgs.size, 1);
});
test("M7774 the landing place comes from the server-resolved link, not from client input", () => {
  const s = mk(freshDb());
  approved(s, { bossId: "vendorA", requestedBy: "vendorA" });
  const r = s.staffDoorSignIn("business-hub", { ...ok(), requestedVendor: "vendorB", destination: { bossId: "vendorB" } });
  assert.equal(r.destination.bossId, "vendorA");
  assert.equal(r.destination.section, "vendor-shop");
});
test("M7774 suspended, rejected or removed links cannot sign in", () => {
  for (const status of ["suspended", "rejected", "removed"]) {
    const db = freshDb(); const s = mk(db); approved(s);
    db.prepare("UPDATE staff_links SET status=? WHERE nexaUserId='u1'").run(status);
    assert.throws(() => s.staffDoorSignIn("business-hub", ok()), (e) => e.code === "staff_sign_in_failed", status);
  }
});

// ---- M7775 isolation, M7776 permissions, M7777 upload queue
const fsx = require("fs"), pathx = require("path");
function approvedWith(s, perms, over = {}) { const l = pending(s, { permissions: perms, ...over }); return s.decideLink(l.id, { id: "dir1", tier: "director" }, "approved"); }

test("M7775 vendor A's staff is refused on vendor B and on any permission it was not given", () => {
  const s = mk(freshDb());
  approvedWith(s, ["products"], { bossId: "vendorA", requestedBy: "vendorA" });
  assert.equal(s.authorizeStaffAction("u1", "vendorA", "products").bossId, "vendorA");
  for (const [target, perm] of [["vendorB", "products"], ["vendorA", "orders"], ["vendorA", "uploads"], [undefined, "products"], ["", "products"]]) {
    assert.throws(() => s.authorizeStaffAction("u1", target, perm), (e) => e.code === "forbidden" && e.status === 403, `${target}/${perm}`);
  }
  assert.throws(() => s.authorizeStaffAction("stranger", "vendorA", "products"), (e) => e.status === 403);
  assert.throws(() => s.authorizeStaffAction(null, "vendorA", "products"), (e) => e.status === 403);
});
test("M7775 suspended or removed staff lose access immediately", () => {
  for (const status of ["suspended", "removed"]) {
    const db = freshDb(); const s = mk(db);
    approvedWith(s, ["products"], { bossId: "vendorA", requestedBy: "vendorA" });
    db.prepare("UPDATE staff_links SET status=? WHERE nexaUserId='u1'").run(status);
    assert.throws(() => s.authorizeStaffAction("u1", "vendorA", "products"), (e) => e.status === 403, status);
  }
});
test("M7775 source check: existing vendor staff routes take the vendor from the signed-in user, never from the client", () => {
  const src = fsx.readFileSync(pathx.join(__dirname, "staff.js"), "utf8");
  assert.doesNotMatch(src, /req\.(body|params|query)\??\.(vendorId|vendor)\b/);
  assert.match(src, /DELETE|app\.delete\(\"\/api\/mall\/vendor\/staff\/:id\"/);
  assert.match(src, /WHERE id = \? AND vendorId = \? AND status != 'removed'\"\)\.get\(req\.params\.id, req\.vendor\.id\)/);
  for (const m of src.matchAll(/app\.(get|post|delete)\("(\/api\/mall\/[^"]+)", ([^,]+),/g)) assert.equal(m[3].trim(), "A", m[2]); // every route sits behind authMiddleware
});
test("M7776 staff get at most what the boss holds; unknown names refused; no cap supplied fails closed", () => {
  const s = mk(freshDb());
  assert.throws(() => s.createPendingLink({ ...base, permissions: ["orders", "sales_view"] }, { bossCap: ["orders"] }), (e) => e.code === "over_cap");
  assert.throws(() => s.createPendingLink({ ...base, permissions: ["made_up"] }), (e) => e.code === "bad_permissions");
  const raw = L.createStaffLinks(freshDb());
  assert.throws(() => raw.createPendingLink(base), (e) => e.code === "boss_cap_missing");
  assert.equal(s.createPendingLink({ ...base, permissions: ["orders"] }, { bossCap: ["orders"] }).link.permissions, '["orders"]');
});
test("M7777 an upload stays pending, and is refused without the uploads permission", () => {
  const s = mk(freshDb());
  approvedWith(s, ["products"], { bossId: "vendorA", requestedBy: "vendorA" });
  assert.throws(() => s.submitUpload("u1", "product", { name: "Hat" }), (e) => e.status === 403);
  const s2 = mk(freshDb());
  approvedWith(s2, ["uploads"], { bossId: "vendorA", requestedBy: "vendorA" });
  const u = s2.submitUpload("u1", "product", { name: "Hat" });
  assert.equal(u.status, "pending"); assert.equal(u.bossId, "vendorA"); assert.equal(u.submittedBy, "u1");
});
test("M7777 only the boss side of that unit decides; no self-approval; reasons enforced; one decision wins", () => {
  const s = mk(freshDb());
  approvedWith(s, ["uploads"], { bossId: "vendorA", requestedBy: "vendorA" });
  const u = s.submitUpload("u1", "photo", { url: "x" });
  assert.throws(() => s.decideUpload(u.id, { id: "o2", bossId: "vendorB" }, "approved"), (e) => e.status === 403);
  assert.throws(() => s.decideUpload(u.id, { id: "u1", bossId: "vendorA" }, "approved"), (e) => e.code === "self_approval");
  assert.throws(() => s.decideUpload(u.id, { id: "o1", bossId: "vendorA" }, "rejected", ""), (e) => e.code === "reason_required");
  assert.equal(s.decideUpload(u.id, { id: "o1", bossId: "vendorA" }, "approved").status, "approved");
  assert.throws(() => s.decideUpload(u.id, { id: "o1", bossId: "vendorA" }, "rejected", "late"), (e) => e.code === "already_decided");
});
test("M7777 bad upload types and oversized or non-object payloads are refused", () => {
  const s = mk(freshDb());
  approvedWith(s, ["uploads"], { bossId: "vendorA", requestedBy: "vendorA" });
  for (const [k, p] of [["video", { a: 1 }], ["product", "text"], ["product", null], ["product", { big: "x".repeat(20001) }]]) assert.throws(() => s.submitUpload("u1", k, p), (e) => e.code === "bad_upload", k);
});
