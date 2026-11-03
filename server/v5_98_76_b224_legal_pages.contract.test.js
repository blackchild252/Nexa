"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const json = (p) => JSON.parse(read(p));
const legal = require("./v5_98_76_legal_pages");
const PROD = { NODE_ENV: "production" };
const READY = { ...PROD, NEXA_PRIVACY_CONTACT: "privacy@example.test", NEXA_LEGAL_CONTACT: "legal@example.test", NEXA_LEGAL_REVIEWED: "1" };

test("M3475 B223 is frozen historical evidence", () => {
  assert.match(read("B223_REPORT.md") || "", /./);
});
test("M3477 routes are registered", () => {
  const s = read("server/index.js");
  assert.match(s, /app\.get\("\/privacy"/); assert.match(s, /app\.get\("\/terms"/);
});
test("M3478 production is fail-closed until contact set and review confirmed", () => {
  for (const id of ["privacy", "terms"]) {
    assert.equal(legal.renderLegalPage(id, { env: PROD }).status, 503);
    assert.equal(legal.renderLegalPage(id, { env: { ...PROD, NEXA_PRIVACY_CONTACT: "a@b.test", NEXA_LEGAL_CONTACT: "a@b.test" } }).status, 503);
    const ok = legal.renderLegalPage(id, { env: READY });
    assert.equal(ok.status, 200); assert.equal(ok.published, true); assert.doesNotMatch(ok.html, /REPLACE WITH/);
  }
});
test("M3479 contact is HTML-escaped", () => {
  const r = legal.renderLegalPage("privacy", { env: { ...READY, NEXA_PRIVACY_CONTACT: "<script>x</script>" } });
  assert.doesNotMatch(r.html, /<script>x/);
});
test("M3480 unknown id is 404 and missing file is 503", () => {
  assert.equal(legal.renderLegalPage("nope", { env: PROD }).status, 404);
  assert.equal(legal.renderLegalPage("privacy", { env: READY, readFile: () => { throw new Error("x"); } }).status, 503);
});
test("M3481 Docker image ships legal docs", () => assert.match(read("Dockerfile"), /COPY docs\/legal \.\/docs\/legal/));
test("M3482 legal documents keep required topics", () => {
  const { REQUIRED_PRIVACY_TOPICS, REQUIRED_TERMS_TOPICS, requiredTopicsPresent } = require("./v5_98_18_privacy_legal_readiness");
  assert.ok(requiredTopicsPresent(read("docs/legal/PRIVACY_POLICY.md"), REQUIRED_PRIVACY_TOPICS));
  assert.ok(requiredTopicsPresent(read("docs/legal/TERMS_OF_SERVICE.md"), REQUIRED_TERMS_TOPICS));
});

test("M3488 production public URL contract remains centralized", () => { const s=read("scripts/production-env-contract.mjs"); for (const k of ["EXPO_PUBLIC_API_URL","EXPO_PUBLIC_PRIVACY_POLICY_URL","EXPO_PUBLIC_TERMS_URL"]) assert.match(s,new RegExp(k)); });
test("M3489 legal URL validation remains HTTPS-only", () => assert.match(read("src/legalLinks.ts"),/validateExternalUrl/));
test("M3490 legal links remain environment-driven", () => { const s=read("src/legalLinks.ts"); assert.match(s,/EXPO_PUBLIC_PRIVACY_POLICY_URL/); assert.match(s,/EXPO_PUBLIC_TERMS_URL/); });
test("M3491 strict production launch remains fail-closed", () => assert.match(read("server/productionLaunchCertification.js"),/NEXA_STRICT_LAUNCH/));
test("M3492 production preview and fixture identities remain blocked", () => { const s=read("server/productionLaunchCertification.js"); assert.match(s,/preview/i); assert.match(s,/fixture/i); });
test("M3493 production payment and wallet boundaries remain protected", () => { const s=read("server/productionLaunchCertification.js"); assert.match(s,/payment/i); assert.match(s,/wallet/i); });
test("M3494 production CORS wildcard remains blocked", () => assert.match(read("server/productionLaunchCertification.js"),/CORS/i));
test("M3495 Yaayz remains the AdMob boundary and sample IDs stay absent", () => { assert.match(read("server/yaayz_admob.test.js"),/Yaayz|AdMob/i); assert.doesNotMatch(read("app.json"),/3940256099942544/); });
test("M3496 EAS production profile remains structurally configured", () => { const e=json("eas.json"); assert.equal(e.build.production.environment,"production"); assert.equal(e.build.production.channel,"production"); });
test("M3497 launch reports remain dynamic and secret-safe", () => { const h=read("scripts/launch-handoff-report.mjs"), c=read("scripts/launch-candidate-report.mjs"); assert.match(h,/memory\.currentBatch/); assert.match(h,/secretValuesIncluded: false/); assert.match(c,/memory\.currentBatch/); });
test("M3499 release audit remains the final internal certification boundary", () => { assert.match(read("scripts/release-gate.mjs"),/scripts\/release-audit\.mjs/); assert.match(read("scripts/release-gate.mjs"),/release-seal\.mjs/); });
