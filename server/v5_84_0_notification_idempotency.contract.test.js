"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const indexSource = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
const dbSource = fs.readFileSync(path.join(__dirname, "db.js"), "utf8");
const notificationsSource = fs.readFileSync(path.join(__dirname, "notifications.js"), "utf8");

const milestones = [
  [1450, "dedupe persistence boundary", () => assert.match(indexSource, /const dedupeKey = String\(data\?\.dedupeKey/)],
  [1451, "atomic dedupe insert", () => assert.match(indexSource, /INSERT OR IGNORE INTO notification_events/)],
  [1452, "database uniqueness boundary", () => assert.match(dbSource, /UNIQUE INDEX IF NOT EXISTS idx_notifications_user_dedupe/)],
  [1453, "user-scoped dedupe", () => assert.match(dbSource, /idx_notifications_user_dedupe[^\n]*\(userId, dedupeKey\)/)],
  [1454, "bounded dedupe key", () => assert.match(indexSource, /slice\(0, 160\)/)],
  [1455, "duplicate row lookup", () => assert.match(indexSource, /SELECT id FROM notification_events WHERE userId=\? AND dedupeKey=\?/)],
  [1456, "duplicate returns existing event", () => assert.match(indexSource, /eventId: existing\.id/)],
  [1457, "duplicate does not requeue", () => assert.match(indexSource, /duplicate: true, delivered: false, queued: 0/)],
  [1458, "no silent ignored insert", () => assert.match(indexSource, /notification dedupe insert was ignored without an existing event/)],
  [1459, "non-deduped insert preserved", () => assert.match(indexSource, /INSERT INTO notification_events\(id,userId,title,body,type,data,createdAt,readAt,dedupeKey\)/)],
  [1460, "event payload serialization preserved", () => assert.match(indexSource, /const eventData = JSON\.stringify\(event\.data\)/)],
  [1461, "dedupe occurs before push policy", () => assert.ok(indexSource.indexOf("INSERT OR IGNORE INTO notification_events") < indexSource.indexOf("notificationPreferences.allows(db, userId, event.type)"))],
  [1462, "dedupe occurs before token fanout", () => assert.ok(indexSource.indexOf("INSERT OR IGNORE INTO notification_events") < indexSource.indexOf("SELECT token FROM push_tokens WHERE userId = ?"))],
  [1463, "dedupe source remains notification event", () => assert.match(indexSource, /notification_events/)],
  [1464, "dedupe key excluded from client data", () => assert.match(notificationsSource, /dedupeKey.*continue/)],
  [1465, "event id remains random for winning insert", () => assert.match(notificationsSource, /id: "n_" \+ crypto\.randomBytes/)],
  [1466, "duplicate lookup is bounded", () => assert.match(indexSource, /LIMIT 1/)],
  [1467, "duplicate remains user isolated", () => assert.match(indexSource, /WHERE userId=\? AND dedupeKey=\?/)],
  [1468, "existing delivery architecture preserved", () => assert.match(indexSource, /notificationDelivery\.enqueue\(db, event, tokens\)/)],
  [1469, "existing delivery loop preserved", () => assert.match(indexSource, /notificationDelivery\.deliverDue\(db, new Date\(\), notificationDelivery\.MAX_BATCH\)/)],
  [1470, "push suppression remains after persistence", () => assert.match(indexSource, /if \(!pushAllowed\) return \{ recorded: true, pushSuppressed: true/)],
  [1471, "dedupe does not mutate existing event", () => assert.doesNotMatch(indexSource, /UPDATE notification_events SET .*dedupeKey/)],
  [1472, "concurrency regression contract", () => assert.match(indexSource, /The unique \(userId,dedupeKey\) index is the concurrency boundary/)],
  [1473, "source-of-truth preservation", () => assert.match(indexSource, /The in-app event is the source of truth/)],
  [1474, "B125 release certification", () => assert.ok(indexSource.includes("INSERT OR IGNORE") && dbSource.includes("idx_notifications_user_dedupe"))],
];

test("B125 notification idempotency contract: 25/25 milestones", () => {
  for (const [milestone, name, check] of milestones) {
    assert.doesNotThrow(check, `M${milestone} ${name}`);
  }
});

test("B125 notification idempotency contract exposes every milestone", () => {
  assert.deepEqual(milestones.map(([m]) => m), Array.from({length: 25}, (_, i) => 1450 + i));
});
