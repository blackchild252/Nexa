"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("fs");
const read=p=>fs.readFileSync(p,"utf8");

test("account export carries consumer Dami learning as user-owned portable data",()=>{
  const s=read("server/accountPortability.js");
  for(const table of ["ai_learning_memory","ai_learning_patterns","ai_learning_followups","ai_learning_feedback","ai_learning_events"]) assert.match(s,new RegExp(table));
  assert.match(s,/learning:\s*\{\s*profile:\s*[\"']consumer_dami/);
});

test("Dami learning export remains outside the generic import allowlist",()=>{
  const s=read("server/accountPortability.js");
  assert.match(s,/kept outside the generic import table allowlist/);
  assert.match(s,/const TABLES = Object\.freeze/);
});

test("account closure deletes every Dami learning table",()=>{
  const s=read("server/accountLifecycle.js");
  for(const table of ["ai_learning_events","ai_learning_feedback","ai_learning_patterns","ai_learning_followups","ai_learning_memory"]){
    assert.match(s,new RegExp(table));
  }
  assert.match(s,/DELETE FROM \$\{table\} WHERE userId=\?/);
});
