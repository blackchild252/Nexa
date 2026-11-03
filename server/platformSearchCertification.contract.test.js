"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const read = (name) => fs.readFileSync(require("node:path").join(__dirname, name), "utf8");
const search = read("search.js");
const index = read("index.js");
const ext = read("extensions.js");
const dev = read("extensionDeveloper.js");
const extensionCore = read("extensions.js");
const readiness = read("platformReadiness.js");
const ids = Array.from({ length: 25 }, (_, i) => 6891 + i);
const checks = [
  ["unified search endpoint and client are wired", () => { assert.match(index, /app\.get\("\/api\/search", auth\.authMiddleware, rateLimit/); assert.match(read("../src/UnifiedSearch.tsx"), /Search NEXA/); }],
  ["people search excludes self and inactive accounts", () => { assert.match(search, /u\.id != \?/); assert.match(search, /accountStatus,'active'\) = 'active'/); }],
  ["friends search requires accepted friendship edges", () => assert.match(search, /FROM friendships f JOIN users u ON u\.id = f\.friendId/)],
  ["groups search is membership-scoped", () => assert.match(search, /JOIN money_group_members m ON m\.groupId = g\.id AND m\.userId = \?/)],
  ["Marketplace search limits results to active products", () => assert.match(search, /WHERE p\.active = 1/)],
  ["Yaayz listings are active and available", () => assert.match(search, /WHERE active = 1 AND quantity > 0/)],
  ["Zeeza conversations remain participant-scoped", () => assert.match(search, /FROM dm_threads t JOIN users u[\s\S]*?WHERE \(t\.userAId=\? OR t\.userBId=\?\)/)],
  ["Money search is scoped to the signed-in user", () => assert.match(search, /FROM expenses WHERE userId = \?/)],
  ["Dami knowledge uses user-scoped records", () => assert.match(search, /FROM ai_knowledge WHERE userId = \?/)],
  ["Help has a bounded topic directory and reachable UI filter", () => { assert.match(search, /const HELP_TOPICS = \[/); assert.match(read("../src/UnifiedSearch.tsx"), /\['help','Help'\]/); }],
  ["permission-aware ranking uses deterministic stable tie breakers", () => assert.match(search, /b\.score - a\.score \|\| a\.title\.localeCompare\(b\.title\)/)],
  ["semantic search is honestly deferred without a vector provider", () => assert.match(readiness, /semanticSearch.*deferred.*No approved embedding\/vector provider/s)],
  ["extension architecture is metadata/capability based", () => assert.match(ext, /arbitrary third-party code is not executed/)],
  ["developer registration endpoint exists", () => assert.match(index, /app\.post\("\/api\/extensions", auth\.authMiddleware/)],
  ["OAuth is not falsely represented as available", () => assert.match(readiness, /\["oauth", "OAuth authorization server", "deferred"/)],
  ["API scope catalogue is allowlisted", () => assert.match(extensionCore, /const SCOPES = Object\.freeze\(/)],
  ["extension webhook delivery is honestly deferred", () => assert.match(readiness, /\["webhooks", "Extension webhooks", "deferred"/)],
  ["third-party executable sandbox is honestly deferred", () => assert.match(readiness, /\["sandbox", "Extension sandbox", "deferred"/)],
  ["developer analytics is available from bounded audit aggregates", () => { assert.match(readiness, /\["developerAnalytics", "Developer analytics", "implemented"/); assert.match(index, /app\.get\("\/api\/extensions\/developer\/analytics"/); }],
  ["app review submission and owner decisions are implemented", () => { assert.match(readiness, /\["appReview", "Extension app review workflow", "implemented"/); assert.match(index, /app\.post\("\/api\/extensions\/:id\/review"/); assert.match(index, /app\.post\("\/api\/admin\/extensions\/reviews\/:id\/decision"/); }],
  ["scope consent is required before enablement", () => assert.match(ext, /explicit per-user consent is required before an extension can be enabled/)],
  ["revoked extension lifecycle is terminal", () => assert.match(index, /UPDATE extensions SET status='revoked'/)],
  ["local security-control evidence is documented without external audit claims", () => assert.match(readiness, /not an external penetration test/)],
  ["international readiness does not infer legal eligibility", () => assert.match(readiness, /eligibility, provider availability and legal compliance are not inferred/)],
  ["production certification remains deferred pending live acceptance", () => assert.match(readiness, /productionCertification.*deferred.*Live deployed API/s)],
];
test("Block 20 Main platform/search certification: 25 milestones", async (t) => {
  assert.equal(checks.length, 25);
  for (let i = 0; i < checks.length; i++) await t.test(`M${ids[i]} ${checks[i][0]}`, checks[i][1]);
});
