"use strict";
function queue(rows=[]){return (Array.isArray(rows)?rows:[]).map(r=>({id:String(r.id||''),orderId:String(r.orderId||''),kind:String(r.kind||'other'),reviewStatus:String(r.reviewStatus||'pending'),createdAt:r.createdAt||null}));}
function escalation(rows=[]){const out={none:0,watch:0,urgent:0};for(const r of Array.isArray(rows)?rows:[]){const s=String(r.escalation||'none');if(Object.hasOwn(out,s))out[s]++;else out.none++;}return out;}
function resolutionHistory(rows=[]){return (Array.isArray(rows)?rows:[]).map(r=>({orderId:String(r.orderId||''),status:String(r.status||'unknown'),updatedAt:r.updatedAt||null,reviewStatus:String(r.reviewStatus||'pending')}));}
module.exports={queue,escalation,resolutionHistory};
