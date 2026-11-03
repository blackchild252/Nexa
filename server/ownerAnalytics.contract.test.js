"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync(require.resolve("./ownerAnalytics"), "utf8");
const routes = fs.readFileSync(require.resolve("./index"), "utf8");
const ids = [6841,6842,6843,6844,6845,6846,6847,6848,6849,6850,6851,6852,6853,6854,6855,6856,6857,6858,6859,6860,6861,6862,6863,6864,6865];
const checks = [
  ["owner dashboard contract", () => assert.match(routes, /\/api\/admin\/owner-analytics/)],
  ["DAU source contract", () => assert.match(source, /metrics\.dau = activeUsers/)],
  ["WAU source contract", () => assert.match(source, /metrics\.wau = activeUsers/)],
  ["MAU source contract", () => assert.match(source, /metrics\.mau = activeUsers/)],
  ["retention unavailable without canonical source", () => assert.match(source, /Cohort retention requires a canonical account-activity event source/)],
  ["churn unavailable without lifecycle source", () => assert.match(source, /Churn requires a canonical active-account lifecycle event/)],
  ["signup conversion unavailable without funnel source", () => assert.match(source, /No canonical funnel\/session attribution source is configured/)],
  ["active segmentation does not invent taxonomy", () => assert.match(source, /No stable segment taxonomy is configured/)],
  ["GMV is grouped by source currency", () => assert.match(source, /sumByCurrency\(db, "mall_orders", "total", "createdAt"/)],
  ["order analytics", () => assert.match(source, /\["orders", "mall_orders"/)],
  ["refund analytics", () => assert.match(source, /\["refunds", "mall_refunds"/)],
  ["dispute analytics", () => assert.match(source, /\["disputes", "mall_checkout_disputes"/)],
  ["money analytics", () => assert.match(source, /\["walletTransactions", "wallet_transactions"/)],
  ["failed payment analytics filters failure outcomes", () => assert.match(source, /countStatus\(db, "mall_payment_events"/)],
  ["wallet analytics filters failed status", () => assert.match(source, /countStatus\(db, "wallet_transactions"/)],
  ["Dami analytics", () => assert.match(source, /\["damiWorkflows", "ai_workflows"/)],
  ["social analytics", () => { assert.match(source, /\["socialReports", "social_reports"/); assert.match(source, /\["socialPosts", "yaayz_social_posts"/); assert.match(source, /\["socialMessages", "dm_messages"/); }],
  ["moderation analytics", () => assert.match(source, /metrics\.moderation/)],
  ["Customer Care analytics source is explicit", () => assert.match(source, /customer_care_threads.*support_tickets.*customer_care_messages/)],
  ["staff workload analytics source is explicit", () => assert.match(source, /admin_work.*admin_staff_work.*staff_work_items.*staff_tasks/)],
  ["system health is not fabricated historically", () => assert.match(source, /Live process health is not a historical analytics series/)],
  ["provider health is not fabricated historically", () => assert.match(source, /no normalized historical provider-health series exists/)],
  ["anomaly detection fails closed without baseline", () => assert.match(source, /No baseline-backed anomaly model is configured/)],
  ["aggregate CSV export exists", () => assert.match(source, /function toCsv\(report\)/)],
  ["owner-only route and no-store boundary", () => { assert.match(routes, /if \(!isConfiguredAdmin\(req\.user\)\) return res\.status\(403\)\.json\(\{ error: "Owner access required\." \}\)/); assert.match(routes, /Cache-Control", "no-store/); }],
];
test("Block 18 owner analytics contract: 25 milestones", async (t) => {
  assert.equal(checks.length, 25);
  assert.equal(ids.length, 25);
  for (let i=0;i<checks.length;i++) await t.test(`M${ids[i]} ${checks[i][0]}`, checks[i][1]);
});
