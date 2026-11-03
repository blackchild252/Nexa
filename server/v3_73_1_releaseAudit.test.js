"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("V3.73.1 release contracts are recorded",()=>{
 const roadmap=read("MASTER_ROADMAP.md");
 assert.match(roadmap,/34\. \[COMPLETED V3\.73\.1\]/);
 assert.match(roadmap,/35\. \[COMPLETED V3\.73\.1\]/);
 assert.match(roadmap,/36\. \[COMPLETED V3\.73\.1\]/);
});

