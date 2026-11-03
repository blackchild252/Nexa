"use strict";
const RETURN_STATUSES=Object.freeze(["requested","approved","received","refunded","rejected"]);
function summarize(rows=[]){const counts=Object.fromEntries(RETURN_STATUSES.map(s=>[s,0]));for(const r of rows){const raw=String(r.status||""); const s=raw==="pending"?"requested":raw==="processing"?"approved":raw==="processed"?"refunded":raw==="failed"?"rejected":(RETURN_STATUSES.includes(raw)?raw:"requested");counts[s]++;}return {counts,active:counts.requested+counts.approved+counts.received,exceptions:counts.rejected};}
function exceptions(rows=[]){return rows.filter(r=>["cancelled","failed","disputed"].includes(String(r.status))).map(r=>({orderId:String(r.orderId||""),status:String(r.status)}));}
module.exports={RETURN_STATUSES,summarize,exceptions};
