"use strict";
function summarize(rows=[]){const out={total:0,reconciled:0,review:0,mismatch:0,internal:0};for(const r of Array.isArray(rows)?rows:[]){out.total++;if(!r.applicable)out.internal++;else if(r.safeToApply&&r.mappedStatus==='completed')out.reconciled++;else if(r.safeToApply)out.review++;else out.mismatch++;}return out;}
function providerHealth(rows=[]){const out={completed:0,pending:0,failed:0,reversed:0};for(const r of Array.isArray(rows)?rows:[]){const s=String(r.mappedStatus||'pending');if(Object.hasOwn(out,s))out[s]++;else out.pending++;}return out;}
module.exports={summarize,providerHealth};
