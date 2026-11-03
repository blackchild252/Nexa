"use strict";
const assert=require("assert");
const {test}=require("node:test");
const api=require("fs").readFileSync(require.resolve("../src/api.ts"),"utf8");
test("B349 consumer API exposes Dami learning helpers and the consumer transport",()=>{
  for(const name of ["authedFetch","getDamiLearningState","exportDamiLearning","teachDami","scheduleDamiFollowup","completeDamiFollowup","cancelDamiFollowup","feedbackDamiLearning","resetDamiLearning"]) assert.match(api,new RegExp(`(?:export (?:async )?function|export const)\\s+${name}\\b`));
  for(const route of ["/api/ai/learning/state","/api/ai/learning/export","/api/ai/learning/learn","/api/ai/learning/followups","/api/ai/learning/followups/","/api/ai/learning/feedback","/api/ai/learning/reset"]) assert.match(api,new RegExp(route.replaceAll('/','\\/')));
});
