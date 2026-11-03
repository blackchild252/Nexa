"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { clientRuntimeReadiness } = require("./clientRuntimeReadiness");
const { liveWebhookReadiness } = require("./liveWebhookReadiness");
const { moderationQueue } = require("./moderationOperations");
const { summarizeFulfillment } = require("./fulfillmentOperations");
const { dedupeMemories } = require("./damiMemoryReliability");

test("client runtime readiness exposes every missing validation dependency", () => {
  const r = clientRuntimeReadiness();
  assert.equal(r.ready, false); assert.deepEqual(r.blockers, ["missing_root_lockfile","dependencies_not_installed","playwright_not_available","android_runtime_not_validated"]);
});
test("live mode cannot claim readiness before webhook signature validation", () => {
  assert.equal(liveWebhookReadiness({mode:"live",providerConfigured:true,webhookSecretConfigured:true}).ready,false);
  assert.equal(liveWebhookReadiness({mode:"live",providerConfigured:true,webhookSecretConfigured:true,signatureVerificationTested:true}).ready,true);
});
test("moderation queue separates urgent review", () => {
  const r = moderationQueue([{escalation:"normal"},{escalation:"urgent"},{escalation:"urgent"}]);
  assert.equal(r.total,3); assert.equal(r.urgent,2);
});
test("fulfillment summary keeps marketplace, Yaayz and Kitchen boundaries", () => {
  const r = summarizeFulfillment({marketplace:[{status:"fulfilled"},{status:"disputed"}],yaayz:[{status:"pending"}],kitchen:[{status:"failed"}]});
  assert.deepEqual(r.marketplace,{total:2,pending:0,exceptions:1}); assert.equal(r.yaayz.pending,1); assert.equal(r.kitchen.exceptions,1);
});
test("Dami memory normalization deduplicates repeated context without expanding it", () => {
  const r = dedupeMemories([{category:"preference",content:" Likes fashion "},{category:"preference",content:"likes fashion"},{category:"plan",content:"Trip"}]);
  assert.equal(r.length,2); assert.equal(r[0].content,"Likes fashion");
});
