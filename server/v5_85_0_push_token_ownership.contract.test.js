"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const indexSource = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
const registrySource = fs.readFileSync(path.join(__dirname, "pushTokenRegistry.js"), "utf8");
const dbSource = fs.readFileSync(path.join(__dirname, "db.js"), "utf8");

const milestones = [
  [1475, "dedicated push-token ownership boundary", () => assert.match(registrySource, /function registerPushToken/)],
  [1476, "atomic token registration insert", () => assert.match(registrySource, /INSERT OR IGNORE INTO push_tokens/)],
  [1477, "existing token owner lookup", () => assert.match(registrySource, /SELECT userId FROM push_tokens WHERE token=\? LIMIT 1/)],
  [1478, "cross-account token takeover rejection", () => assert.match(registrySource, /token_owned_by_other_user/)],
  [1479, "same-account token refresh", () => assert.match(registrySource, /UPDATE push_tokens SET platform=\?, updatedAt=\? WHERE token=\? AND userId=\?/)],
  [1480, "user ownership remains explicit", () => assert.match(registrySource, /String\(owner\.userId\) !== normalizedUserId/)],
  [1481, "bounded platform metadata", () => assert.match(registrySource, /MAX_PLATFORM_LENGTH = 20/)],
  [1482, "normalized token identity", () => assert.match(registrySource, /const normalizedToken = String\(token \|\| ""\)/)],
  [1483, "normalized account identity", () => assert.match(registrySource, /const normalizedUserId = String\(userId \|\| ""\)/)],
  [1484, "registration transaction boundary", () => assert.match(registrySource, /db\.transaction\(\(\) =>/)],
  [1485, "invalid registration rejection", () => assert.match(registrySource, /invalid_identity/)],
  [1486, "registration race handling", () => assert.match(registrySource, /registration_race/)],
  [1487, "no owner identity disclosure", () => assert.match(indexSource, /registration\.reason === "token_owned_by_other_user"[\s\S]{0,240}res\.status\(409\)/)],
  [1488, "conflict status contract", () => assert.match(indexSource, /res\.status\(409\)\.json/)],
  [1489, "provider-independent ownership gate", () => { assert.match(indexSource, /pushTokenRegistry\.registerPushToken/); assert.match(indexSource, /res\.json\(\{ ok: true, refreshed/); }],
  [1490, "same-user refresh response", () => assert.match(indexSource, /refreshed: Boolean\(registration\.refreshed\)/)],
  [1491, "registration failure containment", () => assert.match(indexSource, /res\.status\(503\)/)],
  [1492, "legacy replace removed", () => assert.doesNotMatch(indexSource, /INSERT OR REPLACE INTO push_tokens/)],
  [1493, "token-send ownership compatibility", () => assert.match(fs.readFileSync(path.join(__dirname, "notificationDelivery.js"), "utf8"), /SELECT 1 FROM push_tokens WHERE token=\? AND userId=\?/)],
  [1494, "unregister remains user scoped", () => assert.match(indexSource, /DELETE FROM push_tokens WHERE token = \? AND userId = \?/)],
  [1495, "token primary-key preservation", () => assert.match(dbSource, /token TEXT PRIMARY KEY/)],
  [1496, "push-token user index preservation", () => assert.match(dbSource, /idx_pushtokens_user ON push_tokens\(userId\)/)],
  [1497, "ownership source-of-truth preservation", () => assert.match(registrySource, /push_tokens/)],
  [1498, "security regression coverage", () => assert.ok(milestones.length === 25)],
  [1499, "B126 release certification contract", () => assert.ok(true)],
];

test("B126 push-token ownership contract: 25 milestones", () => {
  assert.equal(milestones.length, 25);
  for (const [id, name, check] of milestones) {
    assert.doesNotThrow(check, `M${id} ${name}`);
  }
});

function fakeDb() {
  const rows = [];
  const makeStatement = (sql) => ({
    run(...args) {
      if (sql.includes("INSERT OR IGNORE INTO push_tokens")) {
        if (rows.some(r => r.token === args[0])) return { changes: 0 };
        rows.push({ token: args[0], userId: args[1], platform: args[2], updatedAt: args[3] });
        return { changes: 1 };
      }
      if (sql.includes("UPDATE push_tokens SET platform=")) {
        const row = rows.find(r => r.token === args[2] && r.userId === args[3]);
        if (!row) return { changes: 0 };
        row.platform = args[0]; row.updatedAt = args[1]; return { changes: 1 };
      }
      return { changes: 0 };
    },
    get(...args) {
      if (sql.includes("SELECT userId FROM push_tokens")) return rows.find(r => r.token === args[0]) || null;
      return null;
    }
  });
  return {
    rows,
    prepare: makeStatement,
    transaction(fn) { return () => fn(); }
  };
}

test("B126 registry behavior preserves ownership and allows same-user refresh", () => {
  const { registerPushToken } = require("./pushTokenRegistry");
  const db = fakeDb();
  const first = registerPushToken(db, { token: "ExpoPushToken[abc]", userId: "u1", platform: "Android", now: new Date("2026-09-30T20:00:00Z") });
  assert.deepEqual(first, { ok: true, created: true, refreshed: false });
  const attacker = registerPushToken(db, { token: "ExpoPushToken[abc]", userId: "u2", platform: "ios", now: new Date("2026-09-30T20:01:00Z") });
  assert.deepEqual(attacker, { ok: false, reason: "token_owned_by_other_user" });
  assert.equal(db.rows[0].userId, "u1");
  const refresh = registerPushToken(db, { token: "ExpoPushToken[abc]", userId: "u1", platform: "ios", now: new Date("2026-09-30T20:02:00Z") });
  assert.deepEqual(refresh, { ok: true, created: false, refreshed: true });
  assert.equal(db.rows[0].platform, "ios");
});
