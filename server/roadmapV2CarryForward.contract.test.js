"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildRoadmapV2CarryForward } = require("./roadmapV2CarryForward");
const { buildPlatformReadiness } = require("./platformReadiness");
const ledger = fs.readFileSync(path.join(__dirname, "..", "docs", "CEO_GLOBAL_READINESS_V2_CARRY_FORWARD.md"), "utf8");
const queue = fs.readFileSync(path.join(__dirname, "..", "docs", "CEO_GLOBAL_READINESS_V2_CARRY_FORWARD_QUEUE.md"), "utf8");
const register = fs.readFileSync(path.join(__dirname, "..", "docs", "CEO_GLOBAL_READINESS_REGISTER_V2.md"), "utf8");
const EXPECTED = {
  11: [176,180,180,180,181,181,182,197,183,187,187,185,190,180,180,189,179,192,192,183,186,197,189,198,200],
  12: [126,127,128,128,130,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,149,150],
  13: [101,102,105,113,106,107,108,109,110,110,111,112,114,115,116,117,123,118,119,119,120,123,124,108,102]
};
function rowsFor(source, wantedStatus) {
  return source.split(/\r?\n/).filter((line) => /^\| \d{2} \| \d{2} \|/.test(line)).map((line) => line.split("|").slice(1, -1).map((c) => c.trim())).filter((c) => !wantedStatus || c[7] === wantedStatus);
}

test("Block 27 Main carry-forward target validation contract", async (t) => {
  const report = buildRoadmapV2CarryForward();
  await t.test("all 500 historical rows have valid candidate targets", () => {
    assert.equal(report.historicalItems, 500);
    assert.equal(report.uniqueHistoricalItems, 500);
    assert.equal(report.v2TargetReferencesValid, true);
    assert.equal(report.carryForwardTargetsAssigned, true);
    assert.equal(report.carryForwardTargetsValidated, false);
  });
  await t.test("all 75 historical misfit rows have item-level validated V2 targets in the right domains", () => {
    assert.equal(report.historicalMisfitItems, 75);
    assert.equal(report.misfitTargetsValidated, 75);
    assert.equal(report.misfitTargetMismatches, 0);
    assert.equal(report.misfitTargetValidationComplete, true);
    const rows = rowsFor(ledger, "MISFIT_TARGET_VALIDATED_FEATURE_OPEN");
    assert.equal(rows.length, 75);
    for (const row of rows) {
      const block = Number(row[0]); const item = Number(row[1]);
      assert.equal(Number(row[5].slice(3)), EXPECTED[block][item - 1], `V1 ${block}/${item}`);
      assert.equal(row[4], "MISFIT_OPEN");
    }
  });
  await t.test("425 other legacy rows remain queued for feature evidence audit", () => {
    assert.equal(report.evidenceAuditRequired, 425);
    assert.equal(rowsFor(ledger, "EVIDENCE_AUDIT_REQUIRED").length, 425);
    assert.equal(report.featureEvidenceAuditComplete, false);
  });
  await t.test("ordered queue contains 425 rows, records Block 28 audit outcomes for ranks 001–025, and leaves the remaining 400 unaudited", () => {
    const q = queue.split(/\r?\n/).filter((line) => /^\| \d{3} \| P[0-2] \|/.test(line));
    assert.equal(q.length, 425);
    const parsed = q.map((line) => line.split("|").slice(1, -1).map((c) => c.trim()));
    assert.deepEqual(parsed.slice(0,25).map((r) => Number(r[0])), Array.from({length:25},(_,i)=>i+1));
    assert.ok(parsed.slice(0, 25).every((r) => r[8].startsWith("AUDITED_") && r[8].endsWith("FEATURE_OPEN")));
    assert.ok(parsed.slice(25).every((r) => r[8] === "EVIDENCE_AUDIT_REQUIRED"));
    assert.ok(parsed.every((r) => ![11,12,13].includes(Number(r[2].split("/")[0]))));
    const priorities = parsed.map((r) => Number(r[1].slice(1)));
    assert.deepEqual(priorities, [...priorities].sort((a,b)=>a-b));
  });
  await t.test("no historical completion status automatically transfers to V2", () => {
    assert.equal(report.automaticStatusTransfers, 0);
    assert.match(ledger, /Automatic completion transfers to V2: \*\*0\*\*/);
    assert.match(ledger, /Target validation is not feature completion/);
  });
  await t.test("V2 register retains exactly 500 unique strategy IDs", () => {
    const ids = [...register.matchAll(/\*\*(G2-\d{3})\*\*/g)].map((m) => m[1]);
    assert.equal(ids.length, 500);
    assert.equal(new Set(ids).size, 500);
    assert.equal(ids[0], "G2-001"); assert.equal(ids[499], "G2-500");
  });
  await t.test("owner readiness exposes validated misfit targets without certifying features", () => {
    const readiness = buildPlatformReadiness({});
    assert.equal(readiness.roadmapV2CarryForward.misfitTargetValidationComplete, true);
    assert.equal(readiness.roadmapV2CarryForward.carryForwardTargetsValidated, false);
    assert.equal(readiness.roadmapV2CarryForward.featureEvidenceAuditComplete, false);
    assert.equal(readiness.strategicTraceability.misfitTargetsValidated, 75);
    assert.equal(readiness.strategicTraceability.carryForwardEvidenceAuditRequired, 425);
    assert.equal(readiness.strategicTraceability.automaticStatusTransfers, 0);
  });
});
