"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const popup = fs.readFileSync(path.join(__dirname, "..", "src", "NexaInAppNotificationPopup.tsx"), "utf8");

test("popup queues all recent eligible first-load notifications instead of discarding the burst", () => {
  assert.match(popup, /const candidates=rows\.filter\(n=>popupEligible\(n\) && !seenNotificationIds\.current\.has\(n\.id\)\)\.reverse\(\)/);
  assert.match(popup, /pendingQueue\.current\.push\(candidate\)/);
  assert.match(popup, /const room=Math\.max\(0,POPUP_QUEUE_MAX-pendingQueue\.current\.length\)/);
});

test("popup advances queued notifications after timeout, dismissal or opening", () => {
  assert.match(popup, /if\(!visible && !item && pendingQueue\.current\.length\)\{ const next=takeNextFresh\(pendingQueue\.current\); if\(next\) show\(next\); \}/);
  assert.match(popup, /setVisible\(false\); setItem\(null\)/);
  assert.match(popup, /const dismiss=\(\)=>/);
});

test("popup does not surface the queued alerts on auth routes and preserves dedupe", () => {
  assert.match(popup, /startsWith\('\/auth\/'\).*pendingQueue\.current\.length/);
  assert.match(popup, /seenNotificationIds\.current\.has\(n\.id\)/);
});

test("dismissal does not create a read receipt, while open does", () => {
  const dismiss = popup.slice(popup.indexOf('const dismiss=()=>'));
  assert.doesNotMatch(dismiss, /\/read/);
  assert.match(popup, /\/api\/notifications\/\$\{encodeURIComponent\(item\.id\)\}\/read/);
});
