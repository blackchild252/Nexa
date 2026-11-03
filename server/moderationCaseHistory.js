"use strict";
function caseHistory(reports=[],appeals=[]){return {reports:(Array.isArray(reports)?reports:[]).map(r=>({id:String(r.id||''),status:String(r.status||'unknown'),reason:r.reason||null,createdAt:r.createdAt||null,updatedAt:r.updatedAt||null})),appeals:(Array.isArray(appeals)?appeals:[]).map(a=>({id:String(a.id||''),reportId:String(a.reportId||''),status:String(a.status||'unknown'),createdAt:a.createdAt||null,updatedAt:a.updatedAt||null}))};}
function roomAudit(rooms=[]){return (Array.isArray(rooms)?rooms:[]).map(r=>({id:String(r.id||''),name:String(r.name||''),discoverable:Boolean(r.discoverable),updatedAt:r.updatedAt||null}));}
module.exports={caseHistory,roomAudit};
