"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const events = require("./eventCorrelation");

test("event correlation normalizes metadata and strips credential-like fields", () => {
  const event = events.createEvent({ requestId: "req-1", userId: "u1", action: "payment.verify", metadata: { amount: 500, authorization: "secret", note: "ok" } });
  assert.equal(event.requestId, "req-1");
  assert.equal(event.metadata.authorization, undefined);
  assert.equal(event.metadata.amount, 500);
});

test("event correlation persists and retrieves events by request ID", () => {
  const rows = [];
  const db = { prepare() { return { run(...args) { rows.push(args); }, all(requestId) { return rows.filter((r) => r[1] === requestId).map((r) => ({ id:r[0], requestId:r[1], userId:r[2], action:r[3], entityType:r[4], entityId:r[5], metadata:r[6], createdAt:r[7] })); } }; } };
  const event = events.createEvent({ requestId: "req-2", userId: "u2", action: "mall.search" });
  events.record(db, event);
  assert.equal(events.listByRequest(db, "req-2")[0].action, "mall.search");
});
