"use strict";
const assert=require("assert");
const {test}=require("node:test");
const {DatabaseSync}=require("node:sqlite");
const {createAiTrainingJobs}=require("./aiTrainingJobs");
function db(){return new DatabaseSync(":memory:");}
const sample=[{profileId:"consumer_dami",provenance:"test",version:"2",input:{prompt:"What is Aami?"},output:"Aami is the NEXA reward currency."}];
test("training jobs prepare a sanitized provider-neutral package with a stable hash",()=>{const j=createAiTrainingJobs(db()).prepare({profileId:"consumer_dami",dataset:sample,datasetVersion:"2"});assert.equal(j.state,"prepared");assert.equal(j.exampleCount,1);assert.equal(j.packageHash.length,64);assert.equal(j.provider,"provider-neutral");});
test("training job transitions are bounded and passing evaluation can succeed",()=>{const jobs=createAiTrainingJobs(db()),j=jobs.prepare({profileId:"admin_operations",dataset:[{profileId:"admin_operations",provenance:"test",input:{q:"approval"},output:"approval"}]});assert.throws(()=>jobs.transition(j.jobId,"succeeded"),/cannot move/);jobs.transition(j.jobId,"submitted");jobs.transition(j.jobId,"running");const e={passed:true,threshold:.9,metrics:{total:1,passed:1,failed:0,passRate:1}};const done=jobs.persistEvaluation(j.jobId,e,"admin-ft-candidate");assert.equal(done.state,"succeeded");assert.equal(done.candidateModel,"admin-ft-candidate");});
test("profiles cannot share a training job",()=>assert.throws(()=>createAiTrainingJobs(db()).prepare({profileId:"consumer_dami",dataset:[sample[0],{...sample[0],profileId:"admin_operations"}]}),/one AI profile/));
