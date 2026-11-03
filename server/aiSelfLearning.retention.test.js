"use strict";
const assert=require("assert");
const {test}=require("node:test");
const {createAiSelfLearning}=require("./aiSelfLearning");
const {DatabaseSync}=require("node:sqlite");
function db(){return new DatabaseSync(":memory:");}
test("stale low-confidence memory is expired without touching fresh learning",()=>{
  const d=db(),s=createAiSelfLearning(d),old=Date.parse("2025-01-01T00:00:00Z"),nowMs=Date.parse("2026-10-01T00:00:00Z");
  const a=s.explicitLearn({profileId:"consumer_dami",userId:"u1",activity:"old",lesson:"stale lesson"});
  d.prepare("UPDATE ai_learning_memory SET confidence=0.1,updatedAt=?,createdAt=? WHERE id=?").run("2025-01-01T00:00:00.000Z","2025-01-01T00:00:00.000Z",a.memory.id);
  const b=s.explicitLearn({profileId:"consumer_dami",userId:"u1",activity:"fresh",lesson:"fresh lesson"});
  const r=s.pruneStale({profileId:"consumer_dami",userId:"u1",nowMs});
  assert.equal(r.memoriesExpired,1);
  assert.equal(s.state({profileId:"consumer_dami",userId:"u1"}).memories.length,1);
  assert.equal(s.state({profileId:"consumer_dami",userId:"u1"}).memories[0].id,b.memory.id);
});
test("retention cleanup prunes completed followups and weak patterns only for the owner",()=>{
  const d=db(),s=createAiSelfLearning(d),nowMs=Date.parse("2026-10-01T00:00:00Z");
  const f=s.scheduleFollowup({profileId:"consumer_dami",userId:"u1",title:"old followup",reason:"r",dueAt:"2025-01-01T00:00:00Z"});
  s.completeFollowup({profileId:"consumer_dami",userId:"u1",id:f.id});
  for(let i=0;i<1;i++)s.observe({profileId:"consumer_dami",userId:"u1",activity:"weak",patternKey:"pref",patternValue:"rare"});
  s.observe({profileId:"consumer_dami",userId:"u2",activity:"weak",patternKey:"pref",patternValue:"rare"});
  d.prepare("UPDATE ai_learning_followups SET completedAt='2025-01-01T00:00:00.000Z' WHERE id=?").run(f.id);
  d.prepare("UPDATE ai_learning_patterns SET updatedAt='2025-01-01T00:00:00.000Z' WHERE userId='u1'").run();
  const r=s.pruneStale({profileId:"consumer_dami",userId:"u1",nowMs});
  assert.equal(r.followupsPruned,1); assert.equal(r.patternsPruned,1);
  assert.equal(s.state({profileId:"consumer_dami",userId:"u2"}).patterns.length,0); // single weak pattern is not exposed
  assert.equal(d.prepare("SELECT COUNT(*) n FROM ai_learning_patterns WHERE userId='u2'").get().n,1);
});
test("retention preserves source events referenced by active memories",()=>{
  const d=db(),s=createAiSelfLearning(d),nowMs=Date.parse("2026-10-01T00:00:00Z");
  const a=s.explicitLearn({profileId:"consumer_dami",userId:"u1",activity:"old event",lesson:"keep provenance"});
  d.prepare("UPDATE ai_learning_events SET createdAt='2025-01-01T00:00:00.000Z' WHERE id=?").run(a.eventId);
  s.pruneStale({profileId:"consumer_dami",userId:"u1",nowMs});
  assert.equal(d.prepare("SELECT COUNT(*) n FROM ai_learning_events WHERE id=?").get(a.eventId).n,1);
});
