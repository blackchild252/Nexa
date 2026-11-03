"use strict";
const crypto = require("crypto");
const { validateTrainingDataset } = require("./aiTrainingData");
const { evaluateAiProfile } = require("./aiEvaluation");
const PROFILES = new Set(["consumer_dami", "admin_operations"]);
const STATES = new Set(["prepared", "submitted", "running", "succeeded", "failed", "cancelled"]);
const TRANSITIONS = {
  prepared: new Set(["submitted", "cancelled"]),
  submitted: new Set(["running", "failed", "cancelled"]),
  running: new Set(["succeeded", "failed", "cancelled"]),
  succeeded: new Set([]),
  failed: new Set([]),
  cancelled: new Set([]),
};
function now(){return new Date().toISOString();}
function id(){return crypto.randomUUID();}
function createAiTrainingJobs(db){
  db.exec(`CREATE TABLE IF NOT EXISTS ai_training_jobs (
    id TEXT PRIMARY KEY, profileId TEXT NOT NULL, datasetVersion TEXT NOT NULL,
    provider TEXT NOT NULL, baseModel TEXT NOT NULL, state TEXT NOT NULL,
    packageHash TEXT NOT NULL, exampleCount INTEGER NOT NULL, candidateModel TEXT,
    evaluation TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_ai_training_jobs_profile_created ON ai_training_jobs(profileId,createdAt DESC);`);
  const checkProfile=p=>{if(!PROFILES.has(p)) throw new Error("Unknown AI profile.");};
  const checkState=s=>{if(!STATES.has(s)) throw new Error("Invalid training job state.");};
  function prepare({profileId,dataset,provider="provider-neutral",baseModel="configured-base",datasetVersion="1"}={}){
    checkProfile(profileId); const clean=validateTrainingDataset(dataset); const version=String(datasetVersion||"1").trim();
    const payload=JSON.stringify({profileId,datasetVersion:version,cases:clean});
    const packageHash=crypto.createHash("sha256").update(payload).digest("hex"); const ts=now(), jobId=id();
    db.prepare("INSERT INTO ai_training_jobs(id,profileId,datasetVersion,provider,baseModel,state,packageHash,exampleCount,candidateModel,evaluation,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(jobId,profileId,version,String(provider).slice(0,80),String(baseModel).slice(0,160),"prepared",packageHash,clean.length,null,null,ts,ts);
    return {jobId,profileId,datasetVersion:version,provider,baseModel,state:"prepared",packageHash,exampleCount:clean.length,trainingData:clean};
  }
  function get(jobId){const row=db.prepare("SELECT * FROM ai_training_jobs WHERE id=?").get(jobId);if(!row) return null;return {...row,evaluation:row.evaluation?JSON.parse(row.evaluation):null};}
  function transition(jobId,state,{candidateModel=null,evaluation=null}={}){
    const row=db.prepare("SELECT * FROM ai_training_jobs WHERE id=?").get(jobId);if(!row) throw new Error("Training job not found.");checkState(state);
    if(!TRANSITIONS[row.state]?.has(state)) throw new Error(`Training job cannot move from ${row.state} to ${state}.`);
    const ts=now();db.prepare("UPDATE ai_training_jobs SET state=?,candidateModel=?,evaluation=?,updatedAt=? WHERE id=?")
      .run(state,candidateModel?String(candidateModel).slice(0,200):row.candidateModel,evaluation?JSON.stringify(evaluation):row.evaluation,ts,jobId);return get(jobId);
  }
  function list(profileId){if(profileId)checkProfile(profileId);const rows=db.prepare(`SELECT * FROM ai_training_jobs ${profileId?"WHERE profileId=?":""} ORDER BY createdAt DESC LIMIT 100`).all(...(profileId?[profileId]:[]));return rows.map(r=>({...r,evaluation:r.evaluation?JSON.parse(r.evaluation):null}));}
  function evaluate(jobId,cases,{invoke,threshold=.9,datasetVersion}={}){
    const row=get(jobId);if(!row)throw new Error("Training job not found.");if(row.state!=="prepared"&&row.state!=="running"&&row.state!=="succeeded")throw new Error("Only active training jobs can be evaluated.");
    return evaluateAiProfile(row.profileId,{model:row.candidateModel||"candidate",jobId},cases,{invoke,threshold,datasetVersion:datasetVersion||row.datasetVersion});
  }
  function persistEvaluation(jobId,evaluation,candidateModel){const row=get(jobId);if(!row)throw new Error("Training job not found.");if(!evaluation?.passed)throw new Error("A passing evaluation is required before a candidate can succeed.");return transition(jobId,"succeeded",{candidateModel,evaluation});}
  return {prepare,get,transition,list,evaluate,persistEvaluation};
}
module.exports={createAiTrainingJobs,PROFILES,STATES};
