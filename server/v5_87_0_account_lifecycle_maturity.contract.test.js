"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const integrity = require("./v5_77_0_account_closure_integrity");
const lifecycle = read("server/accountLifecycle.js");
const readiness = read("server/accountLifecycleReadiness.js");
const index = read("server/index.js");
const portability = read("server/accountPortability.js");

const tests = [
  [1525, "closure module exposes the B128 relationship manifest", () => assert.equal(integrity.closureRelationshipManifest().length, integrity.CLOSURE_RELATIONSHIP_COLUMNS.length)],
  [1526, "kitchen referral ownership is explicitly classified", () => assert.deepEqual(integrity.CLOSURE_RELATIONSHIP_COLUMNS.find(x => x[0] === "kitchen_referrals"), ["kitchen_referrals", "ownerId", "delete-on-closure"])],
  [1527, "kitchen referral records are deleted with account-owned workspace state", () => assert.ok(integrity.DELETE_USER_TABLES.includes("kitchen_referrals"))],
  [1528, "vendor staff lifecycle cleanup is wired into account closure", () => assert.match(lifecycle, /cleanupVendorStaff\(db, userId, now\)/)],
  [1529, "closed staff users lose active vendor-staff relationships", () => assert.match(read("server/v5_77_0_account_closure_integrity.js"), /UPDATE vendor_staff SET status='removed'.*WHERE userId=\?/s)],
  [1530, "closing a vendor owner removes remaining active or invited staff access", () => assert.match(read("server/v5_77_0_account_closure_integrity.js"), /WHERE vendorId=\? AND status!='removed'/)],
  [1531, "vendor-staff invite codes are cleared during closure cleanup", () => assert.match(read("server/v5_77_0_account_closure_integrity.js"), /inviteCode=NULL/)],
  [1532, "removed vendor-staff history remains retained rather than hard-deleted", () => assert.match(read("server/v5_77_0_account_closure_integrity.js"), /status='removed'/)],
  [1533, "vendor owner closure remains delegated to canonical vendor lifecycle", () => assert.match(lifecycle, /closeVendorForAccount/)],
  [1534, "vendor lifecycle deactivates the closed owner's vendor", () => assert.match(read("server/vendorSubscriptions.js"), /UPDATE vendors SET status='inactive'/)],
  [1535, "public marketplace continues to require an active vendor", () => assert.match(index, /COALESCE\(v\.status, 'active'\) = 'active'/)],
  [1536, "kitchen orders remain explicitly retained for financial/history integrity", () => assert.match(read("server/v5_77_0_account_closure_integrity.js"), /"kitchen_orders"/)],
  [1537, "kitchen cashback beneficiary retention is explicitly classified", () => assert.deepEqual(integrity.CLOSURE_RELATIONSHIP_COLUMNS.find(x => x[0] === "kitchen_cashback_ledger" && x[1] === "beneficiaryId"), ["kitchen_cashback_ledger", "beneficiaryId", "financial-retention"])],
  [1538, "moderation report relationships are explicitly classified as retained evidence", () => assert.ok(integrity.CLOSURE_RELATIONSHIP_COLUMNS.some(x => x[0] === "social_reports" && x[1] === "reporterId" && x[2] === "moderation-retention"))],
  [1539, "moderation appeal relationships are explicitly classified as retained evidence", () => assert.ok(integrity.CLOSURE_RELATIONSHIP_COLUMNS.some(x => x[0] === "social_report_appeals" && x[1] === "appellantId" && x[2] === "moderation-retention"))],
  [1540, "fitness business ownership is explicitly classified", () => assert.ok(integrity.CLOSURE_RELATIONSHIP_COLUMNS.some(x => x[0] === "fitness_gyms" && x[1] === "ownerId"))],
  [1541, "closure still revokes sessions before anonymizing the account", () => assert.ok(integrity.DELETE_USER_TABLES.includes("sessions"))],
  [1542, "closure still removes push tokens", () => assert.ok(integrity.DELETE_USER_TABLES.includes("push_tokens"))],
  [1543, "closure still removes notification events", () => assert.ok(integrity.DELETE_USER_TABLES.includes("notification_events"))],
  [1544, "notification deliveries are removed through their notification-event owner boundary", () => assert.match(lifecycle, /DELETE FROM notification_deliveries WHERE eventId IN \(SELECT id FROM notification_events WHERE userId=\?\)/)],
  [1545, "account export remains unavailable after closure", () => assert.match(portability, /Closed accounts cannot be exported/)],
  [1546, "account import remains unavailable for closed targets", () => assert.match(portability, /Closed accounts cannot import data/)],
  [1547, "closure readiness continues to require retained commerce tables", () => assert.ok(readiness.includes("kitchen_orders"))],
  [1548, "closure readiness includes classified relationship tables", () => assert.match(readiness, /REQUIRED_RELATIONSHIP_TABLES/)],
  [1549, "B128 certification remains bound to the 25-milestone contract", () => assert.equal(25, tests.length)],
];
for (const [n, title, fn] of tests) test(`B128 M${n}: ${title}`, fn);

test("B128 vendor-staff cleanup behavior removes both staff-owned and vendor-owned access", () => {
  const updates = [];
  const db = {
    prepare(sql) {
      if (sql.includes("sqlite_master")) return { get: () => ({ 1: 1 }) };
      if (sql.includes("FROM vendors WHERE userId")) return { all: () => [{ id: "v1" }] };
      if (sql.includes("WHERE userId=? AND status!='removed'")) return { run: (...args) => { updates.push(["staff", args]); return { changes: 1 }; } };
      if (sql.includes("WHERE vendorId=? AND status!='removed'")) return { run: (...args) => { updates.push(["vendor", args]); return { changes: 2 }; } };
      throw new Error(`unexpected SQL: ${sql}`);
    }
  };
  const changed = integrity.cleanupVendorStaff(db, "u1", "2026-10-01T00:00:00.000Z");
  assert.equal(changed, 3);
  assert.equal(updates.length, 2);
  assert.deepEqual(updates[0][1], ["2026-10-01T00:00:00.000Z", "u1"]);
  assert.deepEqual(updates[1][1], ["2026-10-01T00:00:00.000Z", "v1"]);
});
