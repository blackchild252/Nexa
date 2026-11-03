"use strict";
const crypto = require("crypto");
const db = require("./db");
const now = () => new Date().toISOString();
const id = (p) => `${p}_${crypto.randomUUID()}`;
const text = (v, max=5000) => String(v ?? "").trim().slice(0,max);
const { validateSteps, transitionWorkflowStatus, validateActionConfirmations } = require("./aiHubValidation");
const damiExecutionReceipts = require("./damiExecutionReceipts");
const { boundedIdempotencyKey, idempotencyReplayWindow } = require("./criticalControls");
const knowledgeHub = require("./damiKnowledgeHub");
function auditDamiEvent(userId,eventType,resourceType,resourceId,metadata={}) {
  db.prepare("INSERT INTO ai_dami_audit_events(id,userId,eventType,resourceType,resourceId,metadata,createdAt) VALUES(?,?,?,?,?,?,?)")
    .run(id("audit"),userId,eventType,resourceType,resourceId,JSON.stringify(metadata||{}),now());
}
function auditKnowledgeEvent(userId,eventType,resourceId,metadata={}) {
  auditDamiEvent(userId,eventType,"knowledge",resourceId,metadata);
}
function mount(app, auth) {
  // Workflows are user-owned and execution is explicit; only safe local actions are allowed.
  app.get("/api/ai/workflows", auth.authMiddleware, (req,res)=>res.json({workflows:db.prepare("SELECT id,title,steps,status,createdAt,updatedAt FROM ai_workflows WHERE userId=? ORDER BY updatedAt DESC LIMIT 100").all(req.user.id).map(x=>({...x,steps:JSON.parse(x.steps)}))}));
  app.post("/api/ai/workflows", auth.authMiddleware, (req,res)=>{
    const title=text(req.body?.title,120), checked=validateSteps(req.body?.steps);
    if(!title||checked.error) return res.status(400).json({error:checked.error||"Workflow title is required."});
    const wid=id("wf"), ts=now(); db.prepare("INSERT INTO ai_workflows(id,userId,title,steps,status,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?)").run(wid,req.user.id,title,JSON.stringify(checked.value),"draft",ts,ts);
    auditDamiEvent(req.user.id,"workflow.created","workflow",wid,{stepCount:checked.value.length,status:"draft"});
    res.status(201).json({workflow:{id:wid,title,steps:checked.value,status:"draft",createdAt:ts,updatedAt:ts}});
  });
  app.patch("/api/ai/workflows/:id", auth.authMiddleware, (req,res)=>{
    const w=db.prepare("SELECT * FROM ai_workflows WHERE id=? AND userId=?").get(req.params.id,req.user.id);
    if(!w) return res.status(404).json({error:"Workflow not found."});
    const title=req.body?.title===undefined?w.title:text(req.body.title,120);
    const checked=req.body?.steps===undefined?{value:JSON.parse(w.steps)}:validateSteps(req.body.steps);
    if(!title||checked.error) return res.status(400).json({error:checked.error||"Workflow title is required."});
    const status=req.body?.status===undefined?w.status:text(req.body.status,20);
    if(!["draft","awaiting_approval","approved","active","archived","cancelled"].includes(status)) return res.status(400).json({error:"Invalid workflow status."});
    const changedDefinition=title!==w.title||JSON.stringify(checked.value)!==w.steps;
    const lifecycle=transitionWorkflowStatus(w.status,status,changedDefinition);
    if(!lifecycle.ok) {
      auditDamiEvent(req.user.id,"workflow.update_denied","workflow",w.id,{fromStatus:w.status,toStatus:status,definitionChanged:changedDefinition,reason:lifecycle.error});
      return res.status(409).json({error:lifecycle.error});
    }
    const ts=now(); const changed=db.prepare("UPDATE ai_workflows SET title=?,steps=?,status=?,updatedAt=? WHERE id=? AND userId=? AND status=?").run(title,JSON.stringify(checked.value),status,ts,req.params.id,req.user.id,w.status);
    if(!changed.changes) return res.status(409).json({error:"Workflow changed concurrently; reload and retry."});
    auditDamiEvent(req.user.id,"workflow.updated","workflow",w.id,{fromStatus:w.status,toStatus:status,definitionChanged:changedDefinition,stepCount:checked.value.length});
    res.json({workflow:{id:w.id,title,steps:checked.value,status,createdAt:w.createdAt,updatedAt:ts}});
  });
  app.delete("/api/ai/workflows/:id", auth.authMiddleware, (req,res)=>{
    const tx=db.transaction(()=>{
      const w=db.prepare("SELECT id FROM ai_workflows WHERE id=? AND userId=?").get(req.params.id,req.user.id);
      if(!w) return false;
      db.prepare("DELETE FROM ai_workflow_runs WHERE workflowId=? AND userId=?").run(req.params.id,req.user.id);
      db.prepare("DELETE FROM ai_workflow_run_receipts WHERE workflowId=? AND userId=?").run(req.params.id,req.user.id);
      db.prepare("DELETE FROM ai_workflow_idempotency WHERE workflowId=? AND userId=?").run(req.params.id,req.user.id);
      db.prepare("DELETE FROM ai_workflows WHERE id=? AND userId=?").run(req.params.id,req.user.id);
      return true;
    });
    if(!tx()) return res.status(404).json({error:"Workflow not found."});
    auditDamiEvent(req.user.id,"workflow.deleted","workflow",req.params.id,{});
    res.json({ok:true});
  });
  app.get("/api/ai/workflows/:id/next", auth.authMiddleware, (req,res)=>{
    const w=db.prepare("SELECT * FROM ai_workflows WHERE id=? AND userId=?").get(req.params.id,req.user.id);
    if(!w) return res.status(404).json({error:"Workflow not found."});
    const steps=JSON.parse(w.steps||"[]");
    const completed=new Set(db.prepare("SELECT result FROM ai_workflow_runs WHERE workflowId=? AND userId=? ORDER BY createdAt DESC LIMIT 1").all(w.id,req.user.id).flatMap(r=>{try{return JSON.parse(r.result)?.completed||[]}catch(_){return []}}));
    const next=steps.findIndex((step,i)=>!completed.has(i)&&(Array.isArray(step.dependsOn)?step.dependsOn.every(d=>completed.has(d)):true));
    const step=next>=0?steps[next]:null;
    res.json({workflowId:w.id,status:w.status,approvalRequired:w.status==="draft"||w.status==="awaiting_approval",requiredActionConfirmations:steps.map((action,index)=>({stepIndex:index,type:action.type,title:action.title||action.content||"Workflow action",confirmed:false})),nextIndex:next,nextStep:step?{...step,requiresConfirmation:true}:null});
  });
  app.post("/api/ai/workflows/:id/run", auth.authMiddleware, (req,res)=>{
    const w=db.prepare("SELECT * FROM ai_workflows WHERE id=? AND userId=?").get(req.params.id,req.user.id);
    if(!w) return res.status(404).json({error:"Workflow not found."});
    if(w.status==="archived" || w.status==="cancelled") return res.status(409).json({error:"Archived or cancelled workflows cannot run."});
    if(w.status!=="approved" && w.status!=="active") { auditDamiEvent(req.user.id,"workflow.execution_denied","workflow",w.id,{reason:"approval_required",status:w.status}); return res.status(409).json({error:"Workflow approval is required before execution."}); }
    const confirmation=validateActionConfirmations(JSON.parse(w.steps||"[]"),req.body?.confirmed,req.body?.confirmedActions);
    if(!confirmation.ok) { auditDamiEvent(req.user.id,"workflow.execution_denied","workflow",w.id,{reason:confirmation.status===428?"action_confirmation_required":"confirmation_invalid",confirmedActionCount:Array.isArray(req.body?.confirmedActions)?req.body.confirmedActions.length:0}); return res.status(confirmation.status).json({error:confirmation.error}); }
    const key=boundedIdempotencyKey(req.headers["idempotency-key"] || req.body?.idempotencyKey);
    if(!key || key.length < 8) { auditDamiEvent(req.user.id,"workflow.execution_denied","workflow",w.id,{reason:"idempotency_key_invalid"}); return res.status(400).json({error:"A valid Idempotency-Key is required for workflow execution."}); }
    const existing=db.prepare("SELECT result FROM ai_workflow_idempotency WHERE workflowId=? AND userId=? AND idempotencyKey=?").get(w.id,req.user.id,key);
    if(existing) { const replay=idempotencyReplayWindow(existing.createdAt); if(!replay.valid) { auditDamiEvent(req.user.id,"workflow.execution_denied","workflow",w.id,{reason:"idempotency_key_expired"}); return res.status(409).json({error:"This Idempotency-Key has expired. Submit a new key."}); } auditDamiEvent(req.user.id,"workflow.execution_replayed","workflow",w.id,{keyFingerprint:require("node:crypto").createHash("sha256").update(key).digest("hex").slice(0,16)}); return res.json({ok:true,idempotent:true,...JSON.parse(existing.result)}); }
    const steps=JSON.parse(w.steps), results=[];
    const tx=db.transaction(()=>{
      const claimed=db.prepare("INSERT OR IGNORE INTO ai_workflow_idempotency(workflowId,userId,idempotencyKey,result,createdAt) VALUES(?,?,?,?,?)").run(w.id,req.user.id,key,"{}",now());
      if(!claimed.changes) { const row=db.prepare("SELECT result FROM ai_workflow_idempotency WHERE workflowId=? AND userId=? AND idempotencyKey=?").get(w.id,req.user.id,key); return JSON.parse(row.result); }
      for(const s of steps){
        if(s.type==="create_task") { const tid=id("task"); db.prepare("INSERT INTO ai_tasks(id,userId,title,dueAt,completed,createdAt) VALUES(?,?,?,?,0,?)").run(tid,req.user.id,s.title,s.dueAt,now()); results.push({type:s.type,id:tid}); }
        else { const nid=id("note"); db.prepare("INSERT INTO ai_notes(id,userId,content,createdAt) VALUES(?,?,?,?)").run(nid,req.user.id,s.content,now()); results.push({type:s.type,id:nid}); }
      }
      const payload=JSON.stringify({results,completed:steps.map((_,i)=>i),confirmedActions:confirmation.confirmedActions});
      db.prepare("UPDATE ai_workflow_idempotency SET result=? WHERE workflowId=? AND userId=? AND idempotencyKey=?").run(payload,w.id,req.user.id,key);
      const runId=id("run"), ts=now();
      db.prepare("INSERT INTO ai_workflow_runs(id,workflowId,userId,result,createdAt) VALUES(?,?,?,?,?)").run(runId,w.id,req.user.id,payload,ts);
      const dependencyState=JSON.stringify(damiExecutionReceipts.dependencyState(steps,steps.map((_,i)=>i)));
      db.prepare("INSERT INTO ai_workflow_run_receipts(id,runId,workflowId,userId,idempotencyKey,status,confirmed,confirmationRequired,result,dependencyState,createdAt,completedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").run(id("receipt"),runId,w.id,req.user.id,key,"completed",1,1,payload,dependencyState,ts,ts);
      return {results,runId,receipt:damiExecutionReceipts.receipt({id:"",runId,workflowId:w.id,idempotencyKey:key,status:"completed",confirmed:1,confirmationRequired:1,result:payload,dependencyState,createdAt:ts,completedAt:ts})};
    });
    const payload=tx();
    auditDamiEvent(req.user.id,"workflow.execution_completed","workflow",w.id,{runId:payload.runId,stepCount:steps.length,resultCount:Array.isArray(payload.results)?payload.results.length:0,confirmedActionCount:confirmation.confirmedActions.length});
    res.json({ok:true,...payload});
  });
  app.get("/api/ai/workflows/:id/runs",auth.authMiddleware,(req,res)=>{
    const workflow=db.prepare("SELECT id FROM ai_workflows WHERE id=? AND userId=?").get(req.params.id,req.user.id);
    if(!workflow) return res.status(404).json({error:"Workflow not found."});
    res.json({runs:db.prepare("SELECT id,result,createdAt FROM ai_workflow_runs WHERE workflowId=? AND userId=? ORDER BY createdAt DESC LIMIT 50").all(req.params.id,req.user.id).map(x=>({...x,result:JSON.parse(x.result)}))});
  });
  app.get("/api/ai/workflows/:id/audit",auth.authMiddleware,(req,res)=>{
    const workflow=db.prepare("SELECT id FROM ai_workflows WHERE id=? AND userId=?").get(req.params.id,req.user.id);
    if(!workflow) return res.status(404).json({error:"Workflow not found."});
    const events=db.prepare("SELECT eventType,resourceType,resourceId,metadata,createdAt FROM ai_dami_audit_events WHERE userId=? AND resourceType='workflow' AND resourceId=? ORDER BY createdAt DESC LIMIT 100").all(req.user.id,req.params.id).map((event)=>({...event,metadata:(()=>{try{return JSON.parse(event.metadata||"{}")}catch(_){return {}}})()}));
    res.json({workflowId:req.params.id,events});
  });

  // Personal tasks/calendar items; dates are ISO strings, and every query is owner-scoped.
  app.get("/api/ai/calendar",auth.authMiddleware,(req,res)=>res.json({events:db.prepare("SELECT * FROM ai_calendar_events WHERE userId=? AND startAt>=? AND startAt<=? ORDER BY startAt LIMIT 500").all(req.user.id,text(req.query.from,40)||"0000",text(req.query.to,40)||"9999")}));
  app.post("/api/ai/calendar",auth.authMiddleware,(req,res)=>{
    const title=text(req.body?.title,200), start=text(req.body?.startAt,40), end=text(req.body?.endAt,40), description=text(req.body?.description,2000);
    if(!title||!start||Number.isNaN(Date.parse(start))||(end&&(Number.isNaN(Date.parse(end))||Date.parse(end)<Date.parse(start)))) return res.status(400).json({error:"Provide a title and valid ISO start/end times."});
    const eid=id("evt"),ts=now(); db.prepare("INSERT INTO ai_calendar_events(id,userId,title,description,startAt,endAt,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?)").run(eid,req.user.id,title,description,start,end||null,ts,ts);
    res.status(201).json({event:db.prepare("SELECT * FROM ai_calendar_events WHERE id=?").get(eid)});
  });
  app.patch("/api/ai/calendar/:id",auth.authMiddleware,(req,res)=>{
    const old=db.prepare("SELECT * FROM ai_calendar_events WHERE id=? AND userId=?").get(req.params.id,req.user.id); if(!old)return res.status(404).json({error:"Event not found."});
    const title=req.body?.title===undefined?old.title:text(req.body.title,200), description=req.body?.description===undefined?old.description:text(req.body.description,2000), start=req.body?.startAt===undefined?old.startAt:text(req.body.startAt,40), end=req.body?.endAt===undefined?old.endAt:(text(req.body.endAt,40)||null);
    if(!title||Number.isNaN(Date.parse(start))||(end&&(Number.isNaN(Date.parse(end))||Date.parse(end)<Date.parse(start))))return res.status(400).json({error:"Invalid event details."});
    db.prepare("UPDATE ai_calendar_events SET title=?,description=?,startAt=?,endAt=?,updatedAt=? WHERE id=? AND userId=?").run(title,description,start,end,now(),req.params.id,req.user.id); res.json({event:db.prepare("SELECT * FROM ai_calendar_events WHERE id=?").get(req.params.id)});
  });
  app.delete("/api/ai/calendar/:id",auth.authMiddleware,(req,res)=>{const r=db.prepare("DELETE FROM ai_calendar_events WHERE id=? AND userId=?").run(req.params.id,req.user.id); if(!r.changes)return res.status(404).json({error:"Event not found."});res.json({ok:true});});
  app.get("/api/ai/tasks",auth.authMiddleware,(req,res)=>res.json({tasks:db.prepare("SELECT * FROM ai_tasks WHERE userId=? ORDER BY completed,dueAt LIMIT 300").all(req.user.id)}));
  app.post("/api/ai/tasks",auth.authMiddleware,(req,res)=>{const title=text(req.body?.title,200),due=req.body?.dueAt?text(req.body.dueAt,40):null;if(!title||(due&&Number.isNaN(Date.parse(due))))return res.status(400).json({error:"Enter a task title and valid optional due date."});const tid=id("task");db.prepare("INSERT INTO ai_tasks(id,userId,title,dueAt,completed,createdAt) VALUES(?,?,?,?,0,?)").run(tid,req.user.id,title,due,now());res.status(201).json({task:db.prepare("SELECT * FROM ai_tasks WHERE id=?").get(tid)});});
  app.patch("/api/ai/tasks/:id",auth.authMiddleware,(req,res)=>{
    const old=db.prepare("SELECT * FROM ai_tasks WHERE id=? AND userId=?").get(req.params.id,req.user.id); if(!old)return res.status(404).json({error:"Task not found."});
    const title=req.body?.title===undefined?old.title:text(req.body.title,200), due=req.body?.dueAt===undefined?old.dueAt:(text(req.body.dueAt,40)||null), completed=req.body?.completed===undefined?Boolean(old.completed):req.body.completed;
    if(!title||typeof completed!=="boolean"||(due&&Number.isNaN(Date.parse(due))))return res.status(400).json({error:"Invalid task details."});
    db.prepare("UPDATE ai_tasks SET title=?,dueAt=?,completed=? WHERE id=? AND userId=?").run(title,due,completed?1:0,req.params.id,req.user.id); res.json({task:db.prepare("SELECT * FROM ai_tasks WHERE id=?").get(req.params.id)});
  });
  app.delete("/api/ai/tasks/:id",auth.authMiddleware,(req,res)=>{const r=db.prepare("DELETE FROM ai_tasks WHERE id=? AND userId=?").run(req.params.id,req.user.id);if(!r.changes)return res.status(404).json({error:"Task not found."});res.json({ok:true});});

  // Personal Knowledge Hub. Content is untrusted data, indexed deterministically per owner,
  // and every search result carries citation/provenance. No document content grants authority.
  app.get("/api/ai/knowledge",auth.authMiddleware,(req,res)=>res.json({documents:db.prepare("SELECT id,title,type,substr(content,1,280) AS preview,length(content) AS characterCount,createdAt,updatedAt FROM ai_knowledge WHERE userId=? ORDER BY updatedAt DESC LIMIT 200").all(req.user.id)}));
  app.post("/api/ai/knowledge",auth.authMiddleware,(req,res)=>{
    const parsed=knowledgeHub.ingestDocument({title:req.body?.title,content:req.body?.content,type:req.body?.type},req.user.id);
    if(!parsed.ok) return res.status(400).json({error:({TITLE_AND_CONTENT_REQUIRED:"Document title and content are required.",TITLE_TOO_LONG:"Document title is too long.",UNSUPPORTED_TYPE:"This document type is not supported.",DOCUMENT_TOO_LARGE:"Document exceeds the 50000-character limit."})[parsed.error]||"Document could not be ingested."});
    const did=id("doc"),ts=now();
    db.prepare("INSERT INTO ai_knowledge(id,userId,title,content,type,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?)").run(did,req.user.id,parsed.document.title,parsed.document.content,parsed.document.type,ts,ts);
    auditKnowledgeEvent(req.user.id,"knowledge.created",did,{chunkCount:parsed.document.chunkCount,type:parsed.document.type});
    res.status(201).json({document:{id:did,title:parsed.document.title,type:parsed.document.type,chunkCount:parsed.document.chunkCount,trust:"untrusted-content",createdAt:ts,updatedAt:ts}});
  });
  app.get("/api/ai/knowledge/search",auth.authMiddleware,(req,res)=>{
    const q=typeof req.query.q==="string"?req.query.q:"";
    const docs=db.prepare("SELECT id,userId,title,content,type,createdAt,updatedAt FROM ai_knowledge WHERE userId=? ORDER BY updatedAt DESC LIMIT 1000").all(req.user.id);
    const found=knowledgeHub.retrieve(q,docs,req.user.id);
    if(!found.ok) return res.status(400).json({error:"Search query must be at least 2 characters."});
    auditKnowledgeEvent(req.user.id,"knowledge.searched",null,{resultCount:found.results.length,queryFingerprint:require("node:crypto").createHash("sha256").update(found.query.toLowerCase()).digest("hex").slice(0,16)});
    res.json(found);
  });
  app.get("/api/ai/knowledge/:id/chunks",auth.authMiddleware,(req,res)=>{
    const doc=db.prepare("SELECT id,userId,title,content,type,updatedAt FROM ai_knowledge WHERE id=? AND userId=?").get(req.params.id,req.user.id);
    if(!doc) return res.status(404).json({error:"Document not found."});
    const indexed=knowledgeHub.indexDocuments([doc],req.user.id);
    res.json({documentId:doc.id,chunks:indexed.map(({documentId,chunkIndex,text,fingerprint,trust})=>({documentId,chunkIndex,text,fingerprint,trust:"untrusted-content"}))});
  });
  app.patch("/api/ai/knowledge/:id",auth.authMiddleware,(req,res)=>{
    const old=db.prepare("SELECT * FROM ai_knowledge WHERE id=? AND userId=?").get(req.params.id,req.user.id); if(!old)return res.status(404).json({error:"Document not found."});
    const title=req.body?.title===undefined?old.title:req.body.title, content=req.body?.content===undefined?old.content:req.body.content;
    const parsed=knowledgeHub.ingestDocument({title,content,type:req.body?.type||old.type||"text/plain"},req.user.id);
    if(!parsed.ok) return res.status(400).json({error:({TITLE_AND_CONTENT_REQUIRED:"Document title and content are required.",TITLE_TOO_LONG:"Document title is too long.",UNSUPPORTED_TYPE:"This document type is not supported.",DOCUMENT_TOO_LARGE:"Document exceeds the 50000-character limit."})[parsed.error]||"Document could not be updated."});
    const ts=now(); db.prepare("UPDATE ai_knowledge SET title=?,content=?,type=?,updatedAt=? WHERE id=? AND userId=?").run(parsed.document.title,parsed.document.content,parsed.document.type,ts,req.params.id,req.user.id);
    auditKnowledgeEvent(req.user.id,"knowledge.updated",old.id,{chunkCount:parsed.document.chunkCount,type:parsed.document.type});
    res.json({document:{id:old.id,title:parsed.document.title,type:parsed.document.type,chunkCount:parsed.document.chunkCount,trust:"untrusted-content",createdAt:old.createdAt,updatedAt:ts}});
  });
  app.delete("/api/ai/knowledge/:id",auth.authMiddleware,(req,res)=>{
    const result=knowledgeHub.deleteSource(db,{documentId:req.params.id,ownerId:req.user.id});
    if(!result.ok) return res.status(404).json({error:"Document not found."});
    auditKnowledgeEvent(req.user.id,"knowledge.deleted",req.params.id,{});
    res.json({ok:true,deleted:true});
  });
  app.get("/api/ai/notes",auth.authMiddleware,(req,res)=>res.json({notes:db.prepare("SELECT id,content,createdAt FROM ai_notes WHERE userId=? ORDER BY createdAt DESC LIMIT 300").all(req.user.id)}));
  app.post("/api/ai/notes",auth.authMiddleware,(req,res)=>{const content=text(req.body?.content,50000);if(!content)return res.status(400).json({error:"Note content is required."});const nid=id("note"),ts=now();db.prepare("INSERT INTO ai_notes(id,userId,content,createdAt) VALUES(?,?,?,?)").run(nid,req.user.id,content,ts);res.status(201).json({note:{id:nid,content,createdAt:ts}});});
  app.patch("/api/ai/notes/:id",auth.authMiddleware,(req,res)=>{const old=db.prepare("SELECT * FROM ai_notes WHERE id=? AND userId=?").get(req.params.id,req.user.id);if(!old)return res.status(404).json({error:"Note not found."});const content=text(req.body?.content,50000);if(!content)return res.status(400).json({error:"Note content is required."});db.prepare("UPDATE ai_notes SET content=? WHERE id=? AND userId=?").run(content,req.params.id,req.user.id);res.json({note:{id:old.id,content,createdAt:old.createdAt}});});
  app.delete("/api/ai/notes/:id",auth.authMiddleware,(req,res)=>{const r=db.prepare("DELETE FROM ai_notes WHERE id=? AND userId=?").run(req.params.id,req.user.id);if(!r.changes)return res.status(404).json({error:"Note not found."});res.json({ok:true});});
}
module.exports={mount,validateSteps};
