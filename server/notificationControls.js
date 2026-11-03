"use strict";
const FREQUENCIES=Object.freeze(["off","daily","weekly"]);
function normalizeDigest(input={}){const frequency=FREQUENCIES.includes(String(input.digestFrequency))?String(input.digestFrequency):"off";return {enabled:Boolean(input.digestEnabled)&&frequency!=="off",frequency,quietStart:String(input.quietStart||"").match(/^([01]\d|2[0-3]):[0-5]\d$/)?.[0]||null,quietEnd:String(input.quietEnd||"").match(/^([01]\d|2[0-3]):[0-5]\d$/)?.[0]||null};}
function recoverySummary(rows=[]){const counts={pending:0,retry:0,sending:0,delivered:0,failed:0,dead:0};for(const r of rows){if(Object.hasOwn(counts,String(r.status)))counts[String(r.status)]++;}return {counts,recoverable:counts.retry+counts.pending,terminal:counts.failed+counts.dead};}
module.exports={FREQUENCIES,normalizeDigest,recoverySummary};
