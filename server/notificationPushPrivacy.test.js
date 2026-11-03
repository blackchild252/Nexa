"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { safePushMessage } = require("./notificationDelivery");

test("chat push payloads never expose message text, preview, sender contact or arbitrary metadata", () => {
  const payload = safePushMessage({
    type: "chat",
    title: "Alice sent you a message",
    body: "My bank PIN is 1234",
    data: JSON.stringify({ action: "dm_thread", threadId: "thread-1", message: "My bank PIN is 1234", preview: "private preview", email: "alice@example.test", arbitrary: "private metadata" }),
  }, "ExpoPushToken[test]");
  assert.equal(payload.title, "New Zeeza message");
  assert.equal(payload.body, "Open Zeeza to view your message.");
  assert.deepEqual(payload.data, { action: "dm_thread", id: "thread-1" });
  assert.equal(JSON.stringify(payload).includes("1234"), false);
  assert.equal(JSON.stringify(payload).includes("alice@example.test"), false);
});

test("ordinary notification push metadata drops sensitive keys and bounds visible copy", () => {
  const payload = safePushMessage({
    type: "system", title: "A".repeat(500), body: "B".repeat(500),
    data: JSON.stringify({ action: "marketplace", orderId: "order-1", messageBody: "private", accessToken: "secret", safeFlag: true }),
  }, "push-token");
  assert.equal(payload.title.length, 120);
  assert.equal(payload.body.length, 180);
  assert.deepEqual(payload.data, { action: "marketplace", orderId: "order-1", safeFlag: true });
  assert.equal(JSON.stringify(payload).includes("secret"), false);
});

test("incoming call payload keeps high-priority call behavior without forwarding private data", () => {
  const payload = safePushMessage({ type: "chat", title: "private caller info", body: "private call details", data: JSON.stringify({ screen: "call", callId: "call-1", message: "secret" }) }, "push-token");
  assert.equal(payload.title, "Incoming call");
  assert.equal(payload.body, "Open Zeeza to answer.");
  assert.equal(payload.channelId, "calls");
  assert.equal(payload.priority, "high");
  assert.deepEqual(payload.data, { action: "call", id: "call-1" });
});

test("live push and receipt network adapter is disabled by default without an explicit opt-in", async () => {
  const delivery = require("./notificationDelivery");
  const old = process.env.NEXA_PUSH_DELIVERY_ENABLED;
  delete process.env.NEXA_PUSH_DELIVERY_ENABLED;
  try {
    const skipped = await delivery.deliverOne({}, { id: "d1", eventId: "e1", token: "push-token", status: "pending" }, new Date(), globalThis.fetch);
    assert.deepEqual(skipped, { status: "skipped", reason: "provider_disabled" });
    const receipts = await delivery.processReceipts({}, new Date(), 10, globalThis.fetch);
    assert.equal(receipts.skipped, "provider_disabled");
    assert.equal(receipts.attempted, 0);
  } finally {
    if (old === undefined) delete process.env.NEXA_PUSH_DELIVERY_ENABLED;
    else process.env.NEXA_PUSH_DELIVERY_ENABLED = old;
  }
});
