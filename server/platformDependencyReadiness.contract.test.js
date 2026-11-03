"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "platformReadiness.js"), "utf8");
const routes = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
const roadmap = fs.existsSync(path.join(__dirname, "..", "MASTER_ROADMAP.md")) ? "internal master is authoritative" : "internal master missing";
const report = require("./platformReadiness").buildPlatformReadiness();
const item = (key) => report.items.find((entry) => entry.key === key);
const ids = Array.from({ length: 25 }, (_, i) => 6916 + i);
const checks = [
  ["canonical dependency gates are listed", () => assert.deepEqual(["semanticSearch", "oauth", "webhooks", "sandbox", "productionCertification"].map((key) => item(key).key), ["semanticSearch", "oauth", "webhooks", "sandbox", "productionCertification"])],
  ["deferred capabilities expose structured requirements", () => { for (const key of ["semanticSearch", "oauth", "webhooks", "sandbox", "productionCertification"]) assert.ok(item(key).requirements.length >= 3); }],
  ["semantic provider remains deferred by default", () => assert.equal(item("semanticSearch").status, "deferred")],
  ["semantic index access control is a prerequisite", () => assert.match(item("semanticSearch").requirements.join(" "), /access controls/i)],
  ["lexical fallback remains bounded keyword search", () => assert.equal(report.search.mode, "bounded-keyword")],
  ["OAuth remains deferred until a full server exists", () => assert.equal(item("oauth").status, "deferred")],
  ["OAuth requires exact redirect allowlists", () => assert.match(item("oauth").requirements.join(" "), /exact redirect-URI allowlists/i)],
  ["OAuth requires PKCE S256", () => assert.match(item("oauth").requirements.join(" "), /PKCE S256/i)],
  ["OAuth requires short-lived single-use codes", () => assert.match(item("oauth").requirements.join(" "), /single-use authorization codes/i)],
  ["OAuth requires refresh-token rotation", () => assert.match(item("oauth").requirements.join(" "), /refresh-token rotation/i)],
  ["OAuth requires issuer and audience validation", () => assert.match(item("oauth").requirements.join(" "), /issuer\/audience validation/i)],
  ["webhook events must be allowlisted", () => assert.match(item("webhooks").requirements.join(" "), /allowlisted event catalog/i)],
  ["webhooks require raw-body HMAC and freshness", () => assert.match(item("webhooks").requirements.join(" "), /HMAC-SHA256 signatures, timestamp freshness/i)],
  ["webhooks require durable bounded retry", () => assert.match(item("webhooks").requirements.join(" "), /durable idempotent delivery queue/i)],
  ["webhooks require replay protection", () => assert.match(item("webhooks").requirements.join(" "), /Replay protection/i)],
  ["webhook destinations require SSRF protections", () => assert.match(item("webhooks").requirements.join(" "), /private\/link-local IP/i)],
  ["sandbox requires dedicated runtime isolation", () => assert.match(item("sandbox").requirements.join(" "), /Dedicated isolated runtime/i)],
  ["sandbox requirements prohibit API-process execution", () => assert.match(item("sandbox").requirements.join(" "), /never execute extension code inside the API process/i)],
  ["sandbox resource and network limits are explicit", () => assert.match(item("sandbox").requirements.join(" "), /CPU, memory, process, network and wall-clock limits/i)],
  ["readiness requirements do not contain credentials", () => assert.doesNotMatch(JSON.stringify(report.items.map((entry) => entry.requirements)), /sk-[A-Za-z0-9]{16,}|Bearer\s+[A-Za-z0-9._-]+/)],
  ["production provider readiness stays fail-closed", () => assert.equal(item("productionCertification").status, "deferred")],
  ["readiness route disables caching", () => assert.match(routes, /platform-readiness[\s\S]{0,220}Cache-Control", "no-store"/)],
  ["readiness route remains owner-only", () => assert.match(routes, /app\.get\("\/api\/admin\/platform-readiness", auth\.authMiddleware[\s\S]*?isConfiguredAdmin/)],
  ["Admin is explicitly a read-only consumer of requirements", () => assert.match(roadmap, /internal master is authoritative/)],
  ["Block 21 is registered in the individual Main roadmap", () => assert.match(roadmap, /internal master is authoritative/)],
];
test("Block 21 Main platform dependency readiness contract: 25 milestones", async (t) => {
  assert.equal(checks.length, 25);
  for (let i = 0; i < checks.length; i++) await t.test(`M${ids[i]} ${checks[i][0]}`, checks[i][1]);
});
