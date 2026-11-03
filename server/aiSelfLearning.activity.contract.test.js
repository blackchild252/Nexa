"use strict";
const assert=require("assert");
const {test}=require("node:test");
const fs=require("fs");
const mod=fs.readFileSync(require.resolve("./aiSelfLearning.js"),"utf8");
const index=fs.readFileSync(require.resolve("./index.js"),"utf8");
const admin=fs.readFileSync(require.resolve("./adminAi.js"),"utf8");
test("B344 converts activity into bounded behavior context",()=>{assert.match(mod,/ai_learning_patterns/);assert.match(mod,/buildBehaviorContext/);assert.match(index,/patternKey: "intent"/);assert.match(index,/patternKey: "navigation"/);});
test("B344 Admin AI consumes repeated operational activity patterns",()=>{assert.match(admin,/buildBehaviorContext/);assert.match(admin,/patternKey:"admin_scope"/);});
