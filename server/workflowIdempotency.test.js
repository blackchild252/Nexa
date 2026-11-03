"use strict";
const test=require("node:test"); const assert=require("node:assert/strict"); const fs=require("node:fs"); const path=require("node:path");
const src=fs.readFileSync(path.join(__dirname,"aiHub.js"),"utf8");
test("workflow execution requires an idempotency key and persists it atomically",()=>{
 assert.match(src,/Idempotency-Key/); assert.match(src,/ai_workflow_idempotency/); assert.match(src,/INSERT OR IGNORE INTO ai_workflow_idempotency/); assert.match(src,/db\.transaction/);
});
test("duplicate workflow execution returns the prior result",()=>assert.match(src,/idempotent:true/));
