"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (p) => fs.readFileSync(path.join(__dirname, p), "utf8");
const policy = require("./notificationPolicy");
const notifications = require("./notifications");
const prefs = require("./notificationPreferences");
const delivery = read("notificationDelivery.js");
const routes = read("index.js");
const center = read("../src/NotificationCenter.tsx");
const roadmap = fs.existsSync(path.join(__dirname, "..", "MASTER_ROADMAP.md")) ? "internal master is authoritative" : "internal master missing";
const checks = [
  ["M6816", () => assert.match(center, /Notifications/)],
  ["M6817", () => assert.match(read("notifications.js"), /function list/)],
  ["M6818", () => assert.deepEqual(policy.CATEGORIES.includes("security"), true)],
  ["M6819", () => assert.ok(prefs.FIELDS.includes("pushEnabled"))],
  ["M6820", () => assert.match(delivery, /push\/send/)],
  ["M6821", () => assert.equal(policy.providerReadiness({}).email, false)],
  ["M6822", () => assert.match(routes, /INSERT INTO notification_events/)],
  ["M6823", () => assert.equal(policy.providerReadiness({}).sms, false)],
  ["M6824", () => assert.match(routes, /withinQuietHours/)],
  ["M6825", () => assert.match(read("notificationBatching.js"), /slice\(0,25\)/)],
  ["M6826", () => assert.match(routes, /INSERT OR IGNORE INTO notification_events/)],
  ["M6827", () => assert.equal(policy.normalizePriority("critical"), "critical")],
  ["M6828", () => assert.match(read("notifications.js"), /normalizeData/)],
  ["M6829", () => assert.equal(policy.normalizeCategory("money"), "financial")],
  ["M6830", () => assert.match(read("customerCare.js"), /NEXA Customer Care/)],
  ["M6831", () => assert.equal(policy.normalizePriority("workflow-execute"), "normal")],
  ["M6832", () => assert.match(read("v5_84_0_notification_idempotency.contract.test.js"), /dedupe/)],
  ["M6833", () => assert.ok(notifications.TYPES.has("social") && notifications.TYPES.has("chat"))],
  ["M6834", () => assert.equal(policy.deliveryDecision({ channel: "email", enabled: true, providerReady: false }).allowed, false)],
  ["M6835", () => assert.match(delivery, /MAX_ATTEMPTS/)],
  ["M6836", () => assert.match(read("notificationPreferences.js"), /ON CONFLICT\(userId\)/)],
  ["M6837", () => assert.match(routes, /notificationDeliveryHealth\.summarize/)],
  ["M6838", () => assert.ok(policy.CHANNELS.includes("sms"))],
  ["M6839", () => assert.doesNotMatch(JSON.stringify(policy.providerReadiness({ NEXA_EMAIL_PROVIDER_TOKEN: "secret" })), /secret/)],
  ["M6840", () => assert.match(roadmap, /internal master is authoritative/)],
];
for (const [id, run] of checks) test(`${id}: Main notification communication contract`, run);
