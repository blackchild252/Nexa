"use strict";
const ACTIONS=new Set(["request_return_review","request_fulfillment_review","attach_return_evidence"]);
function allowedAction(action){return ACTIONS.has(String(action));}
function nextState(action,current){const a=String(action);if(a==='request_return_review')return {state:'return_review_requested',requiresCanonicalResolution:true};if(a==='request_fulfillment_review')return {state:'fulfillment_review_requested',requiresCanonicalResolution:true};if(a==='attach_return_evidence')return {state:String(current||'evidence_attached'),requiresCanonicalResolution:true};return null;}
function slaHistory(rows=[]){return (Array.isArray(rows)?rows:[]).map(r=>({orderId:String(r.orderId||r.id||''),status:String(r.status||r.orderStatus||'unknown'),createdAt:r.createdAt||null,updatedAt:r.updatedAt||null,breached:Boolean(r.breached)}));}
module.exports={ACTIONS,allowedAction,nextState,slaHistory};
