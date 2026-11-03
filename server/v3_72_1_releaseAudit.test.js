"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("V3.72.1 release contracts are recorded in the roadmap and readiness boundary",()=>{const roadmap=read("MASTER_ROADMAP.md");for(const x of [31,32,33])assert.match(roadmap,new RegExp(`\\[COMPLETED V3\\.72\\.1\\].*`));assert.match(read("RELEASE_READINESS_V3_72_1.md"),/Application-testable gates/);});

test("release audit script uses current package version",()=>{const s=read("scripts/release-audit.mjs");assert.match(s,/const requiredVersion = pkg\.version/);assert.doesNotMatch(s,/pkg\.version!==['"]3\.63\.1/);});
