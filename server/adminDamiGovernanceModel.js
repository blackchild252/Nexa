"use strict";
const MAX_TEXT = 100000, MAX_CHUNKS = 100, MAX_RESULTS = 8, MAX_EVENTS = 80;
const clean = (value, max = 160) => String(value ?? "").trim().slice(0, max);
const transitions = { draft:["awaiting_approval","cancelled"], awaiting_approval:["draft","approved","cancelled"], approved:["active","cancelled"], active:["completed","failed","cancelled"], failed:["active","cancelled","archived"], completed:["archived"], cancelled:[], archived:[] };
function ingestAdminDocument(input = {}, actor = {}) {
  if (!actor.adminOperationsRead) return { ok:false, error:"PERMISSION_DENIED" };
  const text = typeof input.text === "string" ? input.text.trim() : "", title = clean(input.title);
  if (!title || !text) return { ok:false, error:"TITLE_AND_TEXT_REQUIRED" };
  if (! ["text/plain","text/markdown","application/json"].includes(input.type)) return { ok:false, error:"UNSUPPORTED_TYPE" };
  if (text.length > MAX_TEXT) return { ok:false, error:"DOCUMENT_TOO_LARGE" };
  const chunks=[]; for(let i=0;i<text.length;i+=1000) chunks.push(text.slice(i,i+1000));
  if(chunks.length>MAX_CHUNKS) return {ok:false,error:"CHUNK_LIMIT"};
  return {ok:true,document:{id:clean(input.id,100),scope:"admin-operations",ownerId:clean(actor.adminId,100),title,type:input.type,chunks,status:"active",trust:"untrusted-content",deletedAt:null}};
}
function indexAdminDocuments(docs=[]) {
  const seen=new Set(), out=[];
  for(const d of Array.isArray(docs)?docs:[]) {
    if(d?.scope!=="admin-operations"||d.status!=="active"||d.deletedAt) continue;
    (d.chunks||[]).slice(0,MAX_CHUNKS).forEach((chunk,i)=>{const text=clean(chunk,1000),key=`${d.id}:${i}:${text}`;if(!text||seen.has(key))return;seen.add(key);out.push({id:d.id,ownerId:d.ownerId,title:clean(d.title),chunkIndex:i,text,scope:d.scope,trust:"untrusted-content"});});
  }
  return out;
}
function retrieveAdminKnowledge(query, entries=[], actor={}, limit=MAX_RESULTS) {
  if(!actor.adminOperationsRead) return {ok:false,error:"PERMISSION_DENIED",results:[]};
  const terms=clean(query,200).toLowerCase().split(/\s+/).filter(Boolean);
  if(!terms.length) return {ok:false,error:"QUERY_REQUIRED",results:[]};
  return {ok:true,results:entries.filter(e=>e.scope==="admin-operations"&&e.ownerId===actor.adminId).map(e=>({...e,score:terms.filter(t=>e.text.toLowerCase().includes(t)).length})).filter(e=>e.score).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)||a.chunkIndex-b.chunkIndex).slice(0,Math.max(1,Math.min(MAX_RESULTS,Number(limit)||MAX_RESULTS))).map(e=>({text:e.text,citation:{documentId:e.id,chunkIndex:e.chunkIndex},provenance:{scope:e.scope,trust:e.trust}}))};
}
function deleteAdminDocument(doc,actor={},at=new Date().toISOString()) {
  if(!actor.adminOperationsWrite||!doc||doc.ownerId!==actor.adminId||doc.scope!=="admin-operations") return {ok:false,error:"PERMISSION_DENIED"};
  if(doc.deletedAt) return {ok:true,replayed:true,document:doc};
  return {ok:true,document:{...doc,status:"deleted",deletedAt:at,chunks:[]},event:{type:"knowledge.deleted",documentId:doc.id,actorId:actor.adminId,at}};
}
function workflowDraft(input={},actor={}) {
  if(!actor.adminOperationsWrite) return {ok:false,error:"PERMISSION_DENIED"};
  const title=clean(input.title),steps=Array.isArray(input.steps)?input.steps.slice(0,15):[];
  if(!title||!steps.length||steps.length!==(input.steps||[]).length||steps.some(step=>!clean(step?.title,300))) return {ok:false,error:"INVALID_DRAFT"};
  return {ok:true,workflow:{id:clean(input.id,100),ownerId:actor.adminId,title,status:"draft",version:1,steps:steps.map((s,i)=>({id:clean(s.id||`step-${i+1}`,100),title:clean(s.title),recommendationOnly:true})),events:[]}};
}
function transitionAdminWorkflow(workflow,to,actor={},reason="") {
  if(!workflow||workflow.ownerId!==actor.adminId||!actor.adminOperationsWrite) return {ok:false,error:"PERMISSION_DENIED"};
  if(!transitions[workflow.status]?.includes(to)) return {ok:false,error:"INVALID_TRANSITION"};
  if(to==="approved"&&!actor.canApprove) return {ok:false,error:"APPROVAL_REQUIRED"};
  const event={type:`workflow.${to}`,actorId:actor.adminId,workflowId:workflow.id,from:workflow.status,to,reason:clean(reason,200),version:workflow.version+1,at:actor.now||new Date().toISOString()};
  return {ok:true,workflow:{...workflow,status:to,version:workflow.version+1,events:[...(workflow.events||[]),event].slice(-MAX_EVENTS)},event};
}
function receipt(input={},actor={}) {
  if(!actor.adminId||input.adminId!==actor.adminId) return {ok:false,error:"PERMISSION_DENIED"};
  const key=clean(input.idempotencyKey,100);if(!key||!input.workflowId)return{ok:false,error:"INVALID_RECEIPT"};
  const prior=(input.existing||[]).find(r=>r.adminId===actor.adminId&&r.idempotencyKey===key);
  if(prior)return prior.workflowId===input.workflowId?{ok:true,replayed:true,receipt:prior}:{ok:false,error:"IDEMPOTENCY_CONFLICT"};
  return {ok:true,replayed:false,receipt:{adminId:actor.adminId,idempotencyKey:key,workflowId:input.workflowId,outcome:"recommendation-recorded-not-executed",at:input.at||new Date().toISOString()}};
}
function buildAdminContext({message="",knowledge=[],connectedApps=[],events=[]}={},actor={}) {
  return {scope:"admin-operations",currentMessage:clean(message,3000),instructionPriority:"current-request-and-policy-first",knowledge:knowledge.filter(k=>k.scope==="admin-operations"&&k.ownerId===actor.adminId).slice(0,MAX_RESULTS).map(k=>({text:clean(k.text,700),citation:k.citation,trust:"untrusted-content"})),connectedApps:connectedApps.filter(a=>a.adminId===actor.adminId&&a.authorized===true).slice(0,8).map(a=>({name:clean(a.name,80),context:clean(a.context,300)})),events:events.filter(e=>e.adminId===actor.adminId).slice(-MAX_EVENTS).map(e=>({type:clean(e.type,60),at:e.at||null})),consumerKnowledgeAccess:false,externalActionExecution:false};
}
module.exports={MAX_TEXT,MAX_CHUNKS,MAX_RESULTS,ingestAdminDocument,indexAdminDocuments,retrieveAdminKnowledge,deleteAdminDocument,workflowDraft,transitionAdminWorkflow,receipt,buildAdminContext};
