"use strict";
const ORDER_STATUSES=Object.freeze(["placed","confirmed","shipped","delivered","cancelled"]);
function normalizeStatus(s){const v=String(s||"");return ORDER_STATUSES.includes(v)?v:"unknown";}
function fulfillmentSummary(rows=[]){
 const counts=Object.fromEntries(ORDER_STATUSES.map(s=>[s,0])); let units=0; let value=0;
 for(const r of rows){const s=normalizeStatus(r.status); if(Object.hasOwn(counts,s)) counts[s]++; units+=Math.max(0,Number(r.quantity)||0); value+=Math.max(0,Number(r.lineTotal ?? (Number(r.price)||0)*(Number(r.quantity)||0))||0);}
 return {counts,units,value:Number(value.toFixed(2)),attention:counts.placed+counts.confirmed+counts.shipped};
}
function settlementSummary(rows=[]){const out={verified:0,pending:0,failed:0}; for(const r of rows){if(Number(r.providerVerified))out.verified++;else if(String(r.status)==="cancelled")out.failed++;else out.pending++;} return out;}
function returnSummary(rows=[]){const out={requested:0,processing:0,processed:0,failed:0}; for(const r of rows){const s=String(r.status||""); if(s==="pending"||s==="processing"||s==="processed"||s==="failed"){out[s]++;out.requested++;}} return out;}
module.exports={ORDER_STATUSES,normalizeStatus,fulfillmentSummary,settlementSummary,returnSummary};
