"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("release metadata stays synchronized across package lock and theme",()=>{
 const pkg=JSON.parse(read("package.json"));
 const lock=JSON.parse(read("package-lock.json"));
 const server=JSON.parse(read("server/package.json"));
 const expo=JSON.parse(read("app.json"));
 const theme=read("src/theme.ts");
 assert.match(pkg.version,/^\d+\.\d+\.\d+$/);
 assert.equal(lock.version,pkg.version);
 assert.equal(lock.packages[""].version,pkg.version);
 assert.equal(server.version,pkg.version);
 assert.equal(expo.expo.version,pkg.version);
 assert.match(theme,new RegExp(`release:\\s*['"]${pkg.version.replaceAll(".","\\.")}['"]`));
});

test("release audit enforces package-lock and theme release synchronization",()=>{
 const audit=read("scripts/release-audit.mjs");
 assert.match(audit,/package-lock version drift/);
 assert.match(audit,/theme release version drift/);
});
