"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { normalizePlan, summarizeSpecialist, MAX_STEPS } = require("./damiOrchestrator");

test("Dami orchestration accepts open-ended model plans without phrase matching", () => {
  const plan = normalizePlan({ intent:"mall", confidence:.93, entities:{product:"running shoes", amount:150000}, constraints:{budget:{max:150000}}, steps:[
    {intent:"mall", purpose:"find matching products", specialistPayload:{action:"search",query:"running shoes",maxPrice:150000}},
    {intent:"scamcheck", purpose:"assess seller signals", dependsOn:[0], specialistPayload:{text:"seller details"}},
  ]});
  assert.equal(plan.chain, true); assert.equal(plan.steps.length, 2); assert.equal(plan.entities.product, "running shoes"); assert.deepEqual(plan.steps[1].dependsOn,[0]);
});

test("Dami orchestration caps model chains and rejects unknown capabilities", () => {
  const plan = normalizePlan({intent:"not-real",steps:Array.from({length:MAX_STEPS+3},()=>({intent:"general"}))});
  assert.equal(plan.intent,"general"); assert.equal(plan.steps.length,MAX_STEPS);
});

test("open-ended entities and constraints are bounded without phrase lists", () => {
  const plan = normalizePlan({intent:"shopping",entities:{product:"red running shoes",brand:"any",junk:Array(30).fill("x")},constraints:{budget:{max:100000},size:"42",location:"Lagos"},clarification:{needed:true,question:"Which size?",missing:["size"]},followUpContext:"Earlier you wanted something durable."});
  assert.equal(plan.entities.product,"red running shoes"); assert.equal(plan.constraints.size,"42"); assert.equal(plan.clarification.needed,true); assert.deepEqual(plan.clarification.missing,["size"]); assert.equal(plan.followUpContext,"Earlier you wanted something durable.");
});

test("specialist summaries are compact and structured for downstream orchestration", () => {
  const out = JSON.parse(summarizeSpecialist("mall",{type:"mall_products",products:[{id:"p1",name:"Lamp",price:100,currency:"NGN",vendorName:"Shop",category:"home"}]}));
  assert.equal(out.count,1); assert.equal(out.products[0].name,"Lamp");
});
