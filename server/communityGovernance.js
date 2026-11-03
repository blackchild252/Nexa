"use strict";
const APPEAL_STATUSES=Object.freeze(["open","under_review","resolved","dismissed"]);
function appealSummary(rows=[]){const counts=Object.fromEntries(APPEAL_STATUSES.map(s=>[s,0]));for(const r of rows){const s=APPEAL_STATUSES.includes(String(r.status))?String(r.status):"dismissed";counts[s]++;}return {counts,active:counts.open+counts.under_review};}
function roomGovernance(rows=[]){return {total:rows.length,discoverable:rows.filter(r=>Number(r.discoverable)===1).length,private:rows.filter(r=>Number(r.discoverable)!==1).length};}
module.exports={APPEAL_STATUSES,appealSummary,roomGovernance};
