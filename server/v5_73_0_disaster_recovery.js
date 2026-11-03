"use strict";
// V5.73.0 / B114 — Disaster Recovery & Backup Certification (M1175–M1199).
const crypto = require("node:crypto");
const MILESTONES = Object.freeze([
 [1175,"backup-manifest-schema"],[1176,"backup-source-destination-isolation"],[1177,"backup-checksum-contract"],[1178,"backup-size-boundary"],[1179,"backup-freshness-contract"],
 [1180,"backup-monotonic-time-contract"],[1181,"restore-target-isolation"],[1182,"restore-readonly-contract"],[1183,"restore-integrity-contract"],[1184,"restore-foreign-key-contract"],
 [1185,"restore-required-table-contract"],[1186,"restore-schema-fingerprint-contract"],[1187,"restore-row-count-contract"],[1188,"restore-smoke-contract"],[1189,"backup-corruption-detection"],
 [1190,"manifest-immutability-contract"],[1191,"backup-lock-contract"],[1192,"backup-concurrency-contract"],[1193,"recovery-capacity-contract"],[1194,"recovery-rpo-contract"],
 [1195,"recovery-rto-contract"],[1196,"recovery-readiness-contract"],[1197,"recovery-drill-contract"],[1198,"recovery-fail-closed-contract"],[1199,"cumulative-disaster-recovery-certification"]
]);
const MAX_BACKUP_BYTES = 2 * 1024 * 1024 * 1024;
const DEFAULT_RPO_MS = 26 * 60 * 60 * 1000;
const DEFAULT_RTO_MS = 60 * 60 * 1000;
const REQUIRED_TABLES = Object.freeze(["users","sessions","wallet_accounts","wallet_transactions","mall_orders","mall_products","platform_event_log"]);
function sha256(value){ return crypto.createHash("sha256").update(Buffer.isBuffer(value)?value:String(value)).digest("hex"); }
function manifestSchema(m={}){ return {ok:/^nexa-\d{8}-\d{6}\.db$/.test(String(m.file||"")) && Number.isSafeInteger(m.bytes) && m.bytes>0 && m.bytes<=MAX_BACKUP_BYTES && /^[a-f0-9]{64}$/.test(String(m.sha256||"")) && !Number.isNaN(Date.parse(m.createdAt||""))}; }
function pathKey(p){ return String(p||"").trim().replace(/\\/g,"/").toLowerCase(); }
function backupSourceDestinationIsolation(source,destination){ const s=pathKey(source), d=pathKey(destination); return Boolean(s&&d&&s!==d&&!d.startsWith(`${s}.`)); }
function checksumContract(expected,actual){ return /^[a-f0-9]{64}$/.test(String(expected||"")) && String(expected)===String(actual||""); }
function sizeWithinLimit(bytes,max=MAX_BACKUP_BYTES){ const n=Number(bytes); return Number.isSafeInteger(n)&&n>0&&n<=Math.min(MAX_BACKUP_BYTES,Math.max(1,Number(max)||MAX_BACKUP_BYTES)); }
function freshness(createdAt,now=new Date(),maxAgeMs=DEFAULT_RPO_MS){ const age=new Date(now).getTime()-new Date(createdAt||0).getTime(); if(!Number.isFinite(age)||age<0)return "invalid"; return age<=Math.max(1000,Number(maxAgeMs)||DEFAULT_RPO_MS)?"fresh":"stale"; }
function monotonicBackupTimes(rows=[]){ const ts=(Array.isArray(rows)?rows:[]).map(r=>new Date(r?.createdAt||0).getTime()); return ts.every(Number.isFinite)&&ts.every((v,i)=>i===0||v>=ts[i-1]); }
function restoreTargetIsolation(target,liveDb){ return Boolean(target&&liveDb&&pathKey(target)!==pathKey(liveDb)); }
function readonlyContract(options={}){ return options.readonly===true&&options.writable!==true; }
function integrityContract(result){ return String(result||"")==="ok"; }
function foreignKeyContract(violations=0){ return Number(violations)===0; }
function requiredTablesContract(actual=[]){ const set=new Set(actual); return REQUIRED_TABLES.every(t=>set.has(t)); }
function schemaFingerprintContract(expected,actual){ return /^[a-f0-9]{64}$/.test(String(expected||""))&&String(expected)===String(actual||""); }
function rowCountContract(expected={},actual={}){ const keys=new Set([...Object.keys(expected),...Object.keys(actual)]); return [...keys].every(k=>Number(expected[k])===Number(actual[k])); }
function restoreSmokeContract(steps=[]){ return Array.isArray(steps)&&steps.length>=3&&steps.every(s=>s&&s.ok===true); }
function corruptionDetected(original,observed){ return Boolean(original&&observed&&String(original)!==String(observed)); }
function manifestImmutable(before,after){ return JSON.stringify(before)===JSON.stringify(after); }
function backupLockContract(owner,lock){ return Boolean(owner&&lock&&String(owner)===String(lock.owner)&&Number(lock.expiresAt)>Date.now()); }
function concurrencyContract(activeJobs,limit=1){ return Number(activeJobs)>=0&&Number(activeJobs)<=Math.max(1,Number(limit)||1); }
function capacityContract(freeBytes,requiredBytes){ return Number(freeBytes)>=Number(requiredBytes)&&Number(requiredBytes)>0; }
function rpoContract(ageMs,maxMs=DEFAULT_RPO_MS){ return Number(ageMs)>=0&&Number(ageMs)<=Math.max(1000,Number(maxMs)||DEFAULT_RPO_MS); }
function rtoContract(durationMs,maxMs=DEFAULT_RTO_MS){ return Number(durationMs)>=0&&Number(durationMs)<=Math.max(1000,Number(maxMs)||DEFAULT_RTO_MS); }
function readinessContract(v={}){ return [v.backupVerified,v.integrityOk,v.foreignKeysOk,v.schemaMatch,v.capacityOk].every(Boolean); }
function drillContract(v={}){ return v.executed===true&&v.restored===true&&v.verified===true&&v.cleaned===true; }
function failClosedContract(v={}){ return v.verified===true ? true : v.startupAllowed===false; }
function certification(results=[]){ const r=Array.isArray(results)?results:[]; return {version:"5.73.0",batch:"B114",milestones:25,total:r.length,passed:r.filter(Boolean).length,complete:r.length===25&&r.every(Boolean)}; }
module.exports={MILESTONES,MAX_BACKUP_BYTES,DEFAULT_RPO_MS,DEFAULT_RTO_MS,REQUIRED_TABLES,sha256,manifestSchema,backupSourceDestinationIsolation,checksumContract,sizeWithinLimit,freshness,monotonicBackupTimes,restoreTargetIsolation,readonlyContract,integrityContract,foreignKeyContract,requiredTablesContract,schemaFingerprintContract,rowCountContract,restoreSmokeContract,corruptionDetected,manifestImmutable,backupLockContract,concurrencyContract,capacityContract,rpoContract,rtoContract,readinessContract,drillContract,failClosedContract,certification};
