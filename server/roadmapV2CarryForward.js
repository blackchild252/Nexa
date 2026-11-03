"use strict";

const fs = require("node:fs");
const path = require("node:path");
const LEDGER_PATH = path.join(__dirname, "..", "docs", "CEO_GLOBAL_READINESS_V2_CARRY_FORWARD.md");

function buildRoadmapV2CarryForward() {
  const source = fs.readFileSync(LEDGER_PATH, "utf8");
  const rows = source.split(/\r?\n/).filter((line) => /^\| \d{2} \| \d{2} \|/.test(line));
  const parsed = rows.map((line) => {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    return { v1Block: Number(cells[0]), v1Item: Number(cells[1]), legacyStatus: cells[4], v2Ref: cells[5], carryStatus: cells[7] };
  });
  const evidenceAuditRequired = parsed.filter((row) => row.carryStatus === "EVIDENCE_AUDIT_REQUIRED").length;
  const historicalMisfitItems = parsed.filter((row) => row.legacyStatus === "MISFIT_OPEN").length;
  const misfitTargetsValidated = parsed.filter((row) => row.carryStatus === "MISFIT_TARGET_VALIDATED_FEATURE_OPEN").length;
  const uniqueHistoricalItems = new Set(parsed.map((row) => `${row.v1Block}:${row.v1Item}`)).size;
  const registerPath = path.join(__dirname, "..", "docs", "CEO_GLOBAL_READINESS_REGISTER_V2.md");
  const register = fs.readFileSync(registerPath, "utf8");
  const knownV2Refs = new Set([...register.matchAll(/\*\*(G2-\d{3})\*\*/g)].map((match) => match[1]));
  const validV2Refs = parsed.every((row) => /^G2-\d{3}$/.test(row.v2Ref) && knownV2Refs.has(row.v2Ref));
  const targetBlock = (ref) => Math.floor((Number(ref.slice(3)) - 1) / 25) + 1;
  const expectedTargetBlock = { 11: 8, 12: 6, 13: 5 };
  const misfitTargetMismatches = parsed.filter((row) => expectedTargetBlock[row.v1Block] && targetBlock(row.v2Ref) !== expectedTargetBlock[row.v1Block]).length;
  const misfitTargetValidationComplete = historicalMisfitItems === 75 && misfitTargetsValidated === 75 && misfitTargetMismatches === 0;
  return {
    status: "MISFIT_TARGETS_VALIDATED_FEATURE_AUDITS_OPEN",
    product: "main",
    historicalItems: rows.length,
    uniqueHistoricalItems,
    historicalMisfitItems,
    misfitTargetsValidated,
    misfitTargetMismatches,
    misfitTargetValidationComplete,
    evidenceAuditRequired,
    v2TargetReferencesValid: validV2Refs,
    v2StrategicItems: 500,
    automaticStatusTransfers: 0,
    carryForwardTargetsAssigned: rows.length === 500 && uniqueHistoricalItems === 500 && historicalMisfitItems === 75 && misfitTargetsValidated === 75 && evidenceAuditRequired === 425 && validV2Refs,
    carryForwardTargetsValidated: false,
    featureEvidenceAuditComplete: false,
    note: "All 500 historical rows have candidate V2 targets. The 75 Block 11–13 targets have been validated at item/domain level; the historical execution misfit and feature obligations remain open. The other 425 target assignments remain provisional and require source-level evidence audits. No status transferred automatically."
  };
}
module.exports = { buildRoadmapV2CarryForward };
