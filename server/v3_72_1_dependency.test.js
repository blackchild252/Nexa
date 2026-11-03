"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const root=path.join(__dirname,"..");

test("dependency preflight enforces reproducibility prerequisites without pretending missing infrastructure is installed",()=>{
  const r=spawnSync(process.execPath,[path.join(root,"scripts/dependency-preflight.mjs")],{cwd:root,encoding:"utf8"});
  assert.ok([0,2].includes(r.status));
  const result=JSON.parse(r.stdout);
  assert.match(result.version,/^\d+\.\d+\.\d+$/);
  assert.equal(result.checks.find(c=>c.name==='packageManager is npm@10.9.2').ok,true);
  assert.equal(result.checks.find(c=>c.name==='Node runtime satisfies package engines (>=20.19.0)').ok,true);
  assert.ok(result.checks.some(c=>c.name==='package-lock.json present'));
  if(!fs.existsSync(path.join(root,'package-lock.json'))) assert.equal(result.reproducible,false);
});

test("root and server dependency manifests stay aligned",()=>{
  const rootPkg=require(path.join(root,"package.json"));
  const serverPkg=require(path.join(root,"server/package.json"));
  for(const [name,version] of Object.entries(serverPkg.dependencies)) assert.equal(rootPkg.dependencies[name],version,name);
});
