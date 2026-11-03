"use strict";
const crypto = require("crypto");
const MILESTONES = Object.freeze([
  [925,"sensitive-response-field-denylist"],[926,"account-export-redaction"],[927,"import-metadata-trust-boundary"],[928,"profile-visibility-resolver"],[929,"blocked-user-response-isolation"],
  [930,"notification-action-ownership"],[931,"push-token-ownership"],[932,"friend-request-target-normalization"],[933,"group-membership-role-invariant"],[934,"group-entry-void-ownership"],
  [935,"call-signal-participant-boundary"],[936,"call-history-privacy"],[937,"room-member-visibility"],[938,"admin-uniform-gate"],[939,"admin-pagination-cap"],
  [940,"vendor-staff-permission-snapshot"],[941,"vendor-evidence-transition-boundary"],[942,"extension-identity-owner-binding"],[943,"extension-scope-normalization"],[944,"ai-memory-export-redaction"],
  [945,"ai-workflow-run-ownership"],[946,"search-result-privacy-filter"],[947,"error-response-internal-detail-scrub"],[948,"audit-metadata-redaction"],[949,"v5.63.0-cumulative-privacy-authorization-certification"]
]);
const SENSITIVE_KEYS = /(?:password|passwordhash|token|secret|apikey|api_key|authorization|cookie|session|keyhash|clientsecret|refresh|providersecret|privatekey)/i;
function redactSensitive(value) {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [k,v] of Object.entries(value)) out[k] = SENSITIVE_KEYS.test(k) ? undefined : redactSensitive(v);
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out;
}
function exportSafeAccount(account = {}) {
  const allowed = ["id","name","username","profileBio","avatarUrl","profileVisibility","discoverable","allowFriendRequests","allowInboxRequests","createdAt"];
  return Object.fromEntries(allowed.filter(k => Object.prototype.hasOwnProperty.call(account,k)).map(k => [k, account[k]]));
}
function assertImportMetadata(bundle = {}) {
  if (!bundle || bundle.format !== "nexa-account-export") throw Object.assign(new Error("Unsupported account export."),{code:"INVALID_EXPORT"});
  if (bundle.account && ("passwordHash" in bundle.account || "token" in bundle.account || "session" in bundle.account)) throw Object.assign(new Error("Account credentials cannot be imported."),{code:"IMPORT_CREDENTIALS_FORBIDDEN"});
  return true;
}
function profileVisibility({viewerId,targetId,visibility="friends",friends=false,blocked=false}) {
  if (blocked) return {allowed:false,reason:"blocked"};
  if (String(viewerId)===String(targetId)) return {allowed:true,reason:"self"};
  if (visibility === "public") return {allowed:true,reason:"public"};
  if (visibility === "friends" && friends) return {allowed:true,reason:"friends"};
  return {allowed:false,reason:"private"};
}
function notificationActionOwned(row,userId) { return !!row && String(row.userId)===String(userId); }
function pushTokenOwned(row,userId) { return !!row && String(row.userId)===String(userId); }
function normalizeTargetId(value) { const id=String(value||"").trim(); return /^[A-Za-z0-9_-]{1,120}$/.test(id) ? id : null; }
function groupRoleAllows(role,action) { const map={view:["owner","admin","member"],invite:["owner","admin"],reorder:["owner","admin"],void_entry:["owner","admin"]}; return (map[action]||[]).includes(String(role)); }
function callParticipantAllows(row,userId) { return !!row && String(row.userId)===String(userId); }
function adminPage({limit=50,offset=0,max=100}) { return {limit:Math.min(Math.max(Number(limit)||50,1),Math.max(1,Number(max)||100)),offset:Math.min(Math.max(Number(offset)||0,0),10000)}; }
function vendorPermissionSnapshot(staff,{action}) { const roles={owner:["read","write","finance","admin"],admin:["read","write","finance"],manager:["read","write"],staff:["read"]}; return !!staff && (roles[String(staff.role)]||[]).includes(String(action)); }
function extensionScope(scope) { const s=String(scope||"").trim().toLowerCase(); return /^[a-z][a-z0-9._:-]{0,80}$/.test(s) ? s : null; }
function workflowRunOwned(row,userId) { return !!row && String(row.userId)===String(userId); }
function scrubError(error) { const msg=String(error?.message||""); if (/SQLITE|SELECT |INSERT |UPDATE |DELETE |constraint failed|at \//i.test(msg)) return "Request could not be completed."; return msg.slice(0,240) || "Request could not be completed."; }
function auditMetadata(meta) { return redactSensitive(meta && typeof meta === "object" ? meta : {}); }
function certification() { return {version:"5.63.0",milestones:MILESTONES.length,complete:MILESTONES.length===25}; }
module.exports={MILESTONES,SENSITIVE_KEYS,redactSensitive,exportSafeAccount,assertImportMetadata,profileVisibility,notificationActionOwned,pushTokenOwned,normalizeTargetId,groupRoleAllows,callParticipantAllows,adminPage,vendorPermissionSnapshot,extensionScope,workflowRunOwned,scrubError,auditMetadata,certification};
