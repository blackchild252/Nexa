"use strict";
// Runtime regression for M7527: a real HTTP request must sanitize retention-storage failures.
const test = require("node:test");
const assert = require("node:assert/strict");
const { startServer } = require("./httpTestHarness");

const requiredPackages = ["bcryptjs", "better-sqlite3", "cors", "dotenv", "express", "multer"];
const missingPackages = requiredPackages.filter((name) => {
  try { require.resolve(name); return false; } catch { return true; }
});

test("notification retention returns generic 503 and preserves parent rows on real SQLite failure", {
  skip: missingPackages.length ? `runtime HTTP test unavailable; missing dependencies: ${missingPackages.join(", ")}` : false,
}, async () => {
  const srv = await startServer();
  const db = srv.openDb();
  try {
  const user = await srv.signup("retention-failure");
  const old = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("INSERT INTO notification_events(id,userId,title,body,type,data,createdAt) VALUES(?,?,?,?,?,?,?)")
    .run("retention-failure-event", user.userId, "Old notification", "private body", "system", "{}", old);
  db.prepare("INSERT INTO notification_deliveries(id,eventId,token,status,nextAttemptAt,createdAt,updatedAt,lastError) VALUES(?,?,?,?,?,?,?,?)")
    .run("retention-failure-delivery", "retention-failure-event", "push-token-not-for-response", "pending", old, old, old, null);
  db.exec(`CREATE TRIGGER inject_retention_storage_failure
    BEFORE DELETE ON notification_deliveries
    BEGIN SELECT RAISE(ABORT, 'private sqlite failure detail'); END;`);

  const response = await srv.request("DELETE", "/api/notifications?days=90", { token: user.token });
  assert.equal(response.status, 503);
  assert.deepEqual(response.json, { error: "Notification retention is temporarily unavailable." });
  assert.equal(response.text.includes("private sqlite failure detail"), false);
  assert.equal(response.text.includes("push-token-not-for-response"), false);
  assert.equal(db.prepare("SELECT id FROM notification_events WHERE id=?").get("retention-failure-event")?.id, "retention-failure-event");
  assert.equal(db.prepare("SELECT id FROM notification_deliveries WHERE id=?").get("retention-failure-delivery")?.id, "retention-failure-delivery");
  } finally {
    try { db.close(); } catch (_) {}
    await srv.stop();
  }
});
