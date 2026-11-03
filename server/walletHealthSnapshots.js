"use strict";
function snapshot(rows=[]){const out={total:0,completed:0,pending:0,failed:0,reversed:0,mismatch:0};for(const r of Array.isArray(rows)?rows:[]){out.total++;const s=String(r.mappedStatus||'pending');if(Object.hasOwn(out,s))out[s]++;if(r.safeToApply===false)out.mismatch++;}return out;}
function aging(rows=[],now=Date.now()){const buckets={under24h:0,'24_72h':0,'3_7d':0,over_7d:0};for(const r of Array.isArray(rows)?rows:[]){const age=Math.max(0,now-(Date.parse(r.createdAt||now)||now));const h=age/3600000;if(h<24)buckets.under24h++;else if(h<72)buckets['24_72h']++;else if(h<168)buckets['3_7d']++;else buckets.over_7d++;}return buckets;}
module.exports={snapshot,aging};
