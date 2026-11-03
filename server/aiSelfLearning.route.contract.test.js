"use strict";
const assert=require("assert");
const {test}=require("node:test");
const fs=require("fs");
const src=fs.readFileSync(require.resolve("./aiSelfLearning.js"),"utf8");
test("adaptive learning exposes owner-scoped state, export, feedback and reset routes",()=>{assert.match(src,/\/api\/ai\/learning\/state/);assert.match(src,/\/api\/ai\/learning\/export/);assert.match(src,/\/api\/ai\/learning\/feedback/);assert.match(src,/\/api\/ai\/learning\/reset/);assert.match(src,/\/api\/admin\/ai\/learning\/state/);assert.match(src,/\/api\/admin\/ai\/learning\/export/);assert.match(src,/\/api\/admin\/ai\/learning\/feedback/);assert.match(src,/\/api\/admin\/ai\/learning\/reset/);assert.match(src,/\/api\/ai\/learning\/pause/);assert.match(src,/\/api\/admin\/ai\/learning\/pause/);assert.match(src,/roleOf\?\.\(req\.user\)==="owner"/);});
