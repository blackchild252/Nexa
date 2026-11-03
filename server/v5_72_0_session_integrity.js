"use strict";
const crypto = require("node:crypto");

const MILESTONES = Object.freeze([
  [1150,"session-identity-contract"],[1151,"token-entropy-contract"],[1152,"absolute-lifetime-contract"],[1153,"idle-lifetime-contract"],[1154,"session-touch-contract"],
  [1155,"rotation-age-contract"],[1156,"device-binding-contract"],[1157,"device-label-contract"],[1158,"session-cap-contract"],[1159,"concurrent-login-contract"],
  [1160,"revocation-reason-contract"],[1161,"atomic-rotation-contract"],[1162,"old-token-invalidation-contract"],[1163,"rotation-reuse-detection-contract"],[1164,"reuse-event-contract"],
  [1165,"ip-hash-contract"],[1166,"user-agent-hash-contract"],[1167,"logout-all-contract"],[1168,"password-change-revocation-contract"],[1169,"account-close-revocation-contract"],
  [1170,"provider-session-contract"],[1171,"safe-session-list-contract"],[1172,"expired-session-cleanup-contract"],[1173,"session-certification-contract"],[1174,"cumulative-session-integrity-certification"]
]);

const SESSION_ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_IDLE_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_TOUCH_MS = 5 * 60 * 1000;
const SESSION_ROTATION_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_CAP = 8;
const TOKEN_BYTES = 32;
const DEVICE_ID_MAX = 160;
const DEVICE_LABEL_MAX = 80;
const SENSITIVE = /(?:token|secret|password|authorization|cookie|key|credential)/i;

function newSessionId(){ return `sess_${crypto.randomBytes(18).toString("hex")}`; }
function newToken(){ return crypto.randomBytes(TOKEN_BYTES).toString("hex"); }
function hash(value){ return crypto.createHash("sha256").update(String(value || "")).digest("hex"); }
function hashIp(ip){ return hash(String(ip || "").split(",")[0].trim()); }
function hashUserAgent(ua){ return hash(String(ua || "").slice(0,512)); }
function normalizeDeviceId(value){ const v=String(value||"").trim(); return /^[A-Za-z0-9._:-]{1,160}$/.test(v) ? v : null; }
function normalizeDeviceLabel(value){ return String(value||"").replace(/[\u0000-\u001f\u007f]/g,"").trim().slice(0,DEVICE_LABEL_MAX) || "NEXA device"; }
function normalizeDeviceMetadata(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const pick = (key, max) => {
    const value = String(source[key] || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
    return value || null;
  };
  const platform = pick("platform", 24);
  const allowed = new Set(["ios", "android", "web", "windows", "macos", "linux"]);
  return {
    platform: platform && allowed.has(platform.toLowerCase()) ? platform.toLowerCase() : null,
    osVersion: pick("osVersion", 32),
    appVersion: pick("appVersion", 32),
    deviceModel: pick("deviceModel", 64),
    browserName: pick("browserName", 32)
  };
}
function parseDeviceMetadata(value) {
  try { return normalizeDeviceMetadata(JSON.parse(String(value || "{}"))); }
  catch (_) { return normalizeDeviceMetadata({}); }
}
function sessionLifetime(now = new Date(), createdAt){ const created=new Date(createdAt || now).getTime(); return {absoluteExpiresAt:new Date(created + SESSION_ABSOLUTE_MS).toISOString(), idleExpiresAt:new Date(now.getTime()+SESSION_IDLE_MS).toISOString()}; }
function sessionValid(row, now = new Date()){ if(!row) return false; if(row.revokedAt) return false; const n=now.getTime(); return new Date(row.expiresAt).getTime()>n && (!row.idleExpiresAt || new Date(row.idleExpiresAt).getTime()>n); }
function needsTouch(row, now = new Date()){ if(!row?.lastSeenAt) return true; return now.getTime()-new Date(row.lastSeenAt).getTime() >= SESSION_TOUCH_MS; }
function needsRotation(row, now = new Date()){ if(!row?.createdAt) return true; return now.getTime()-new Date(row.createdAt).getTime() >= SESSION_ROTATION_MS; }
function safeSession(row, currentHash){ return {sessionId:row.sessionId,createdAt:row.createdAt,expiresAt:row.expiresAt,idleExpiresAt:row.idleExpiresAt||null,lastSeenAt:row.lastSeenAt||null,deviceLabel:row.deviceLabel||"NEXA device",deviceMetadata:parseDeviceMetadata(row.deviceMetadata),current:row.token===currentHash}; }
function capSessions(rows, cap=SESSION_CAP){ const list=Array.isArray(rows)?rows.slice():[]; return list.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,Math.max(1,Number(cap)||SESSION_CAP)); }
function certification(results=[]){ const r=Array.isArray(results)?results:[]; return {version:"5.72.0",milestones:MILESTONES.length,total:r.length,passed:r.filter(Boolean).length,complete:MILESTONES.length===25&&r.length===25&&r.every(Boolean)}; }
module.exports={MILESTONES,SESSION_ABSOLUTE_MS,SESSION_IDLE_MS,SESSION_TOUCH_MS,SESSION_ROTATION_MS,SESSION_CAP,TOKEN_BYTES,DEVICE_ID_MAX,DEVICE_LABEL_MAX,newSessionId,newToken,hash,hashIp,hashUserAgent,normalizeDeviceId,normalizeDeviceLabel,normalizeDeviceMetadata,parseDeviceMetadata,sessionLifetime,sessionValid,needsTouch,needsRotation,safeSession,capSessions,certification,SENSITIVE};
