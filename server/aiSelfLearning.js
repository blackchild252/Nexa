"use strict";
const crypto=require("crypto");
const eventCorrelation=require("./eventCorrelation");
const PROFILES=new Set(["consumer_dami","admin_operations"]);
const RETENTION_DAYS=Object.freeze({memory:180,followup:90,event:365,feedback:365,pattern:180});
const EVENT_TYPES=new Set(["activity","correction","instruction","success","failure","explicit_learning","feedback","forget"]);
const text=(v,max=4000)=>String(v??"").trim().slice(0,max);
const now=()=>new Date().toISOString();
const id=()=>crypto.randomUUID();
function hash(v){return crypto.createHash("sha256").update(String(v)).digest("hex");}
function safeMeta(value){
  if(!value||typeof value!=="object")return {};
  const blocked=/password|token|secret|api.?key|authorization|cookie|email|phone|address|balance|amount|card|account|payment|order/i;
  const out={};
  for(const [k,v] of Object.entries(value)){
    if(blocked.test(k))continue;
    if(typeof v==="string")out[k]=text(v,300);
    else if(typeof v==="number"||typeof v==="boolean")out[k]=v;
  }
  return out;
}
function createAiSelfLearning(db){
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_learning_events (
      id TEXT PRIMARY KEY, profileId TEXT NOT NULL, userId TEXT NOT NULL, type TEXT NOT NULL,
      activity TEXT NOT NULL, lesson TEXT NOT NULL DEFAULT '', outcome TEXT NOT NULL DEFAULT '',
      metadata TEXT NOT NULL DEFAULT '{}', topicKey TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_learning_events_user_created ON ai_learning_events(userId,createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_learning_events_profile_created ON ai_learning_events(profileId,createdAt DESC);
    CREATE TABLE IF NOT EXISTS ai_learning_memory (
      id TEXT PRIMARY KEY, profileId TEXT NOT NULL, userId TEXT NOT NULL, lesson TEXT NOT NULL,
      sourceEventId TEXT NOT NULL, confidence REAL NOT NULL DEFAULT 0.5, confirmations INTEGER NOT NULL DEFAULT 0,
      sourceType TEXT NOT NULL DEFAULT 'explicit', topicKey TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_learning_memory_user_active ON ai_learning_memory(userId,active,updatedAt DESC);
    CREATE TABLE IF NOT EXISTS ai_learning_feedback (
      id TEXT PRIMARY KEY, profileId TEXT NOT NULL, userId TEXT NOT NULL, memoryId TEXT NOT NULL,
      signal TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_learning_feedback_memory ON ai_learning_feedback(memoryId,createdAt DESC);
    CREATE TABLE IF NOT EXISTS ai_learning_patterns (
      id TEXT PRIMARY KEY, profileId TEXT NOT NULL, userId TEXT NOT NULL, patternKey TEXT NOT NULL, patternValue TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 1, confidence REAL NOT NULL DEFAULT 0.55, lastSeenAt TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
      UNIQUE(profileId,userId,patternKey,patternValue)
    );
    CREATE INDEX IF NOT EXISTS idx_ai_learning_patterns_user ON ai_learning_patterns(profileId,userId,confidence DESC,updatedAt DESC);
    CREATE TABLE IF NOT EXISTS ai_learning_followups (
      id TEXT PRIMARY KEY, profileId TEXT NOT NULL, userId TEXT NOT NULL, memoryId TEXT,
      title TEXT NOT NULL, reason TEXT NOT NULL, dueAt TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL, completedAt TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_ai_learning_followups_user_due ON ai_learning_followups(userId,status,dueAt);
    CREATE TABLE IF NOT EXISTS ai_learning_controls (
      profileId TEXT NOT NULL, userId TEXT NOT NULL, paused INTEGER NOT NULL DEFAULT 0, updatedAt TEXT NOT NULL,
      PRIMARY KEY(profileId,userId)
    );
  `);
  const eventColumns=new Set(db.prepare("PRAGMA table_info(ai_learning_events)").all().map(c=>c.name));
  if(!eventColumns.has("topicKey"))db.exec("ALTER TABLE ai_learning_events ADD COLUMN topicKey TEXT NOT NULL DEFAULT ''");
  db.exec("CREATE INDEX IF NOT EXISTS idx_ai_learning_events_topic ON ai_learning_events(profileId,userId,topicKey,createdAt DESC)");
  const memoryColumns=new Set(db.prepare("PRAGMA table_info(ai_learning_memory)").all().map(c=>c.name));
  if(!memoryColumns.has("sourceType"))db.exec("ALTER TABLE ai_learning_memory ADD COLUMN sourceType TEXT NOT NULL DEFAULT 'explicit'");
  if(!memoryColumns.has("topicKey"))db.exec("ALTER TABLE ai_learning_memory ADD COLUMN topicKey TEXT NOT NULL DEFAULT ''");
  db.exec("CREATE INDEX IF NOT EXISTS idx_ai_learning_memory_topic ON ai_learning_memory(profileId,userId,topicKey,active)");
  const checkProfile=p=>{if(!PROFILES.has(p))throw new Error("Unknown AI profile.")};
  const checkType=t=>{if(!EVENT_TYPES.has(t))throw new Error("Invalid learning event type.")};
  const effectiveConfidence=(memory,at=Date.now())=>{
    const base=Math.max(0,Math.min(1,Number(memory.confidence||0)));
    const updated=Date.parse(memory.updatedAt||memory.createdAt||0);
    if(!Number.isFinite(updated))return base;
    const ageDays=Math.max(0,(at-updated)/86400000);
    if(ageDays<=30)return base;
    return Math.max(0,Number((base*Math.pow(0.98,ageDays-30)).toFixed(4)));
  };
  function isPaused({profileId,userId}={}){checkProfile(profileId);if(!userId)throw new Error("Learning owner is required.");return !!db.prepare("SELECT paused FROM ai_learning_controls WHERE profileId=? AND userId=?").get(profileId,String(userId))?.paused;}
  function setPaused({profileId,userId,paused}={}){checkProfile(profileId);if(!userId)throw new Error("Learning owner is required.");const value=paused===true;const ts=now();db.prepare("INSERT INTO ai_learning_controls(profileId,userId,paused,updatedAt) VALUES(?,?,?,?) ON CONFLICT(profileId,userId) DO UPDATE SET paused=excluded.paused,updatedAt=excluded.updatedAt").run(profileId,String(userId),value?1:0,ts);audit(value?"ai.learning.pause":"ai.learning.resume",userId,null,{profileId,paused:value});return {paused:value,updatedAt:ts};}
  function observe({profileId,userId,type="activity",activity,lesson="",outcome="",metadata={},patternKey="",patternValue="",topicKey=""}={}){
    checkProfile(profileId);checkType(type);if(!userId)throw new Error("Learning owner is required.");
    if(isPaused({profileId,userId}) && type!=="explicit_learning" && type!=="correction") return {eventId:null,memory:null,pattern:null,paused:true};
    const a=text(activity,2000),l=text(lesson,4000),o=text(outcome,1000),tk=text(topicKey,80).toLowerCase();if(!a)throw new Error("Learning activity is required.");
    const eventId=id(),ts=now();db.prepare("INSERT INTO ai_learning_events(id,profileId,userId,type,activity,lesson,outcome,metadata,topicKey,createdAt) VALUES(?,?,?,?,?,?,?,?,?,?)").run(eventId,profileId,String(userId),type,a,l,o,JSON.stringify(safeMeta(metadata)),tk,ts);
    let pattern=null;
    const pk=text(patternKey,80), pv=text(patternValue,160);
    if(pk && pv){
      const existingPattern=db.prepare("SELECT * FROM ai_learning_patterns WHERE profileId=? AND userId=? AND patternKey=? AND patternValue=?").get(profileId,String(userId),pk,pv);
      if(existingPattern){
        const count=Number(existingPattern.count||0)+1;
        const confidence=Math.min(1,Number(existingPattern.confidence||0.5)+0.05);
        db.prepare("UPDATE ai_learning_patterns SET count=?,confidence=?,lastSeenAt=?,updatedAt=? WHERE id=?").run(count,confidence,ts,ts,existingPattern.id);
        pattern={...existingPattern,count,confidence,lastSeenAt:ts,updatedAt:ts};
      }else{
        const patternId=id();
        db.prepare("INSERT INTO ai_learning_patterns(id,profileId,userId,patternKey,patternValue,count,confidence,lastSeenAt,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?)").run(patternId,profileId,String(userId),pk,pv,1,0.55,ts,ts,ts);
        pattern={id:patternId,profileId,userId:String(userId),patternKey:pk,patternValue:pv,count:1,confidence:0.55,lastSeenAt:ts,createdAt:ts,updatedAt:ts};
      }
    }
    let memory=null;
    if(l){
      const normalized=l.toLowerCase();
      const existing=db.prepare("SELECT * FROM ai_learning_memory WHERE profileId=? AND userId=? AND active=1 AND lower(lesson)=? ORDER BY updatedAt DESC LIMIT 1").get(profileId,String(userId),normalized);
      if(existing){
        const confidence=Math.min(1,Number(existing.confidence||0.5)+0.1);const confirmations=Number(existing.confirmations||0)+1;
        db.prepare("UPDATE ai_learning_memory SET confidence=?,confirmations=?,sourceEventId=?,updatedAt=? WHERE id=?").run(confidence,confirmations,eventId,ts,existing.id);
        memory={...existing,confidence,confirmations,sourceEventId:eventId,updatedAt:ts};
      }else{
        const memoryId=id();
        const sourceType=type==="explicit_learning"?"explicit":type==="activity"?"derived":"event";
        const tk=text(topicKey,80).toLowerCase();
        db.prepare("INSERT INTO ai_learning_memory(id,profileId,userId,lesson,sourceEventId,confidence,confirmations,sourceType,topicKey,active,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,1,?,?)").run(memoryId,profileId,String(userId),l,eventId,0.55,1,sourceType,tk,ts,ts);
        memory={id:memoryId,profileId,userId:String(userId),lesson:l,sourceEventId:eventId,confidence:0.55,confirmations:1,sourceType,topicKey:tk,active:1,createdAt:ts,updatedAt:ts};
      }
    }
    return {eventId,memory,pattern};
  }
  function audit(action,userId,entityId=null,metadata={}){
    try{eventCorrelation.record(db,eventCorrelation.createEvent({requestId:`ai_learning_${userId}`,userId,action,entityType:"ai_learning",entityId,metadata}));}catch(_){}
  }
  function explicitLearn(args){const result=observe({...args,type:"explicit_learning",lesson:args.lesson});audit("ai.learning.teach",args.userId,result.memory?.id,{profileId:args.profileId,source:"explicit"});return result;}
  function feedback({profileId,userId,memoryId,signal,note=""}={}){
    checkProfile(profileId); if(!userId||!memoryId)throw new Error("Learning owner and memory are required.");
    const allowed=new Set(["confirm","correct","forget"]); if(!allowed.has(signal))throw new Error("Invalid learning feedback.");
    const memory=db.prepare("SELECT * FROM ai_learning_memory WHERE id=? AND profileId=? AND userId=? AND active=1").get(memoryId,profileId,String(userId));
    if(!memory)throw new Error("Learned memory not found.");
    const ts=now(); db.prepare("INSERT INTO ai_learning_feedback(id,profileId,userId,memoryId,signal,note,createdAt) VALUES(?,?,?,?,?,?,?)").run(id(),profileId,String(userId),memoryId,signal,text(note,500),ts);
    if(signal==="forget") db.prepare("UPDATE ai_learning_memory SET active=0,updatedAt=? WHERE id=?").run(ts,memoryId);
    else {
      const delta=signal==="confirm"?0.1:-0.2; const confidence=Math.max(0,Math.min(1,Number(memory.confidence||0.5)+delta));
      const confirmations=signal==="confirm"?Number(memory.confirmations||0)+1:Number(memory.confirmations||0);
      db.prepare("UPDATE ai_learning_memory SET confidence=?,confirmations=?,updatedAt=? WHERE id=?").run(confidence,confirmations,ts,memoryId);
      if(signal==="correct") {
        const correctionId=id();
        const correctedLesson=text(note,4000);
        db.prepare("INSERT INTO ai_learning_events(id,profileId,userId,type,activity,lesson,outcome,metadata,topicKey,createdAt) VALUES(?,?,?,?,?,?,?,?,?,?)").run(correctionId,profileId,String(userId),"correction","Learning memory corrected",correctedLesson,"corrected",JSON.stringify(safeMeta({memoryId,source:"explicit_feedback",previousLesson:memory.lesson})),memory.topicKey||"",ts);
        if(correctedLesson) {
          db.prepare("UPDATE ai_learning_memory SET lesson=?,sourceEventId=?,sourceType='corrected',updatedAt=? WHERE id=?").run(correctedLesson,correctionId,ts,memoryId);
        }
      }
    }
    const result=db.prepare("SELECT * FROM ai_learning_memory WHERE id=?").get(memoryId);
    audit(`ai.learning.${signal}`,userId,memoryId,{profileId,signal});
    return result;
  }
  function forgetTopic({profileId,userId,topicKey}={}){
    checkProfile(profileId);if(!userId||!text(topicKey,80))throw new Error("Learning topic is required.");
    const tk=text(topicKey,80).toLowerCase(),ts=now();
    const result=db.prepare("UPDATE ai_learning_memory SET active=0,updatedAt=? WHERE profileId=? AND userId=? AND topicKey=? AND active=1").run(ts,profileId,String(userId),tk);
    db.prepare("DELETE FROM ai_learning_followups WHERE profileId=? AND userId=? AND memoryId IN (SELECT id FROM ai_learning_memory WHERE profileId=? AND userId=? AND topicKey=?) AND status IN ('pending','overdue')").run(profileId,String(userId),profileId,String(userId),tk);
    audit("ai.learning.topic_forget",userId,null,{profileId,topicKey:tk,memoriesForgotten:result.changes});
    return {reset:true,topicKey:tk,memoriesForgotten:result.changes};
  }
  function reset({profileId,userId}={}){
    checkProfile(profileId); if(!userId)throw new Error("Learning owner is required."); const uid=String(userId);
    const memories=db.prepare("SELECT id FROM ai_learning_memory WHERE profileId=? AND userId=? AND active=1").all(profileId,uid); const ts=now();
    db.prepare("UPDATE ai_learning_memory SET active=0,updatedAt=? WHERE profileId=? AND userId=?").run(ts,profileId,uid);
    db.prepare("DELETE FROM ai_learning_followups WHERE profileId=? AND userId=? AND status='pending'").run(profileId,uid);
    audit("ai.learning.reset",userId,null,{profileId,memoriesForgotten:memories.length});
    return {reset:true,memoriesForgotten:memories.length};
  }
  function promoteRepeatedActivity({profileId,userId,activity,metadata={}}={}){
    if(isPaused({profileId,userId})) return null;
    const a=text(activity,2000); if(!a)return null; const count=db.prepare("SELECT COUNT(*) AS n FROM ai_learning_events WHERE profileId=? AND userId=? AND activity=?").get(profileId,String(userId),a)?.n||0;
    if(count<3)return null;
    const lesson=`Repeated activity pattern observed: ${a}`;
    const existing=db.prepare("SELECT * FROM ai_learning_memory WHERE profileId=? AND userId=? AND active=1 AND sourceType='derived' AND lower(lesson)=lower(?) LIMIT 1").get(profileId,String(userId),lesson);
    if(existing)return existing;
    return observe({profileId,userId,type:"activity",activity:a,lesson,metadata:{...metadata,derived:true,repeatCount:count}}).memory;
  }
  function state({profileId,userId}={}){
    checkProfile(profileId);if(!userId)throw new Error("Learning owner is required.");
    const memories=db.prepare("SELECT m.id,m.profileId,m.lesson,m.sourceEventId,m.confidence,m.confirmations,m.sourceType,m.topicKey,m.createdAt,m.updatedAt,e.activity AS sourceActivity,e.createdAt AS sourceCreatedAt,e.outcome AS sourceOutcome FROM ai_learning_memory m LEFT JOIN ai_learning_events e ON e.id=m.sourceEventId WHERE m.profileId=? AND m.userId=? AND m.active=1 ORDER BY m.updatedAt DESC LIMIT 100").all(profileId,String(userId)).map(m=>({...m,effectiveConfidence:effectiveConfidence(m)}));
    const events=db.prepare("SELECT id,type,activity,outcome,topicKey,createdAt FROM ai_learning_events WHERE profileId=? AND userId=? ORDER BY createdAt DESC LIMIT 20").all(profileId,String(userId));
    const patterns=db.prepare("SELECT patternKey,patternValue,count,confidence,lastSeenAt FROM ai_learning_patterns WHERE profileId=? AND userId=? AND (count>=2 OR confidence>=0.65) ORDER BY confidence DESC,updatedAt DESC LIMIT 30").all(profileId,String(userId));
    const topics=db.prepare("SELECT topicKey,COUNT(*) AS memoryCount,MAX(updatedAt) AS lastUpdated FROM ai_learning_memory WHERE profileId=? AND userId=? AND active=1 AND topicKey<>'' GROUP BY topicKey ORDER BY lastUpdated DESC LIMIT 30").all(profileId,String(userId));
    const pending=db.prepare("SELECT id,title,reason,dueAt,status,memoryId,createdAt FROM ai_learning_followups WHERE profileId=? AND userId=? AND status IN ('pending','overdue') ORDER BY dueAt LIMIT 20").all(profileId,String(userId)).map(f=>({...f,status:Date.parse(f.dueAt)<Date.now()?'overdue':f.status}));
    const overdue=pending.filter(f=>f.status==='overdue').length;
    const sourceBreakdown={explicit:0,derived:0,corrected:0,event:0};
    for(const memory of memories) sourceBreakdown[memory.sourceType]=(sourceBreakdown[memory.sourceType]||0)+1;
    const feedbackBreakdown={confirm:0,correct:0,forget:0};
    for(const row of db.prepare("SELECT signal,COUNT(*) AS count FROM ai_learning_feedback WHERE profileId=? AND userId=? GROUP BY signal").all(profileId,String(userId))) feedbackBreakdown[row.signal]=Number(row.count||0);
    const paused=isPaused({profileId,userId});
    const summary={activeMemories:memories.length,sourceBreakdown,feedbackBreakdown,activeTopics:topics.length,pendingFollowups:pending.length,overdueFollowups:overdue,paused,retentionDays:{...RETENTION_DAYS}};
    return {profileId,userId:String(userId),topics,summary,selfModel:{status:"adaptive",memoryCount:memories.length,patternCount:patterns.length,averageConfidence:memories.length?Number((memories.reduce((n,m)=>n+Number(m.effectiveConfidence||0),0)/memories.length).toFixed(3)):0,lastActivity:events[0]?.createdAt||null,overdueFollowups:overdue,learningMode:paused?"paused":"governed_adaptive",paused},memories,patterns,events,followups:pending};
  }
  function scheduleFollowup({profileId,userId,title,reason,dueAt,memoryId=null}={}){
    checkProfile(profileId);if(!userId||!text(title,160)||!text(reason,500))throw new Error("Follow-up title and reason are required.");
    const due=text(dueAt,40);if(!due||Number.isNaN(Date.parse(due)))throw new Error("A valid ISO follow-up time is required.");
    const fid=id(),ts=now();db.prepare("INSERT INTO ai_learning_followups(id,profileId,userId,memoryId,title,reason,dueAt,status,createdAt) VALUES(?,?,?,?,?,?,?, 'pending', ?)").run(fid,profileId,String(userId),memoryId,text(title,160),text(reason,500),due,ts);
    const result=db.prepare("SELECT * FROM ai_learning_followups WHERE id=?").get(fid);audit("ai.learning.followup.schedule",userId,fid,{profileId,memoryId:memoryId||null});return result;
  }
  function completeFollowup({profileId,userId,id:followupId}={}){
    checkProfile(profileId);const ts=now();const r=db.prepare("UPDATE ai_learning_followups SET status='completed',completedAt=? WHERE id=? AND profileId=? AND userId=? AND status IN ('pending','overdue')").run(ts,followupId,profileId,String(userId));if(!r.changes)throw new Error("Pending follow-up not found.");const result=db.prepare("SELECT * FROM ai_learning_followups WHERE id=?").get(followupId);audit("ai.learning.followup.complete",userId,followupId,{profileId});return result;
  }
  function cancelFollowup({profileId,userId,id:followupId}={}){
    checkProfile(profileId);const ts=now();const r=db.prepare("UPDATE ai_learning_followups SET status='cancelled',completedAt=? WHERE id=? AND profileId=? AND userId=? AND status IN ('pending','overdue')").run(ts,followupId,profileId,String(userId));if(!r.changes)throw new Error("Pending follow-up not found.");const result=db.prepare("SELECT * FROM ai_learning_followups WHERE id=?").get(followupId);audit("ai.learning.followup.cancel",userId,followupId,{profileId});return result;
  }
  function buildFollowupContext({profileId,userId,limit=6}={}){checkProfile(profileId);const n=Math.max(1,Math.min(12,Number(limit)||6));const rows=db.prepare("SELECT title,reason,dueAt,status FROM ai_learning_followups WHERE profileId=? AND userId=? AND status IN ('pending','overdue') ORDER BY dueAt LIMIT ?").all(profileId,String(userId),n);return rows.map(f=>({...f,status:Date.parse(f.dueAt)<Date.now()?"overdue":f.status}));}
  function buildLearningContext({profileId,userId,limit=12}={}){
    checkProfile(profileId);const n=Math.max(1,Math.min(30,Number(limit)||12));return db.prepare("SELECT lesson,confidence,confirmations,sourceType,topicKey,updatedAt FROM ai_learning_memory WHERE profileId=? AND userId=? AND active=1 ORDER BY updatedAt DESC LIMIT 100").all(profileId,String(userId)).map(m=>({...m,effectiveConfidence:effectiveConfidence(m)})).filter(m=>m.effectiveConfidence>=0.4).sort((a,b)=>b.effectiveConfidence-a.effectiveConfidence||Date.parse(b.updatedAt)-Date.parse(a.updatedAt)).slice(0,n);
  }
  function buildBehaviorContext({profileId,userId,limit=10}={}){
    checkProfile(profileId);const n=Math.max(1,Math.min(20,Number(limit)||10));return db.prepare("SELECT patternKey,patternValue,count,confidence FROM ai_learning_patterns WHERE profileId=? AND userId=? AND (count>=2 OR confidence>=0.65) ORDER BY confidence DESC,count DESC,updatedAt DESC LIMIT ?").all(profileId,String(userId),n);
  }
  function pruneStale({profileId,userId,nowMs=Date.now()}={}){
    checkProfile(profileId);if(!userId)throw new Error("Learning owner is required.");
    const uid=String(userId),ts=new Date(nowMs).toISOString();
    const memoryCutoff=new Date(nowMs-RETENTION_DAYS.memory*86400000).toISOString();
    const followupCutoff=new Date(nowMs-RETENTION_DAYS.followup*86400000).toISOString();
    const eventCutoff=new Date(nowMs-RETENTION_DAYS.event*86400000).toISOString();
    const feedbackCutoff=new Date(nowMs-RETENTION_DAYS.feedback*86400000).toISOString();
    const patternCutoff=new Date(nowMs-RETENTION_DAYS.pattern*86400000).toISOString();
    const stale=db.prepare("SELECT id FROM ai_learning_memory WHERE profileId=? AND userId=? AND active=1 AND updatedAt<? AND confidence<0.2").all(profileId,uid,memoryCutoff);
    for(const row of stale) db.prepare("UPDATE ai_learning_memory SET active=0,updatedAt=? WHERE id=? AND profileId=? AND userId=?").run(ts,row.id,profileId,uid);
    const followups=db.prepare("DELETE FROM ai_learning_followups WHERE profileId=? AND userId=? AND status IN ('completed','cancelled') AND completedAt<?").run(profileId,uid,followupCutoff).changes;
    const feedback=db.prepare("DELETE FROM ai_learning_feedback WHERE profileId=? AND userId=? AND createdAt<?").run(profileId,uid,feedbackCutoff).changes;
    const patterns=db.prepare("DELETE FROM ai_learning_patterns WHERE profileId=? AND userId=? AND updatedAt<? AND count<3 AND confidence<0.65").run(profileId,uid,patternCutoff).changes;
    const events=db.prepare("DELETE FROM ai_learning_events WHERE profileId=? AND userId=? AND createdAt<? AND id NOT IN (SELECT sourceEventId FROM ai_learning_memory WHERE profileId=? AND userId=? AND active=1)").run(profileId,uid,eventCutoff,profileId,uid).changes;
    const result={memoriesExpired:stale.length,followupsPruned:followups,feedbackPruned:feedback,patternsPruned:patterns,eventsPruned:events,retentionDays:{...RETENTION_DAYS}};
    audit("ai.learning.prune",userId,null,{profileId,...result});
    return result;
  }
  function exportLearning({profileId,userId}={}){checkProfile(profileId);if(!userId)throw new Error("Learning owner is required.");const result=state({profileId,userId});audit("ai.learning.export",userId,null,{profileId,memoryCount:result.memories.length,followupCount:result.followups.length});return result;}
  return {observe,explicitLearn,feedback,reset,forgetTopic,promoteRepeatedActivity,state,isPaused,setPaused,scheduleFollowup,completeFollowup,cancelFollowup,buildLearningContext,buildBehaviorContext,buildFollowupContext,pruneStale,exportLearning,hash};
}
module.exports={createAiSelfLearning,EVENT_TYPES};

function registerAiSelfLearning({app,auth,db,admin}={}){
  const service=createAiSelfLearning(db);
  app.get("/api/ai/learning/export",auth.authMiddleware,(req,res)=>{
    try{res.json({learning:service.exportLearning({profileId:"consumer_dami",userId:req.user.id})});}catch(e){res.status(400).json({error:e.message});}
  });
  app.get("/api/ai/learning/state",auth.authMiddleware,(req,res)=>{
    try{res.json({state:service.state({profileId:"consumer_dami",userId:req.user.id})});}
    catch(e){res.status(400).json({error:e.message});}
  });
  app.post("/api/ai/learning/learn",auth.authMiddleware,(req,res)=>{
    try{
      const lesson=text(req.body?.lesson,4000),activity=text(req.body?.activity||"User explicitly taught Dami a new preference or fact.",2000);
      if(!lesson)return res.status(400).json({error:"lesson is required"});
      const result=service.explicitLearn({profileId:"consumer_dami",userId:req.user.id,activity,lesson,outcome:text(req.body?.outcome,1000),topicKey:text(req.body?.topicKey,80),metadata:{source:"explicit_user_learning"}});
      res.status(201).json({learned:true,...result});
    }catch(e){res.status(400).json({error:e.message});}
  });
  app.post("/api/ai/learning/followups",auth.authMiddleware,(req,res)=>{
    try{const result=service.scheduleFollowup({profileId:"consumer_dami",userId:req.user.id,title:req.body?.title,reason:req.body?.reason,dueAt:req.body?.dueAt,memoryId:req.body?.memoryId||null});res.status(201).json({followup:result});}
    catch(e){res.status(400).json({error:e.message});}
  });
  app.post("/api/ai/learning/followups/:id/complete",auth.authMiddleware,(req,res)=>{
    try{res.json({followup:service.completeFollowup({profileId:"consumer_dami",userId:req.user.id,id:req.params.id})});}
    catch(e){res.status(404).json({error:e.message});}
  });
  app.post("/api/ai/learning/followups/:id/cancel",auth.authMiddleware,(req,res)=>{
    try{res.json({followup:service.cancelFollowup({profileId:"consumer_dami",userId:req.user.id,id:req.params.id})});}
    catch(e){res.status(404).json({error:e.message});}
  });
  app.post("/api/ai/learning/feedback",auth.authMiddleware,(req,res)=>{
    try{const result=service.feedback({profileId:"consumer_dami",userId:req.user.id,memoryId:req.body?.memoryId,signal:req.body?.signal,note:req.body?.note});res.json({memory:result});}
    catch(e){res.status(400).json({error:e.message});}
  });
  app.post("/api/ai/learning/topic/forget",auth.authMiddleware,(req,res)=>{
    try{res.json(service.forgetTopic({profileId:"consumer_dami",userId:req.user.id,topicKey:req.body?.topicKey}));}
    catch(e){res.status(400).json({error:e.message});}
  });
  app.post("/api/ai/learning/pause",auth.authMiddleware,(req,res)=>{try{res.json(service.setPaused({profileId:"consumer_dami",userId:req.user.id,paused:req.body?.paused===true}));}catch(e){res.status(400).json({error:e.message});}});
  app.post("/api/ai/learning/prune",auth.authMiddleware,(req,res)=>{
    try{res.json({pruned:service.pruneStale({profileId:"consumer_dami",userId:req.user.id})});}
    catch(e){res.status(400).json({error:e.message});}
  });
  app.post("/api/ai/learning/reset",auth.authMiddleware,(req,res)=>{
    try{res.json(service.reset({profileId:"consumer_dami",userId:req.user.id}));}
    catch(e){res.status(400).json({error:e.message});}
  });
  app.post("/api/admin/ai/learning/followups/:id/complete",auth.authMiddleware,(req,res)=>{
    const isAdmin=admin?.roleOf?.(req.user)==="owner"; if(!isAdmin)return res.status(403).json({error:"Administrator access required."});
    try{res.json({followup:service.completeFollowup({profileId:"admin_operations",userId:req.user.id,id:req.params.id})});}catch(e){res.status(400).json({error:e.message});}
  });
  app.post("/api/admin/ai/learning/followups/:id/cancel",auth.authMiddleware,(req,res)=>{
    const isAdmin=admin?.roleOf?.(req.user)==="owner"; if(!isAdmin)return res.status(403).json({error:"Administrator access required."});
    try{res.json({followup:service.cancelFollowup({profileId:"admin_operations",userId:req.user.id,id:req.params.id})});}catch(e){res.status(400).json({error:e.message});}
  });
  app.post("/api/admin/ai/learning/feedback",auth.authMiddleware,(req,res)=>{
    const isAdmin=admin?.roleOf?.(req.user)==="owner"; if(!isAdmin)return res.status(403).json({error:"Administrator access required."});
    try{res.json({memory:service.feedback({profileId:"admin_operations",userId:req.user.id,memoryId:req.body?.memoryId,signal:req.body?.signal,note:req.body?.note})});}
    catch(e){res.status(400).json({error:e.message});}
  });
  app.post("/api/admin/ai/learning/topic/forget",auth.authMiddleware,(req,res)=>{
    const isAdmin=admin?.roleOf?.(req.user)==="owner"; if(!isAdmin)return res.status(403).json({error:"Administrator access required."});
    try{res.json(service.forgetTopic({profileId:"admin_operations",userId:req.user.id,topicKey:req.body?.topicKey}));}
    catch(e){res.status(400).json({error:e.message});}
  });
  app.post("/api/admin/ai/learning/pause",auth.authMiddleware,(req,res)=>{const isAdmin=admin?.roleOf?.(req.user)==="owner";if(!isAdmin)return res.status(403).json({error:"Administrator access required."});try{res.json(service.setPaused({profileId:"admin_operations",userId:req.user.id,paused:req.body?.paused===true}));}catch(e){res.status(400).json({error:e.message});}});
  app.post("/api/admin/ai/learning/prune",auth.authMiddleware,(req,res)=>{
    const isAdmin=admin?.roleOf?.(req.user)==="owner"; if(!isAdmin)return res.status(403).json({error:"Administrator access required."});
    try{res.json({pruned:service.pruneStale({profileId:"admin_operations",userId:req.user.id})});}
    catch(e){res.status(400).json({error:e.message});}
  });
  app.post("/api/admin/ai/learning/reset",auth.authMiddleware,(req,res)=>{
    const isAdmin=admin?.roleOf?.(req.user)==="owner"; if(!isAdmin)return res.status(403).json({error:"Administrator access required."});
    try{res.json(service.reset({profileId:"admin_operations",userId:req.user.id}));}
    catch(e){res.status(400).json({error:e.message});}
  });
  app.get("/api/admin/ai/learning/state",auth.authMiddleware,(req,res)=>{
    const isAdmin=admin?.roleOf?.(req.user)==="owner";
    if(!isAdmin)return res.status(403).json({error:"Administrator access required."});
    try{res.json({state:service.state({profileId:"admin_operations",userId:req.user.id})});}catch(e){res.status(400).json({error:e.message});}
  });
  app.get("/api/admin/ai/learning/export",auth.authMiddleware,(req,res)=>{
    const isAdmin=admin?.roleOf?.(req.user)==="owner";
    if(!isAdmin)return res.status(403).json({error:"Administrator access required."});
    try{res.json({learning:service.exportLearning({profileId:"admin_operations",userId:req.user.id})});}catch(e){res.status(400).json({error:e.message});}
  });
  app.post("/api/admin/ai/learning/learn",auth.authMiddleware,(req,res)=>{
    const isAdmin=admin?.roleOf?.(req.user)==="owner";
    if(!isAdmin)return res.status(403).json({error:"Administrator access required."});
    try{const result=service.explicitLearn({profileId:"admin_operations",userId:req.user.id,activity:text(req.body?.activity||"Admin explicitly taught an operational lesson.",2000),lesson:text(req.body?.lesson,4000),outcome:text(req.body?.outcome,1000),topicKey:text(req.body?.topicKey,80),metadata:{source:"admin_explicit_learning"}});res.status(201).json({learned:true,...result});}catch(e){res.status(400).json({error:e.message});}
  });
  return service;
}
module.exports.registerAiSelfLearning=registerAiSelfLearning;
