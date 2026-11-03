"use strict";
const test=require("node:test");const assert=require("node:assert/strict");
const {generateDamiText}=require("./damiTextProvider");
test("Dami resolves the consumer profile model before provider execution",async()=>{let seen=null;const r=await generateDamiText({input:"hello",env:{XAI_API_KEY:"x",XAI_MODEL:"base",NEXA_AI_CONSUMER_MODEL:"consumer-ft-v2"},dependencies:{grokAdapter:{async generateText(o){seen=o;return{text:"ok",provider:"openai",model:o.model};}}}});assert.equal(seen.model,"consumer-ft-v2");assert.equal(r.model,"consumer-ft-v2");});
test("Dami keeps explicit confirmation and server-side action boundaries outside the model profile",()=>{const src=require("fs").readFileSync(require("path").join(__dirname,"damiTextProvider.js"),"utf8");assert.match(src,/consumer_dami/);assert.doesNotMatch(src,/authorize|grantCapability|bypass/);});
