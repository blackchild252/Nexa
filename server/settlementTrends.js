"use strict";
function exceptionHistory(rows=[]){return (Array.isArray(rows)?rows:[]).map(r=>({id:String(r.id||''),reference:r.providerReference||null,status:String(r.status||'unknown'),mappedStatus:String(r.mappedStatus||'unknown'),safeToApply:Boolean(r.safeToApply),createdAt:r.createdAt||null}));}
function trend(rows=[]){const out={reconciled:0,review:0,mismatch:0,internal:0};for(const r of Array.isArray(rows)?rows:[]){if(!r.applicable)out.internal++;else if(r.safeToApply&&r.mappedStatus==='completed')out.reconciled++;else if(r.safeToApply)out.review++;else out.mismatch++;}return out;}
module.exports={exceptionHistory,trend};
