"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { validateSteps } = require("./aiHubValidation");
test("workflow accepts supported local task and note steps",()=>{
 const r=validateSteps([{type:"create_task",title:"Call supplier"},{type:"save_note",content:"Ask for updated quote"}]);
 assert.equal(r.error,undefined); assert.equal(r.value.length,2); assert.equal(r.value[0].title,"Call supplier");
});
test("workflow rejects unsupported or unsafe step types",()=>{
 assert.match(validateSteps([{type:"transfer_money",title:"Send money"}]).error,/Only create_task/);
});
test("workflow rejects empty and oversized step lists",()=>{
 assert.ok(validateSteps([]).error); assert.ok(validateSteps(Array.from({length:21},()=>({type:"save_note",content:"x"}))).error);
});
test("workflow rejects blank step content",()=>{assert.ok(validateSteps([{type:"save_note",content:"  "}]).error);});
