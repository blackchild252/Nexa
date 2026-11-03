"use strict";
const { test }=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=n=>fs.readFileSync(path.join(root,n),"utf8");

test("current release metadata is synchronized",()=>{
 const expected=JSON.parse(read("package.json")).version;
 for(const f of ["package.json","app.json"]) assert.equal(JSON.parse(read(f)).version,expected,f);
 assert.equal(JSON.parse(read("server/package.json")).version,expected);
 assert.match(read("VERSION.md"),new RegExp("\\*\\*Current (?:release|Version):\\*\\*\\s*V?"+expected.replace(/\./g,"\\.")+"(?:\\*\\*)?"));
});
test("V3.69.1 cross-module E2E/security contracts are present",()=>{assert.match(read("server/v3_69_1_crossModuleSecurity.test.js"),/cross-module consequential boundaries/);assert.match(read("server/v3_69_1_crossModuleSecurity.test.js"),/sensitive lookups retain explicit ownership/);});
test("V3.69.1 notification recovery is wired",()=>{const d=read("server/notificationDelivery.js"),i=read("server/index.js");assert.match(d,/status='sending'/);assert.match(d,/recoverStaleSending/);assert.match(i,/notificationDelivery\.recoverStaleSending/);});
