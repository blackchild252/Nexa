"use strict";
const assert=require("assert");
const {test}=require("node:test");
const {createAiSelfLearning}=require("./aiSelfLearning");
const {DatabaseSync}=require("node:sqlite");
function db(){return new DatabaseSync(":memory:");}
test("repeated activity becomes bounded adaptive behavior context",()=>{const d=db(),s=createAiSelfLearning(d);s.observe({profileId:"consumer_dami",userId:"u1",activity:"opened yaayz",patternKey:"navigation",patternValue:"yaayz"});s.observe({profileId:"consumer_dami",userId:"u1",activity:"opened yaayz",patternKey:"navigation",patternValue:"yaayz"});const patterns=s.buildBehaviorContext({profileId:"consumer_dami",userId:"u1"});assert.equal(patterns.length,1);assert.equal(patterns[0].patternValue,"yaayz");assert.equal(patterns[0].count,2);});
test("behavior patterns remain isolated by profile and owner",()=>{const d=db(),s=createAiSelfLearning(d);s.observe({profileId:"consumer_dami",userId:"u1",activity:"a",patternKey:"intent",patternValue:"shopping"});s.observe({profileId:"consumer_dami",userId:"u1",activity:"a",patternKey:"intent",patternValue:"shopping"});s.observe({profileId:"admin_operations",userId:"u1",activity:"a",patternKey:"admin_scope",patternValue:"payment_review"});s.observe({profileId:"admin_operations",userId:"u1",activity:"a",patternKey:"admin_scope",patternValue:"payment_review"});assert.equal(s.buildBehaviorContext({profileId:"consumer_dami",userId:"u1"})[0].patternValue,"shopping");assert.equal(s.buildBehaviorContext({profileId:"admin_operations",userId:"u1"})[0].patternValue,"payment_review");});
