const crypto = require('node:crypto');
const MILESTONES = [[1050,'request-correlation-contract'],[1051,'diagnostic-event-schema-contract'],[1052,'diagnostic-event-size-contract'],[1053,'diagnostic-secret-redaction-contract'],[1054,'diagnostic-user-pii-redaction-contract'],[1055,'error-code-normalization-contract'],[1056,'error-classification-contract'],[1057,'http-failure-sampling-contract'],[1058,'dependency-health-contract'],[1059,'dependency-latency-contract'],[1060,'database-health-contract'],[1061,'queue-health-contract'],[1062,'provider-health-contract'],[1063,'auth-security-event-contract'],[1064,'audit-event-lineage-contract'],[1065,'incident-window-contract'],[1066,'diagnostic-retention-contract'],[1067,'health-response-size-contract'],[1068,'health-no-secret-contract'],[1069,'metrics-label-contract'],[1070,'diagnostic-rate-limit-contract'],[1071,'failure-burst-contract'],[1072,'startup-diagnostic-contract'],[1073,'operational-summary-contract'],[1074,'cumulative-observability-certification']];
const MAX_EVENT_BYTES=16384, SECRET_RE=/(authorization|cookie|set-cookie|password|passwd|token|secret|api[-_]?key|private[-_]?key|client[-_]?secret|refresh[-_]?token|access[-_]?token)/i, PII_RE=/(email|phone|mobile|address|dob|dateOfBirth|ssn|nin|bvn|accountNumber)/i;
const sha256=v=>crypto.createHash('sha256').update(String(v),'utf8').digest('hex');
function correlationId(value){const v=String(value||'').trim();return{ok:/^[A-Za-z0-9._:-]{8,128}$/.test(v),value:v};}
function diagnosticEvent(e={}){return{ok:String(e.type||'').trim().length>=2&&String(e.type||'').length<=100&&Number.isFinite(Number(e.ts))&&correlationId(e.requestId).ok};}
function eventSize(e,max=MAX_EVENT_BYTES){const bytes=Buffer.byteLength(JSON.stringify(e||{}),'utf8');return{ok:bytes<=max,bytes,max};}
function redactObject(v,d=0){if(d>8)return'[REDACTED_DEPTH]';if(Array.isArray(v))return v.map(x=>redactObject(x,d+1));if(v&&typeof v==='object'){const o={};for(const[k,x]of Object.entries(v))o[k]=SECRET_RE.test(k)?'[REDACTED]':PII_RE.test(k)?'[REDACTED_PII]':redactObject(x,d+1);return o;}return v;}
function secretRedaction(e){const r=redactObject(e);return{ok:!JSON.stringify(r).match(/sk-[A-Za-z0-9]{12,}|Bearer\s+[A-Za-z0-9._-]{12,}/),event:r};}
function piiRedaction(e){const r=redactObject(e);return{ok:!Object.keys(e||{}).some(k=>PII_RE.test(k)&&r[k]===e[k]),event:r};}
function errorCode(c){const v=String(c||'').trim().toUpperCase();return{ok:/^[A-Z][A-Z0-9_]{2,80}$/.test(v),value:v};}
function errorClass(status){const n=Number(status);return{ok:Number.isInteger(n)&&n>=100&&n<=599,class:n>=500?'server':n>=400?'client':n>=300?'redirect':n>=200?'success':'informational'};}
function failureSampling(rate){const n=Number(rate);return{ok:Number.isFinite(n)&&n>=0&&n<=1,value:n};}
function dependencyHealth(name,status){return{ok:/^[a-z][a-z0-9._-]{1,80}$/i.test(String(name||''))&&['up','degraded','down','unknown'].includes(String(status||'')),name:String(name||''),status:String(status||'')};}
function dependencyLatency(ms){const n=Number(ms);return{ok:Number.isFinite(n)&&n>=0&&n<=120000,value:n};}
function databaseHealth({integrity,ready,latencyMs}){return{ok:integrity===true&&ready===true&&dependencyLatency(latencyMs).ok};}
function queueHealth({pending,failed,oldestAgeMs}){return{ok:Number.isInteger(pending)&&pending>=0&&Number.isInteger(failed)&&failed>=0&&Number.isFinite(oldestAgeMs)&&oldestAgeMs>=0};}
function providerHealth(name,state){return dependencyHealth(name,state);}
function authSecurityEvent({actorId,eventType,requestId}){return{ok:typeof actorId==='string'&&actorId.length>=1&&errorCode(eventType).ok&&correlationId(requestId).ok};}
function auditLineage({actor,action,target,requestId}){return{ok:[actor,action,target].every(v=>typeof v==='string'&&v.length>=1&&v.length<=160)&&correlationId(requestId).ok};}
function incidentWindow(start,end,now=Date.now()){const s=Number(start),e=Number(end),n=Number(now);return{ok:Number.isFinite(s)&&Number.isFinite(e)&&e>=s&&s<=n&&e-s<=86400000};}
function retentionDays(days){const n=Number(days);return{ok:Number.isInteger(n)&&n>=1&&n<=3650,value:n};}
function healthResponseSize(p,max=8192){const bytes=Buffer.byteLength(JSON.stringify(p||{}),'utf8');return{ok:bytes<=max,bytes,max};}
function healthNoSecrets(p){return{ok:!SECRET_RE.test(JSON.stringify(p||{})),payload:p};}
function metricLabel(l){const v=String(l||'');return{ok:/^[a-z][a-z0-9_]{0,63}$/.test(v)&&!SECRET_RE.test(v)&&!PII_RE.test(v),value:v};}
function diagnosticRateLimit({count,windowMs,max}){return{ok:Number.isInteger(count)&&count>=0&&Number.isInteger(windowMs)&&windowMs>=1000&&Number.isInteger(max)&&max>0&&count<=max};}
function failureBurst({failures,windowMs,threshold}){return{ok:Number.isInteger(failures)&&failures>=0&&Number.isInteger(windowMs)&&windowMs>=1000&&Number.isInteger(threshold)&&threshold>0,burst:Number(failures)>=Number(threshold)};}
function startupDiagnostic({version,batch,releaseAudit,schemaReady,production}){return{ok:/^\d+\.\d+\.\d+$/.test(String(version||''))&&/^B\d+$/.test(String(batch||''))&&releaseAudit===true&&schemaReady===true&&(production===false||production===true)};}
function operationalSummary({dependencies,queue,database,incidentCount}){return{ok:Array.isArray(dependencies)&&queue&&database&&Number.isInteger(incidentCount)&&incidentCount>=0};}
function cumulativeCertification(results){return{ok:Array.isArray(results)&&results.length===MILESTONES.length&&results.every(Boolean),count:Array.isArray(results)?results.length:0};}
module.exports={MILESTONES,MAX_EVENT_BYTES,sha256,correlationId,diagnosticEvent,eventSize,redactObject,secretRedaction,piiRedaction,errorCode,errorClass,failureSampling,dependencyHealth,dependencyLatency,databaseHealth,queueHealth,providerHealth,authSecurityEvent,auditLineage,incidentWindow,retentionDays,healthResponseSize,healthNoSecrets,metricLabel,diagnosticRateLimit,failureBurst,startupDiagnostic,operationalSummary,cumulativeCertification};
