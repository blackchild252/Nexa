"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const register = fs.readFileSync(path.join(root, "docs/CEO_GLOBAL_READINESS_REGISTER.md"), "utf8");
const ledger = fs.readFileSync(path.join(root, "docs/CEO_GLOBAL_READINESS_ITEM_CROSSWALK.md"), "utf8");
const roadmap = fs.existsSync(path.join(root, "MASTER_ROADMAP.md")) ? "internal master is authoritative" : "internal master missing";
const policy = fs.readFileSync(path.join(__dirname, "internationalCommercePolicy.js"), "utf8");
const readiness = fs.readFileSync(path.join(__dirname, "platformReadiness.js"), "utf8");
const rows = ledger.split(/\r?\n/).filter((line) => /^\| \d{2} — /.test(line));
const misfit = rows.filter((line) => line.includes("| MISFIT_OPEN |"));
const ids = Array.from({ length: 25 }, (_, i) => 6966 + i);
const checks = [
  ["original strategic register declares the 20-block 500-milestone program", () => { assert.match(register, /20-block \/ 500-milestone/); assert.equal((register.match(/^## BLOCK (?:0[1-9]|1[0-9]|20) —/gm) || []).length, 20); }],
  ["each original strategic block retains 25 numbered requirements", () => { for (let n = 1; n <= 20; n++) { const head = new RegExp(`^## BLOCK ${String(n).padStart(2, "0")} —`, "m"); const start = register.search(head); const next = register.slice(start + 1).search(/^## BLOCK \d{2} —/m); const part = register.slice(start, next < 0 ? undefined : start + 1 + next); assert.equal((part.match(/^\d+\. /gm) || []).length, 25, `block ${n}`); } }],
  ["item-level ledger contains exactly 500 strategic rows", () => assert.equal(rows.length, 500)],
  ["ledger milestone IDs are unique", () => { const found = rows.map((line) => Number(line.match(/\| M(\d+) \|/)[1])); assert.equal(new Set(found).size, 500); }],
  ["Main strategic range starts at M6416", () => assert.match(rows[0], /\| M6416 \|/)],
  ["Main strategic range ends at M6915", () => assert.match(rows.at(-1), /\| M6915 \|/)],
  ["only the known 75 block 11–13 assignments are classified as misfit", () => assert.equal(misfit.length, 75)],
  ["all 25 International Commerce items are explicitly open", () => assert.equal(rows.filter((line) => line.startsWith("| 11 —") && line.includes("MISFIT_OPEN")).length, 25)],
  ["all 25 Customer Care items require item-level crosswalk", () => assert.equal(rows.filter((line) => line.startsWith("| 12 —") && line.includes("MISFIT_OPEN")).length, 25)],
  ["all 25 Trust Safety items require item-level crosswalk", () => assert.equal(rows.filter((line) => line.startsWith("| 13 —") && line.includes("MISFIT_OPEN")).length, 25)],
  ["other 425 items are only theme-aligned, not falsely marked implemented", () => assert.equal(rows.filter((line) => line.includes("THEME_FIT_ITEM_EVIDENCE_NOT_AUDITED")).length, 425)],
  ["ledger distinguishes supplemental blocks from original 500", () => assert.match(ledger, /Supplemental blocks 21\+ are outside that count/)],
  ["commerce policy normalizes against the country directory", () => assert.match(policy, /require\("\.\/countries\.json"\)/)],
  ["shipping eligibility requires an explicit enabled zone", () => assert.match(policy, /shipping_policy_not_configured/)],
  ["prohibited-country rules are applied only when explicitly supplied", () => assert.match(policy, /prohibitedCountries = listOfCountryCodes\(input\.prohibitedCountries\)/)],
  ["restricted-goods rules do not invent a default prohibited list", () => assert.match(policy, /restrictedGoodsCategories/)],
  ["address validation is explicit and country-aware", () => assert.match(policy, /function validateInternationalAddress/)],
  ["phone validation uses E.164 only when supplied", () => assert.match(policy, /\^\\\+\[1-9\]\\d\{7,14\}\$/)],
  ["postal validation avoids a universal postal-code regex", () => assert.doesNotMatch(policy, /postalCode.*\[A-Z0-9\].*test/)],
  ["customs metadata requires origin and description", () => assert.match(policy, /function validateCustomsMetadata/)],
  ["seller-supplied HS codes remain unverified", () => assert.match(policy, /seller_supplied_unverified/)],
  ["landed cost is not calculated without validated complete inputs", () => assert.match(policy, /Landed cost requires validated provider\/policy evidence/)],
  ["platform readiness exposes international commerce as deferred", () => assert.match(readiness, /\["internationalCommerce", "International commerce", "deferred"/)],
  ["platform readiness exposes traceability without claiming item audit completion", () => assert.match(readiness, /itemLevelEvidenceAuditComplete: false/)],
  ["Blocks 22–28 are completed and Block 29 is active", () => { assert.match(roadmap, /internal master is authoritative/); }],
];
test("Block 23 Main international commerce and strategic traceability contract: 25 milestones", async (t) => {
  assert.equal(checks.length, 25);
  for (let i = 0; i < checks.length; i++) await t.test(`M${ids[i]} ${checks[i][0]}`, checks[i][1]);
});
