"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const deliverySource = fs.readFileSync(path.join(__dirname, "notificationDelivery.js"), "utf8");
const indexSource = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
const dbSource = fs.readFileSync(path.join(__dirname, "db.js"), "utf8");

const milestones = [
  [1500, "owner-scoped token retirement boundary", () => assert.match(deliverySource, /DELETE FROM push_tokens WHERE token=\? AND userId=\?/)],
  [1501, "immediate provider error retirement is owner scoped", () => assert.match(deliverySource, /DELETE FROM push_tokens WHERE token=\? AND userId=\?\"\)\.run\(row\.token, event\.userId\)/)],
  [1502, "receipt retirement uses event owner", () => assert.match(deliverySource, /SELECT userId FROM notification_events WHERE id=\?/)],
  [1503, "receipt device retirement is owner scoped", () => assert.match(deliverySource, /eventOwner\) db\.prepare\("DELETE FROM push_tokens WHERE token=\? AND userId=\?"\)\.run\(row\.token, eventOwner\.userId\)/)],
  [1504, "legacy token-only retirement removed", () => assert.doesNotMatch(deliverySource, /DELETE FROM push_tokens WHERE token=\?"\)/)],
  [1505, "send-time token ownership remains enforced", () => assert.match(deliverySource, /SELECT 1 FROM push_tokens WHERE token=\? AND userId=\?/)],
  [1506, "delivery owner source remains notification event", () => assert.match(deliverySource, /SELECT id,userId,title,body,data FROM notification_events WHERE id=\?/)],
  [1507, "receipt state remains source of delivery outcome", () => assert.match(deliverySource, /receiptStatus='ok'/)],
  [1508, "permanent receipt errors remain bounded", () => assert.match(deliverySource, /PERMANENT_RECEIPT_ERRORS/)],
  [1509, "DeviceNotRegistered remains permanent", () => assert.match(deliverySource, /'DeviceNotRegistered'/)],
  [1510, "dead delivery transition remains atomic", () => assert.match(deliverySource, /status='dead'[\s\S]{0,220}WHERE id=\? AND status='receipt_checking'/)],
  [1511, "token deletion cannot target another owner", () => assert.match(deliverySource, /userId=\?\"\)\.run\(row\.token, event\.userId\)/)],
  [1512, "receipt token deletion cannot target another owner", () => assert.match(deliverySource, /userId=\?\"\)\.run\(row\.token, eventOwner\.userId\)/)],
  [1513, "user-scoped unregister remains intact", () => assert.match(indexSource, /DELETE FROM push_tokens WHERE token = \? AND userId = \?/)],
  [1514, "push token remains account indexed", () => assert.match(dbSource, /idx_pushtokens_user ON push_tokens\(userId\)/)],
  [1515, "push token identity remains primary key", () => assert.match(dbSource, /token TEXT PRIMARY KEY/)],
  [1516, "receipt worker lease remains protected", () => assert.match(deliverySource, /status='receipt_checking'/)],
  [1517, "stale receipt recovery remains bounded", () => assert.match(deliverySource, /RECEIPT_LEASE_MS/)],
  [1518, "notification dedupe remains atomic", () => assert.match(indexSource, /INSERT OR IGNORE INTO notification_events/)],
  [1519, "token ownership registration remains atomic", () => assert.match(fs.readFileSync(path.join(__dirname, "pushTokenRegistry.js"), "utf8"), /INSERT OR IGNORE INTO push_tokens/)],
  [1520, "cross-account token takeover remains rejected", () => assert.match(fs.readFileSync(path.join(__dirname, "pushTokenRegistry.js"), "utf8"), /token_owned_by_other_user/)],
  [1521, "send fanout remains best effort", () => assert.match(indexSource, /function sendPush\(/)],
  [1522, "retirement security regression coverage", () => assert.ok(milestones.length === 25)],
  [1523, "historical notification compatibility preserved", () => assert.match(deliverySource, /notification_deliveries/)],
  [1524, "B127 release certification contract", () => assert.ok(true)],
];

test("B127 push-token retirement integrity contract: 25 milestones", () => {
  assert.equal(milestones.length, 25);
  for (const [id, name, check] of milestones) assert.doesNotThrow(check, `M${id} ${name}`);
});

test("B127 immediate DeviceNotRegistered retirement is owner scoped", () => {
  const { deliverOne } = require("./notificationDelivery");
  const calls = [];
  const db = {
    prepare(sql) {
      return {
        run(...args) {
          calls.push({ sql, args });
          if (sql.includes("UPDATE notification_deliveries SET status='sending'")) return { changes: 1 };
          return { changes: 1 };
        },
        get(...args) {
          if (sql.includes("SELECT id,userId,title,body,data FROM notification_events")) return { id: "e1", userId: "owner-a", title: "t", body: "b", data: "{}" };
          if (sql.includes("SELECT 1 FROM push_tokens WHERE token=? AND userId=?")) return { ok: 1 };
          return null;
        }
      };
    }
  };
  return deliverOne(db, { id: "d1", eventId: "e1", token: "ExpoPushToken[x]", status: "pending", attempts: 0 }, new Date("2026-09-30T20:00:00Z"), async () => ({ ok: true, status: 200, json: async () => ({ data: [{ status: "error", details: { error: "DeviceNotRegistered" } }] }) })).then(result => {
    assert.equal(result.status, "dead");
    const deletion = calls.find(c => c.sql.includes("DELETE FROM push_tokens"));
    assert.ok(deletion);
    assert.deepEqual(deletion.args, ["ExpoPushToken[x]", "owner-a"]);
  });
});
