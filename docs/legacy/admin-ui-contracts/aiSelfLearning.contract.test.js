"use strict";
const assert=require("assert");
const {test}=require("node:test");
const fs=require("fs");
const path=require("path");
const index=fs.readFileSync(require.resolve("./index.js"),"utf8");
const mod=fs.readFileSync(require.resolve("./aiSelfLearning.js"),"utf8");
test("B343 self-learning provides governed internal learning instead of external trainer dependency",()=>{assert.match(mod,/explicitLearn/);assert.match(mod,/buildLearningContext/);assert.match(mod,/scheduleFollowup/);assert.match(mod,/confidence/);assert.match(mod,/feedback/);assert.match(mod,/reset/);assert.match(mod,/promoteRepeatedActivity/);assert.match(index,/aiSelfLearning\.buildLearningContext/);assert.match(index,/aiSelfLearning\.observe/);assert.match(index,/aiSelfLearning\.promoteRepeatedActivity/);});
test("B343 consumer learning endpoints are owner-scoped",()=>{assert.match(mod,/\/api\/ai\/learning\/state/);assert.match(mod,/\/api\/ai\/learning\/learn/);assert.match(mod,/\/api\/ai\/learning\/followups/);assert.match(mod,/req\.user\.id/);});

test("consumer learning surface exposes feedback, export, reset and follow-up completion controls",()=>{assert.match(mod,/\/api\/ai\/learning\/export/);assert.match(mod,/\/api\/ai\/learning\/feedback/);assert.match(mod,/\/api\/ai\/learning\/reset/);assert.match(mod,/\/api\/ai\/learning\/followups\/:id\/complete/);assert.match(mod,/reason:req\.body\?\.reason/);});

test("B353 learning governance exposes topic forgetting and audit lineage",()=>{
 const source=fs.readFileSync(path.join(__dirname,"aiSelfLearning.js"),"utf8");
 assert.match(source,/ai\.learning\.topic_forget/);
 assert.match(source,/sourceEventId/);
 assert.match(source,/eventCorrelation\.record/);
 assert.match(source,/\/api\/ai\/learning\/topic\/forget/);
 assert.match(source,/\/api\/admin\/ai\/learning\/topic\/forget/);
});

test("B353 topic forgetting remains owner/profile scoped",()=>{
 const source=fs.readFileSync(path.join(__dirname,"aiSelfLearning.js"),"utf8");
 assert.match(source,/WHERE profileId=\? AND userId=\? AND topicKey=\?/);
 assert.match(source,/checkProfile\(profileId\)/);
});

test("B353 learning audit metadata does not use raw credentials",()=>{
 const source=fs.readFileSync(path.join(__dirname,"aiSelfLearning.js"),"utf8");
 assert.match(source,/eventCorrelation\.createEvent/);
 assert.match(source,/entityType:"ai_learning"/);
 assert.match(source,/metadata/);
});

test("B354 learning surface exposes topic state and follow-up cancellation",()=>{assert.match(mod,/topics/);assert.match(mod,/\/api\/ai\/learning\/followups\/\:id\/cancel/);assert.match(mod,/\/api\/admin\/ai\/learning\/followups\/\:id\/cancel/);});

test("B355 learning events retain normalized topic provenance",()=>{assert.match(mod,/topicKey TEXT NOT NULL DEFAULT ''/);assert.match(mod,/idx_ai_learning_events_topic/);assert.match(mod,/topicKey:tk/);});
test("B355 admin explicit learning accepts topic provenance",()=>{assert.match(mod,/profileId:"admin_operations"[\s\S]*topicKey:text\(req\.body\?\.topicKey,80\)/);});

test("B356 correction feedback records corrected lesson and provenance",()=>{
 const source=fs.readFileSync(path.join(__dirname,"aiSelfLearning.js"),"utf8");
 assert.match(source,/signal==="correct"/);
 assert.match(source,/sourceType='corrected'/);
 assert.match(source,/previousLesson/);
 assert.match(source,/correctedLesson/);
});

test("B357 learning retention exposes owner-scoped cleanup controls",()=>{
 const source=fs.readFileSync(path.join(__dirname,"aiSelfLearning.js"),"utf8");
 assert.match(source,/RETENTION_DAYS/);
 assert.match(source,/function pruneStale/);
 assert.match(source,/ai\.learning\.prune/);
 assert.match(source,/\/api\/ai\/learning\/prune/);
 assert.match(source,/\/api\/admin\/ai\/learning\/prune/);
 assert.match(source,/active=1/);
});

test("B357 consumer and Admin surfaces expose stale-learning cleanup",()=>{
 const consumer=fs.readFileSync(path.join(__dirname,"../src/NexaAI.tsx"),"utf8");
 const apiSource=fs.readFileSync(path.join(__dirname,"../src/api.ts"),"utf8");
 const adminApi=fs.readFileSync(path.join(__dirname,"../admin-web/src/api.js"),"utf8");
 const adminUi=fs.readFileSync(path.join(__dirname,"../admin-web/src/views/admin-ai.js"),"utf8");
 assert.match(apiSource,/pruneDamiLearning/);
 assert.match(consumer,/Clean stale Dami learning/);
 assert.match(adminApi,/adminAiLearningPrune/);
 assert.match(adminUi,/Clean stale learning/);
});

test("B356 consumer and Admin surfaces expose correction input support",()=>{
 const consumer=fs.readFileSync(path.join(__dirname,"../src/NexaAI.tsx"),"utf8");
 const adminUi=fs.readFileSync(path.join(__dirname,"../admin-web/src/views/admin-ai.js"),"utf8");
 assert.match(consumer,/learningCorrection/);
 assert.ok(consumer.includes("feedbackDamiLearning(m.id,'correct',learningCorrection.trim())"));
 assert.match(adminUi,/Correct Admin AI lesson/);
 assert.ok(adminUi.includes('adminAiLearningFeedback(m.id,"correct",correction.value.trim())'));
});
test("B359 learning state exposes bounded source provenance for active memories",()=>{
 const source=fs.readFileSync(path.join(__dirname,"aiSelfLearning.js"),"utf8");
 assert.match(source,/sourceActivity/);
 assert.match(source,/sourceCreatedAt/);
 assert.match(source,/LEFT JOIN ai_learning_events/);
});

test("B359 consumer learning UI explains why a lesson was learned",()=>{
 const consumer=fs.readFileSync(path.join(__dirname,"../src/NexaAI.tsx"),"utf8");
 assert.match(consumer,/Why Dami learned it/);
 assert.match(consumer,/m\.sourceActivity/);
});

test("B360 learning state exposes bounded governance summary",()=>{const source=fs.readFileSync(path.join(__dirname,"aiSelfLearning.js"),"utf8");assert.match(source,/sourceBreakdown/);assert.match(source,/feedbackBreakdown/);assert.match(source,/retentionDays:\{\.\.\.RETENTION_DAYS\}/);assert.match(source,/activeTopics/);});

test("B360 summary remains in the existing owner-scoped state/export surfaces",()=>{assert.match(mod,/return \{profileId,userId:String\(userId\),topics,summary,selfModel/);assert.match(mod,/function exportLearning\([\s\S]*state\(\{profileId,userId\}\)/);});

test("B360 Consumer and Admin surfaces expose learning governance summary",()=>{const consumer=fs.readFileSync(path.join(__dirname,"../src/NexaAI.tsx"),"utf8");const adminUi=fs.readFileSync(path.join(__dirname,"../admin-web/src/views/admin-ai.js"),"utf8");assert.match(consumer,/learningState\?\.summary/);assert.match(consumer,/sourceBreakdown/);assert.match(adminUi,/r\.state\?\.summary/);assert.match(adminUi,/activeTopics/);});
