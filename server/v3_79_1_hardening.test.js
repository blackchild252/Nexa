"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("invite codes use cryptographic randomness across staff, rooms, and groups", () => {
  for (const file of ["server/staff.js", "server/zeezaMessaging.js", "server/groups.js"]) {
    const s = read(file);
    assert.match(s, /require\("crypto"\)/);
    assert.doesNotMatch(s, /Math\.random\(\).*CODE_ALPHABET/);
  }
  assert.match(read("server/v5_81_0_room_invite_integrity.js"), /crypto\.randomInt\(/);
});

test("vendor staff capacity is checked inside the invitation write transaction", () => {
  const s = read("server/staff.js");
  const tx = s.indexOf("const created = db.transaction(() => {");
  const cap = s.indexOf("SELECT COUNT(*) AS n FROM vendor_staff", tx);
  const insert = s.indexOf("INSERT INTO vendor_staff", tx);
  assert.ok(tx >= 0 && cap > tx && insert > cap);
});

test("owned money-group cap is checked inside the group creation transaction", () => {
  const s = read("server/groups.js");
  const tx = s.indexOf("db.transaction(() => {");
  const cap = s.indexOf("SELECT COUNT(*) AS n FROM money_groups WHERE ownerId", tx);
  const insert = s.indexOf("INSERT INTO money_groups", tx);
  assert.ok(tx >= 0 && cap > tx && insert > cap);
});

test("marketplace order cursor includes id tie-breaker and remains backward compatible", () => {
  const { encodeOrderCursor, decodeOrderCursor } = require("./marketplaceOrders");
  const encoded = encodeOrderCursor({ createdAt: "2026-09-26T00:00:00.000Z", id: "ord_b" });
  assert.equal(decodeOrderCursor(encoded).id, "ord_b");
  assert.deepEqual(decodeOrderCursor("2026-09-26T00:00:00.000Z"), { createdAt: "2026-09-26T00:00:00.000Z", id: "" });
  assert.throws(() => decodeOrderCursor("not-a-cursor"));
});

test("marketplace order pagination compares both createdAt and id", () => {
  const s = read("server/marketplaceOrders.js");
  assert.match(s, /o\.createdAt < \? OR \(o\.createdAt = \? AND o\.id < \?\)/);
  assert.match(s, /ORDER BY o\.createdAt DESC,o\.id DESC/);
});
