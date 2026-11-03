"use strict";
const assert=require("assert");
const {test}=require("node:test");const fs=require("fs");const path=require("path");
test("Admin AI training routes are owner-gated and separate from ordinary Admin AI assistance",()=>{const src=fs.readFileSync(path.join(__dirname,"adminAiTraining.js"),"utf8");assert.match(src,/admin\.require\("admins"\)/);assert.match(src,/ai_training_prepare/);assert.match(src,/ai_profile_promote/);assert.match(src,/ai_profile_rollback/);assert.match(src,/validateTrainingDataset/);});
test("AI profile lifecycle exposes bounded history",()=>{const src=fs.readFileSync(path.join(__dirname,"aiProfileLifecycle.js"),"utf8");assert.match(src,/ORDER BY createdAt DESC LIMIT 100/);});
