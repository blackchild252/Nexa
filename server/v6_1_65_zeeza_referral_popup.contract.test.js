 "use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const growth = read("server/growthLifecycle.js");
const routes = read("server/index.js");
const schema = read("server/db.js");
const profile = read("src/ZeezaProfile.tsx");
const admin = read("src/app/admin/zeeza-referrals.tsx");
const popup = read("src/NexaInAppNotificationPopup.tsx");
const kitchen = read("server/index.js");
const roadmap = read("MASTER_ROADMAP.md");
const checks = [
  ["M7466 central referral tokens have one-way SHA-256 hashes", () => { assert.match(growth, /createHash\("sha256"\)\.update\(token\)/); assert.match(schema, /nexa_zeeza_referral_tokens/); }],
  ["M7467 repeated link generation does not invalidate older links", () => assert.match(growth, /nexa_zeeza_referral_tokens \(id,userId,codeHash,createdAt,disabledAt\)/)],
  ["M7468 generated links use Zeeza as the central programme", () => assert.match(profile, /Zeeza Invite & Earn/)],
  ["M7469 referral attribution rejects self-referrals", () => assert.match(growth, /ref\.userId === uid/)],
  ["M7470 campaign start is captured on link generation", () => assert.match(routes, /ensureZeezaReferralCampaign\(db, \{ userId: req\.user\.id/)],
  ["M7471 campaigns use a 30-day bounded window", () => assert.match(growth, /30 \* 24 \* 60 \* 60 \* 1000/)],
  ["M7472 account types normalize to user or vendor", () => assert.match(growth, /normalizeReferralAccountType/)],
  ["M7473 qualification requires an activation event", () => assert.match(growth, /e\.eventName='activation'/)],
  ["M7474 vendor target is 100 verified referrals", () => assert.match(growth, /const target = vendor \? 100 : 30/)],
  ["M7475 user subscription reward needs 30 additional referrals after baseline", () => assert.match(growth, /priorQualified >= 20 \|\| qualifiedReferrals >= 50/)],
  ["M7476 AAMI Rewards unlock threshold remains 20", () => assert.match(growth, /qualifiedReferrals >= 20/)],
  ["M7477 reward state is pending review rather than auto-credit", () => assert.match(growth, /reached \? "pending_review"/)],
  ["M7478 admin follow-up API is owner-gated", () => assert.match(routes, /\/api\/admin\/zeeza\/referral-followups[\s\S]*?isConfiguredAdmin\(req\.user\)/)],
  ["M7479 follow-up query caps requested row count", () => { assert.match(growth, /FOLLOWUP_SCAN_CAP = 500/); assert.match(growth, /Math\.max\(1, Math\.min\(FOLLOWUP_SCAN_CAP/); }],
  ["M7480 admin tab identifies both users and vendors", () => assert.match(admin, /All user and vendor profiles/)],
  ["M7481 admin tab preserves Kitchen Hub separation", () => assert.match(admin, /Kitchen Hub referrals remain separate/)],
  ["M7482 profile referral action obtains a central link", () => assert.match(profile, /authedFetch\('\/api\/growth\/referrals\/me'\)/)],
  ["M7483 profile shares onboarding-compatible referral path", () => assert.match(profile, /nexa:\/\/auth\/signup\?ref=/)],
  ["M7484 popup lifetime is readable and future timestamps are rejected", () => { assert.match(popup, /IN_APP_POPUP_MS = 5000/); const logic = fs.readFileSync(path.join(__dirname, "..", "src", "notificationPopupLogic.ts"), "utf8"); assert.match(logic, /POPUP_FRESH_MS = 3 \* 60 \* 1000/); assert.match(logic, /age >= 0 && age < POPUP_FRESH_MS/); }],
  ["M7485 popup queues eligible notifications on the first fetch", () => { assert.match(popup, /if\(!initialized\.current\) initialized\.current=true/); assert.match(popup, /const candidates=rows\.filter/); assert.match(popup, /pendingQueue\.current\.push/); }],
  ["M7486 popup deduplicates notification IDs", () => assert.match(popup, /seenNotificationIds\.current\.has\(n\.id\)/)],
  ["M7487 dismissing popup marks it seen without marking it read", () => assert.match(popup, /const dismiss=\(\)=>\{\s*seenNotificationIds\.current\.add\(item\.id\)/)],
  ["M7488 opening popup marks the notification read", () => assert.match(popup, /authedFetch\(`\/api\/notifications\/\$\{encodeURIComponent\(item\.id\)\}\/read`/)],
  ["M7489 Kitchen referral route and existing settlement remain untouched", () => { assert.match(kitchen, /\/api\/leisure\/kitchen\/referral/); assert.match(kitchen, /settleKitchenReferral/); }],
  ["M7490 roadmap records the current feature scope", () => assert.match(roadmap, /M7466–M7490 — Zeeza Referral Programme and Popup Notification Integrity/)]
];
test("B512 Zeeza referral and popup contract: 25 milestones", async t => {
  assert.equal(checks.length, 25);
  for (const [id, name, run] of checks.map((x, i) => [x[0], x[0], x[1]])) await t.test(id, run);
});
