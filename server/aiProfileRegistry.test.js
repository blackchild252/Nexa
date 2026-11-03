"use strict";
const test=require("node:test");const assert=require("node:assert/strict");
const {getAiProfile,resolveAiModel,PROFILE_IDS}=require("./aiProfileRegistry");

test("registry exposes isolated consumer and admin profiles without secrets",()=>{
 const env={NEXA_AI_CONSUMER_MODEL:"consumer-ft-v1",NEXA_AI_ADMIN_MODEL:"admin-ft-v1",DAMI_AI_PROVIDER:"grok"};
 const c=getAiProfile(PROFILE_IDS.CONSUMER,env),a=getAiProfile(PROFILE_IDS.ADMIN,env);
 assert.equal(c.id,"consumer_dami");assert.equal(a.id,"admin_operations");assert.equal(c.model,"consumer-ft-v1");assert.equal(a.model,"admin-ft-v1");assert.notEqual(c.id,a.id);assert.doesNotMatch(JSON.stringify(c),/KEY|SECRET|TOKEN/i);
});
test("registry safely falls back to base model when fine-tuned reference is absent",()=>{
 const env={XAI_MODEL:"grok-base"};assert.equal(resolveAiModel("consumer_dami",env),"grok-base");assert.equal(resolveAiModel("admin_operations",env),"grok-base");
});
test("candidate profile is opt-in and rollback metadata is validated",()=>{
 const p=getAiProfile("consumer_dami",{NEXA_AI_CONSUMER_MODEL:"base",NEXA_AI_CONSUMER_CANDIDATE_MODEL:"candidate",NEXA_AI_CONSUMER_PROFILE_VERSION:"2",NEXA_AI_CONSUMER_ROLLBACK_MODEL:"previous"});
 assert.equal(p.model,"base");assert.equal(p.candidateModel,"candidate");assert.equal(p.rollbackModel,"previous");assert.equal(p.version,"2");
});
test("registry uses a server-promoted model when lifecycle state exists",()=>{const {DatabaseSync}=require("node:sqlite");const raw=new DatabaseSync(":memory:");const db={exec:x=>raw.exec(x),prepare:x=>raw.prepare(x)};db.exec("CREATE TABLE ai_profile_versions(id TEXT PRIMARY KEY,profileId TEXT,model TEXT,version TEXT,state TEXT,evaluation TEXT,rollbackId TEXT,createdAt TEXT)");db.prepare("INSERT INTO ai_profile_versions VALUES(?,?,?,?,?,?,?,?)").run("1","consumer_dami","server-ft","9","promoted","{}",null,"2026-01-01T00:00:00Z");assert.equal(resolveAiModel("consumer_dami",{XAI_MODEL:"base"},{db}),"server-ft");});
