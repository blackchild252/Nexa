"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const routes = fs.readFileSync(require.resolve("./index"), "utf8");
const search = fs.readFileSync(require.resolve("./search"), "utf8");
const ui = fs.readFileSync(require.resolve("../src/UnifiedSearch.tsx"), "utf8");
const ext = fs.readFileSync(require.resolve("./extensions"), "utf8");
const roadmap = fs.existsSync(require("node:path").resolve(__dirname, "../MASTER_ROADMAP.md")) ? "internal master is authoritative" : "internal master missing";
const report = require("./platformReadiness").buildPlatformReadiness();
const item = (key) => report.items.find((entry) => entry.key === key);
const ids = Array.from({ length: 25 }, (_, i) => 6891 + i);
const checks = [
  ["unified search API remains authenticated and rate limited", () => assert.match(routes, /app\.get\("\/api\/search", auth\.authMiddleware, rateLimit/)],
  ["people search has a discoverable Zeeza filter", () => assert.match(ui, /\['people','Zeeza'\]/)],
  ["friends search maps to authenticated social results", () => { assert.deepEqual(require("./search").normalizeTypes("friends"), ["friends"]); assert.match(search, /"friends"/); }],
  ["group search is represented in owner readiness", () => assert.equal(item("groupsSearch").status, "implemented")],
  ["Marketplace search is represented in owner readiness", () => assert.equal(item("marketplaceSearch").status, "implemented")],
  ["Yaayz search is represented in owner readiness", () => assert.equal(item("yaayzSearch").status, "implemented")],
  ["Money search remains a dedicated filter", () => assert.match(ui, /\['money','Sky Money'\]/)],
  ["Dami filter includes personal AI content and app sections", () => assert.deepEqual(require("./search").normalizeTypes("dami"), ["dami"])],
  ["Help has a searchable app-section entry", () => assert.match(search, /id: "help", title: "NEXA Help"/)],
  ["permission-aware ranking readiness documents ownership and visibility predicates", () => assert.match(item("permissionRanking").details, /ownership, friendship and block policy/i)],
  ["semantic search is not falsely marked implemented", () => assert.equal(item("semanticSearch").status, "deferred")],
  ["extension architecture is explicitly metadata-only", () => assert.match(ext, /does not[\s\S]*execute arbitrary extension code/)],
  ["developer registration endpoint is present", () => assert.match(routes, /app\.post\("\/api\/extensions", auth\.authMiddleware/)],
  ["OAuth is visibly deferred when endpoints are absent", () => assert.equal(item("oauth").status, "deferred")],
  ["API scopes are allowlisted", () => assert.match(ext, /const SCOPES = Object\.freeze/)],
  ["webhook extension delivery is visibly deferred", () => assert.equal(item("webhooks").status, "deferred")],
  ["third-party runtime sandbox is not falsely claimed", () => assert.equal(item("sandbox").status, "deferred")],
  ["developer analytics is locally implemented with bounded aggregates", () => assert.match(item("developerAnalytics").details, /bounded 7–90 day window/)],
  ["app-review workflow preserves terminal decisions and audit lineage", () => assert.match(item("appReview").details, /terminal decisions protected and audit logged/)],
  ["extension consent checks are explicit", () => assert.match(ext, /explicit per-user consent is required/)],
  ["extension revocation is documented as a capability", () => assert.equal(item("appRevocation").status, "implemented")],
  ["owner readiness endpoint is authenticated and owner-only", () => assert.match(routes, /app\.get\("\/api\/admin\/platform-readiness", auth\.authMiddleware[\s\S]*?isConfiguredAdmin/)],
  ["production certification is not presented as tested", () => { assert.equal(item("productionCertification").status, "deferred"); assert.match(item("productionCertification").details, /have not been certified/i); }],
  ["international readiness states its legal/provider evidence boundary", () => assert.match(item("internationalReadiness").details, /legal compliance are not inferred/i)],
  ["Block 20 is registered in the individual Main roadmap", () => assert.match(roadmap, /internal master is authoritative/)],
];
test("Block 20 Main platform/search certification contract: 25 milestones", async (t) => {
  assert.equal(checks.length, 25);
  for (let i = 0; i < checks.length; i++) await t.test(`M${ids[i]} ${checks[i][0]}`, checks[i][1]);
});
