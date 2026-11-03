"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("Expo Router remains the sole active package entrypoint",()=>{
 const pkg=require(path.join(root,"package.json")); assert.equal(pkg.main,"expo-router/entry"); assert.ok(fs.existsSync(path.join(root,"src/app/_layout.tsx")));
});

test("active route tree has no imports into quarantined legacy app shell",()=>{
 const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
 const violations=[];
 for(const f of walk(path.join(root,"src/app")).filter(f=>/\.(tsx?|jsx?)$/.test(f))){const s=fs.readFileSync(f,"utf8");if(/from\s+['"][^'"]*\bapp\//.test(s)||/import\([^)]*\bapp\//.test(s))violations.push(path.relative(root,f));}
 assert.deepEqual(violations,[]);
});

test("legacy shell is retired; the architecture note still says it was never an active route surface",()=>{const d=read("ARCHITECTURE_RECONCILIATION_V3_60_41.md");assert.ok(!fs.existsSync(path.join(root,"app")));assert.match(d,/not an active route surface/);assert.match(d,/New screens\/routes must be added under `src\/app\//);});
