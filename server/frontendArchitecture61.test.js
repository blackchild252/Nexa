"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const architecture=fs.readFileSync(path.join(root,"FRONTEND_ARCHITECTURE_V3_61_3.md"),"utf8");
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}

test("frontend route ownership is explicit for every active route file",()=>{
  for(const route of ["src/app/_layout.tsx","src/app/(tabs)/_layout.tsx","src/app/(tabs)/index.tsx","src/app/(tabs)/money.tsx","src/app/(tabs)/zeeza.tsx","src/app/(tabs)/marketplace.tsx","src/app/dami.tsx","src/app/dami.tsx","src/app/(tabs)/profile.tsx","src/app/extensions.tsx","src/app/developer.tsx","src/app/staff.tsx","src/app/zeeza/inbox.tsx"]) assert.ok(fs.existsSync(path.join(root,route)),`missing active route ${route}`);
  for(const route of ["/(tabs)","/(tabs)/money","/(tabs)/zeeza","/(tabs)/marketplace","/dami","/dami","/(tabs)/extensions","/developer","/extensions","/staff","/profile","/zeeza/inbox"]) assert.match(architecture,new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
});

test("active Expo Router surface does not import the quarantined legacy app shell",()=>{
  const active=files(path.join(root,"src/app")).filter(f=>/\.(tsx?|jsx?)$/.test(f));
  const violations=[];
  for(const file of active){const source=fs.readFileSync(file,"utf8");if(/(?:from\s+|import\s*\()(['"])\.\.\/\.\.\/app\//.test(source)||/from\s+(['"])app\//.test(source)) violations.push(path.relative(root,file));}
  assert.deepEqual(violations,[]);
});

test("legacy shell is retired and cannot become the package entrypoint",()=>{
  const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
  assert.equal(pkg.main,"expo-router/entry");
  assert.ok(!fs.existsSync(path.join(root,"app")));
  assert.match(architecture,/not an active route surface/);
});
