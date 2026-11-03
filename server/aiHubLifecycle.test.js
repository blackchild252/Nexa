"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const src=fs.readFileSync(require("node:path").join(__dirname,"aiHub.js"),"utf8");

test("AI workspace exposes owner-scoped lifecycle operations",()=>{
  for(const route of ["/api/ai/workflows/:id","/api/ai/tasks/:id","/api/ai/knowledge/:id","/api/ai/notes/:id"]){ assert.match(src,new RegExp(route.replace(/[/:]/g,m=>"\\"+m))); }
  assert.match(src,/DELETE FROM ai_workflow_runs WHERE workflowId=\? AND userId=\?/);
  assert.match(src,/WHERE id=\? AND userId=\?/);
});

test("workflow lifecycle keeps explicit confirmation on execution",()=>{
  assert.match(src,/validateActionConfirmations/);
  assert.match(src,/req.body\?\.confirmed/);
  assert.match(src,/confirmedActions/);
  assert.match(src,/Invalid workflow status/);
});
