"use strict";
const crypto = require("node:crypto");
const MAX_CURSOR = 512;
const MAX_IDEMPOTENCY = 128;
const MAX_FILTERS = 20;
const MAX_FIELDS = 40;
const MAX_SORT_KEYS = 5;
const MAX_WEBHOOK_BYTES = 256 * 1024;
const MAX_EVENT_TYPE = 100;
const MAX_EVENT_AGE_MS = 10 * 60 * 1000;
const DEPRECATION_STATUSES = new Set(["active", "deprecated", "retired"]);
const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
function boundedString(v,max){const s=String(v??"").trim(); return s && s.length<=max?s:null;}
function method(v){const s=String(v||"").toUpperCase(); return HTTP_METHODS.has(s)?s:null;}
function idempotencyKey(v){return /^[A-Za-z0-9._:-]{8,128}$/.test(String(v||""))?String(v):null;}
function cursor(v){const s=String(v||""); return !s || (s.length<=MAX_CURSOR && /^[A-Za-z0-9._~=-]+$/.test(s))?s:null;}
function paginationLimit(v, fallback=50){const n=Number(v); return Number.isInteger(n)&&n>=1&&n<=100?n:fallback;}
function sortKeys(v){const a=Array.isArray(v)?v:(String(v||"").split(",").map(x=>x.trim()).filter(Boolean)); return a.length<=MAX_SORT_KEYS&&a.every(x=>/^[A-Za-z][A-Za-z0-9_]*(:(asc|desc))?$/.test(x))?a:null;}
function filterBudget(v){const n=Number(v); return Number.isInteger(n)&&n>=0&&n<=MAX_FILTERS?n:null;}
function fieldSelection(v){const a=Array.isArray(v)?v:(String(v||"").split(",").map(x=>x.trim()).filter(Boolean)); return a.length<=MAX_FIELDS&&a.every(x=>/^[A-Za-z][A-Za-z0-9_.]*$/.test(x))?a:null;}
function acceptHeader(v){if(!v)return true; return String(v).split(",").every(x=>/^[^;\s]+\/[^;\s]+(?:\s*;.*)?$/.test(x.trim()));}
function contentType(v, allowed=["application/json"]){if(!v)return false; const base=String(v).split(";",1)[0].trim().toLowerCase(); return allowed.includes(base);}
function responseEnvelope(body){return body&&typeof body==="object"&&!Array.isArray(body)&&Object.prototype.hasOwnProperty.call(body,"data")?body:null;}
function errorCode(v){return /^[A-Z][A-Z0-9_]{2,63}$/.test(String(v||""))?String(v):null;}
function deprecationStatus(v){const s=String(v||""); return DEPRECATION_STATUSES.has(s)?s:null;}
function sunsetDate(v){const d=new Date(String(v||"")); return Number.isNaN(d.getTime())?null:d.toISOString();}
function webhookEventType(v){return /^[A-Za-z0-9._:-]{1,100}$/.test(String(v||""))?String(v):null;}
function webhookBodySize(v){const n=Buffer.byteLength(Buffer.isBuffer(v)?v:String(v??""),"utf8"); return n<=MAX_WEBHOOK_BYTES?n:null;}
function webhookFreshness(occurredAt,now=Date.now(),maxAgeMs=MAX_EVENT_AGE_MS){const t=new Date(occurredAt).getTime(); if(!Number.isFinite(t))return false; return Math.abs(now-t)<=maxAgeMs;}
function auditActor(v){return /^[A-Za-z0-9_-]{1,100}$/.test(String(v||""))?String(v):null;}
function auditAction(v){return /^[a-z][a-z0-9_.:-]{1,100}$/.test(String(v||""))?String(v):null;}
function auditTarget(v){return /^[A-Za-z0-9_:-]{1,160}$/.test(String(v||""))?String(v):null;}
function configFingerprint(config){const safe={}; for(const [k,v] of Object.entries(config||{})){if(/key|secret|token|password|credential/i.test(k))continue; safe[k]=String(v??"");} return crypto.createHash("sha256").update(JSON.stringify(Object.keys(safe).sort().reduce((o,k)=>(o[k]=safe[k],o),{}))).digest("hex");}
function contractHash(manifest){return crypto.createHash("sha256").update(JSON.stringify(manifest||{})).digest("hex");}
function releaseCompatibility(current, minimum){const c=String(current||"").split(".").map(Number),m=String(minimum||"").split(".").map(Number); if(c.length!==3||m.length!==3||[...c,...m].some(Number.isNaN))return false; return c[0]>m[0]||(c[0]===m[0]&&(c[1]>m[1]||(c[1]===m[1]&&c[2]>=m[2])));}
function apiVersion(v,supported=["1.0"]){const s=String(v||"").trim(); return supported.includes(s)?s:null;}
function requestTarget(v,max=8192){return String(v||"").length<=max;}
function queryBudget(v,max=40){return Number(v)<=max;}
function idempotencyScope(userId,key){const u=boundedString(userId,100),k=idempotencyKey(key); return u&&k?`${u}:${k}`:null;}
function auditLineage({requestId,actorId,action,target}={}){const r=boundedString(requestId,100),a=auditActor(actorId),ac=auditAction(action),t=auditTarget(target); return r&&a&&ac&&t?{requestId:r,actorId:a,action:ac,target:t}:null;}
module.exports={MAX_CURSOR,MAX_IDEMPOTENCY,MAX_FILTERS,MAX_FIELDS,MAX_SORT_KEYS,MAX_WEBHOOK_BYTES,method,idempotencyKey,cursor,paginationLimit,sortKeys,filterBudget,fieldSelection,acceptHeader,contentType,responseEnvelope,errorCode,deprecationStatus,sunsetDate,webhookEventType,webhookBodySize,webhookFreshness,auditActor,auditAction,auditTarget,configFingerprint,contractHash,releaseCompatibility,apiVersion,requestTarget,queryBudget,idempotencyScope,auditLineage};
