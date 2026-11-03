"use strict";

const APPEAL_STATUSES = Object.freeze(["open", "under_review", "resolved", "dismissed"]);
const MAX_REASON = 500;

function normalizeAppeal(input = {}) {
  const status = APPEAL_STATUSES.includes(String(input.status)) ? String(input.status) : "open";
  return {
    id: String(input.id || "").trim().slice(0, 120),
    reportId: String(input.reportId || "").trim().slice(0, 120),
    appellantId: String(input.appellantId || "").trim().slice(0, 120),
    reason: String(input.reason || "").trim().slice(0, MAX_REASON),
    status,
  };
}

function canAppeal(report, appellantId) {
  if (!report || !appellantId) return false;
  if (!['actioned', 'dismissed'].includes(String(report.status))) return false;
  return String(report.subjectId) === String(appellantId);
}

module.exports = { APPEAL_STATUSES, MAX_REASON, normalizeAppeal, canAppeal };
