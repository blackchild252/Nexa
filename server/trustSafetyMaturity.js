"use strict";

const REPORT_STATUSES = new Set(["open", "triaged", "actioned", "dismissed"]);
const APPEAL_STATUSES = new Set(["open", "under_review", "resolved", "dismissed"]);
const SENSITIVE_KEYS = new Set(["details", "context", "email", "phone", "ip", "metadata", "deviceId", "token"]);

function boundedLimit(value, fallback = 100, max = 200) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(Math.max(Math.floor(n), 1), max) : fallback;
}
function normalizeReportStatus(status) { const s=String(status||"").toLowerCase(); return REPORT_STATUSES.has(s)?s:"open"; }
function normalizeAppealStatus(status) { const s=String(status||"").toLowerCase(); return APPEAL_STATUSES.has(s)?s:"open"; }
function redactCaseRow(row={}) {
  const out={}; for (const [k,v] of Object.entries(row||{})) out[k]=SENSITIVE_KEYS.has(k)?undefined:v;
  for (const k of SENSITIVE_KEYS) delete out[k];
  return out;
}
function dedupeReports(rows=[]) { const seen=new Set(); return (Array.isArray(rows)?rows:[]).filter(r=>{const k=String(r?.id||""); if(!k||seen.has(k)) return false; seen.add(k); return true;}); }
function dedupeAppeals(rows=[]) { const seen=new Set(); return (Array.isArray(rows)?rows:[]).filter(r=>{const k=String(r?.id||""); if(!k||seen.has(k)) return false; seen.add(k); return true;}); }
function sortNewest(rows=[]) { return [...(Array.isArray(rows)?rows:[])].sort((a,b)=>String(b?.updatedAt||b?.createdAt||"").localeCompare(String(a?.updatedAt||a?.createdAt||""))); }
function appealEligibility(report, appellantId) { return !!report && !!appellantId && ["actioned","dismissed"].includes(String(report.status)) && String(report.targetUserId||report.subjectId)===String(appellantId); }
function appealWindow(createdAt, now=Date.now(), days=30) { const t=Date.parse(createdAt); if(!Number.isFinite(t)) return false; return now-t <= days*86400000; }
function moderationSummary(reports=[], appeals=[]) { const rs=dedupeReports(reports), as=dedupeAppeals(appeals); return {reports:rs.length, activeReports:rs.filter(r=>["open","triaged"].includes(normalizeReportStatus(r.status))).length, appeals:as.length, activeAppeals:as.filter(a=>["open","under_review"].includes(normalizeAppealStatus(a.status))).length}; }
function roomSafetyPolicy(room={}) { return {discoverable:Boolean(room.discoverable), ownerOnlyModeration:Boolean(room.ownerId), allowMemberReports:true}; }
module.exports={boundedLimit,normalizeReportStatus,normalizeAppealStatus,redactCaseRow,dedupeReports,dedupeAppeals,sortNewest,appealEligibility,appealWindow,moderationSummary,roomSafetyPolicy};
