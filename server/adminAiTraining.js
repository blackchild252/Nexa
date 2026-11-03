"use strict";
const fs=require("fs");
const path=require("path");
const {createAiTrainingJobs}=require("./aiTrainingJobs");
const {createAiProfileLifecycle}=require("./aiProfileLifecycle");
const {validateTrainingDataset}=require("./aiTrainingData");
const {PROFILE_IDS}=require("./aiProfileRegistry");
function readDataset(profileId){const file=profileId===PROFILE_IDS.CONSUMER?"consumer-dami.json":"admin-operations.json";const raw=JSON.parse(fs.readFileSync(path.join(__dirname,"ai-evals",file),"utf8"));return raw;}
function registerAdminAiTraining({app,auth,admin,db}={}){
 const jobs=createAiTrainingJobs(db), lifecycle=createAiProfileLifecycle(db), owner=admin.require("admins");
 app.get("/api/admin/ai/profiles",auth.authMiddleware,owner,(req,res)=>{
  const profiles=Object.values(PROFILE_IDS).map(profileId=>({profileId,current:lifecycle.getCurrent(profileId),jobs:jobs.list(profileId).slice(0,10)}));res.json({profiles});
 });
 app.post("/api/admin/ai/training/prepare",auth.authMiddleware,owner,(req,res)=>{
  try{const profileId=String(req.body?.profileId||"");const source=readDataset(profileId);const dataset=validateTrainingDataset(source.cases.map(c=>({profileId,provenance:source.provenance,version:source.version,input:c.input,output:c.expected})));const result=jobs.prepare({profileId,dataset,datasetVersion:source.version,provider:String(req.body?.provider||"provider-neutral"),baseModel:String(req.body?.baseModel||"configured-base")});admin.audit(req,"admin_ai_training_prepare","ai_training_job",result.jobId,`${profileId} dataset ${source.version}`);res.status(201).json({job:result});}catch(e){res.status(400).json({error:e.message});}
 });
 app.get("/api/admin/ai/training/:id",auth.authMiddleware,owner,(req,res)=>{const job=jobs.get(req.params.id);if(!job)return res.status(404).json({error:"Training job not found."});res.json({job});});
 app.post("/api/admin/ai/training/:id/state",auth.authMiddleware,owner,(req,res)=>{try{const state=String(req.body?.state||"");const job=jobs.transition(req.params.id,state,{candidateModel:req.body?.candidateModel});admin.audit(req,"admin_ai_training_state","ai_training_job",job.id,`state=${state}`);res.json({job});}catch(e){res.status(409).json({error:e.message});}});
 app.post("/api/admin/ai/training/:id/evaluation",auth.authMiddleware,owner,(req,res)=>{try{const job=jobs.get(req.params.id);if(!job)return res.status(404).json({error:"Training job not found."});const evaluation=req.body?.evaluation;if(!evaluation||typeof evaluation!="object")return res.status(400).json({error:"Evaluation result is required."});if(evaluation.passed!==true)return res.status(400).json({error:"Only a passing evaluation may complete a candidate job."});const saved=jobs.persistEvaluation(job.id,evaluation,req.body?.candidateModel||job.candidateModel);admin.audit(req,"admin_ai_training_evaluated","ai_training_job",job.id,`candidate=${saved.candidateModel||"unknown"}`);res.json({job:saved});}catch(e){res.status(409).json({error:e.message});}});
 app.post("/api/admin/ai/profiles/:profileId/promote",auth.authMiddleware,owner,(req,res)=>{try{const profileId=String(req.params.profileId);const job=jobs.get(String(req.body?.jobId||""));if(!job||job.profileId!==profileId||job.state!=="succeeded")return res.status(409).json({error:"A succeeded training job for this profile is required."});const result=lifecycle.promoteAiProfile(profileId,{model:job.candidateModel,version:`job-${job.id}`},job.evaluation);admin.audit(req,"admin_ai_profile_promote","ai_profile",profileId,`job=${job.id} model=${result.model}`);res.json({profile:result});}catch(e){res.status(409).json({error:e.message});}});
 app.post("/api/admin/ai/profiles/:profileId/rollback",auth.authMiddleware,owner,(req,res)=>{try{const result=lifecycle.rollbackAiProfile(String(req.params.profileId));admin.audit(req,"admin_ai_profile_rollback","ai_profile",result.profileId,`restored=${result.model}`);res.json({profile:result});}catch(e){res.status(409).json({error:e.message});}});
 return {jobs,lifecycle};
}
module.exports={registerAdminAiTraining};
