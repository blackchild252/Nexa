"use strict";
const test=require("node:test");const assert=require("node:assert/strict");const fs=require("node:fs");const path=require("node:path");
test("Admin AI route is server-guarded and uses the Admin Operations profile",()=>{const src=fs.readFileSync(path.join(__dirname,"adminAi.js"),"utf8");assert.match(src,/\/api\/admin\/ai\/assist/);assert.match(src,/Administrator or assigned Staff access required/);assert.match(src,/admin_operations/);assert.match(src,/active=1/);assert.doesNotMatch(src,/req\.body\?\.role/);});
