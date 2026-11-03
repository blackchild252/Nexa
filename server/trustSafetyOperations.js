"use strict";

const REPORT_STATUSES = Object.freeze(["open", "triaged", "actioned", "dismissed"]);
const ESCALATION_LEVELS = Object.freeze(["normal", "elevated", "urgent"]);

function normalizeTrustReport(input = {}) {
  const status = REPORT_STATUSES.includes(String(input.status)) ? String(input.status) : "open";
  const escalation = ESCALATION_LEVELS.includes(String(input.escalation)) ? String(input.escalation) : "normal";
  return {
    id: String(input.id || "").trim().slice(0, 120),
    reporterId: String(input.reporterId || "").trim().slice(0, 120),
    subjectId: String(input.subjectId || "").trim().slice(0, 120),
    reason: String(input.reason || "other").trim().slice(0, 80),
    status,
    escalation,
  };
}

function requiresUrgentReview(report = {}) {
  return String(report.escalation) === "urgent" || ["fraud", "threat", "child_safety"].includes(String(report.reason).toLowerCase());
}

module.exports = { REPORT_STATUSES, ESCALATION_LEVELS, normalizeTrustReport, requiresUrgentReview };
