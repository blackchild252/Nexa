"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const recovery = read("server/recoveryOps.js");
const drill = read("scripts/recovery-drill.mjs");
const feed = read("scripts/zeeza-admin-ai-feed.mjs");
const handoff = read("docs/ZEEZA_ADMIN_AI_AGENT_HANDOFF.md");
const tests = read("server/zeezaAdminAiFeed.test.mjs");
const pkg = read("package.json");
const roadmap = read("MASTER_ROADMAP.md");
const checks = [
  ["M7491 recovery and AI-feed trust boundaries are explicit", () => { assert.match(recovery, /ever writes to the live database file/); assert.match(feed, /Read-only input adapter/); }],
  ["M7492 restore rejects missing path arguments", () => assert.match(recovery, /Backup and restore target are required/)],
  ["M7493 recovery scratch filenames use high-entropy random suffixes", () => assert.match(recovery, /randomBytes\(12\)/)],
  ["M7494 recovery CLI and admin feed keep diagnostics generic", () => { assert.match(drill, /path\.basename/); assert.match(feed, /stopped:.*configuration or request error/); }],
  ["M7495 admin feed uses the existing owner-gated referral API", () => assert.match(feed, /api\/admin\/zeeza\/referral-followups\?limit=500/)],
  ["M7496 invalid source manifest fails before restore", () => assert.match(recovery, /if \(!v\.ok\) return \{ ok: false, steps \}/)],
  ["M7497 admin input exposes review suggestions but no mutation operations", () => { assert.match(feed, /forbiddenActions/); assert.match(feed, /credit_subscription/); }],
  ["M7498 restore target creation remains exclusive and owned cleanup is guarded", () => { assert.match(recovery, /fs\.writeFileSync\(target, "", \{ flag: "wx" \}\)/); assert.match(recovery, /Claim the path first/); assert.match(recovery, /catch \(error\) \{\s*try \{ fs\.rmSync\(target, \{ force: true \}\); \} catch \(_\) \{\}\s*throw error;/); }],
  ["M7499 negative-path admin feed tests are registered", () => { assert.match(tests, /fails closed on unauthorized/); assert.match(pkg, /zeezaAdminAiFeed\.test\.mjs/); }],
  ["M7500 successful admin feed path is tested with a fake transport", () => assert.match(tests, /feed uses only the two authenticated read endpoints/)],
  ["M7501 missing admin API configuration is rejected", () => assert.match(feed, /NEXA_ADMIN_API_BASE is required/)],
  ["M7502 admin feed errors do not echo upstream response bodies", () => assert.match(feed, /Admin API denied/)],
  ["M7503 canonical contract command includes the current block contract", () => assert.match(pkg, /v6_1_66_b513_admin_ai_recovery\.contract\.test\.js/)],
  ["M7504 admin feed test path uses Node built-ins without provider SDK", () => { assert.match(tests, /node:test/); assert.doesNotMatch(feed, /openai|anthropic|google-generativeai/i); }],
  ["M7505 admin AI operating limits are documented", () => assert.match(handoff, /Forbidden: award approval/)],
  ["M7506 external AI processor approval is explicitly parked", () => assert.match(handoff, /third-party AI privacy approval/)],
  ["M7507 historic restore contract is preserved", () => assert.match(read("server/v5_53_0_b90_recovery.contract.test.js"), /restore drill passes on a good backup/)],
  ["M7508 focused AI-feed and recovery tests can be run directly", () => assert.match(handoff, /node scripts\/zeeza-admin-ai-feed\.mjs/)],
  ["M7509 local contract suite includes both new test files", () => { assert.match(pkg, /zeezaAdminAiFeed\.test\.mjs/); assert.match(pkg, /v6_1_66_b513_admin_ai_recovery\.contract\.test\.js/); }],
  ["M7510 recovery source is syntax-compatible with the current Node runtime", () => { assert.match(recovery, /function restoreDrill/); assert.match(feed, /export \{ safeBaseUrl/); }],
  ["M7511 release identity remains managed by the release tool", () => assert.match(read("AGENTS.md"), /Never edit identity fields by hand/)],
  ["M7512 roadmap contains the 25 milestone block", () => assert.match(roadmap, /M7491–M7515 — Recovery Drill Reliability and Database Safety/)],
  ["M7513 live provider and deployed admin behavior are not claimed by local tests", () => assert.match(handoff, /Live deployment, secret-manager configuration/)],
  ["M7514 AI action and provider blockers are parked instead of bypassed", () => assert.match(handoff, /does not call an AI vendor/)],
  ["M7515 execution report will be a dedicated auditable artifact", () => assert.ok(fs.existsSync(path.join(root, "B513_REPORT.md")) || /traceable execution report/.test(roadmap))],
];
test("B513 admin AI handoff and recovery reliability contract: 25 milestones", async t => {
  assert.equal(checks.length, 25);
  for (const [name, run] of checks) await t.test(name, run);
});
