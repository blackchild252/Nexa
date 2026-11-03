"use strict";
const assert=require("node:assert/strict"); const {test}=require("node:test"); const fs=require("node:fs"); const path=require("node:path");
const root=path.join(__dirname,".."); const pkg=require(path.join(root,"package.json"));
test("Expo Router is the single active frontend entry surface",()=>{ assert.equal(pkg.main,"expo-router/entry"); assert.ok(fs.existsSync(path.join(root,"src/app/_layout.tsx"))); assert.ok(fs.existsSync(path.join(root,"src/app/(tabs)/_layout.tsx"))); });
test("legacy app shell is explicitly documented as recoverable, not active",()=>{ const doc=fs.readFileSync(path.join(root,"ARCHITECTURE_RECONCILIATION_V3_60_41.md"),"utf8"); assert.match(doc,/Legacy surface.*`app\/`.*recoverable legacy code/); assert.match(doc,/New screens\/routes must be added under `src\/app\//); });
test("legacy root app/ shell was retired after the dependency audit; push registration now lives under src",()=>{ assert.ok(!fs.existsSync(path.join(root,"app"))); assert.ok(fs.existsSync(path.join(root,"src/pushRegistration.ts"))); });
