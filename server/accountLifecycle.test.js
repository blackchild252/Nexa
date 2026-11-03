"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const portability=require("./accountPortability");
const root=path.join(__dirname,"..");
const index=fs.readFileSync(path.join(__dirname,"index.js"),"utf8");

test("account portability V2 includes Dami personalization and supports V1 migration",()=>{
  assert.equal(portability.EXPORT_VERSION,2);
  assert.deepEqual(portability.SUPPORTED_IMPORT_VERSIONS,[1,2]);
  assert.ok(portability.TABLES.includes("ai_personalization"));
  const migrated=portability.migrateBundle({format:"nexa-account-export",exportVersion:1,data:{ai_voice_preferences:[]}});
  assert.equal(migrated.exportVersion,2);
  assert.equal(migrated.schema,"account-portability-v2");
  assert.deepEqual(migrated.data.ai_personalization,[]);
});

test("newer or malformed account export versions fail closed",()=>{
  assert.throws(()=>portability.migrateBundle({format:"nexa-account-export",exportVersion:99,data:{}}),/Unsupported/);
  assert.throws(()=>portability.migrateBundle({format:"wrong",exportVersion:2,data:{}}),/Unsupported/);
});

test("preference lifecycle exposes authenticated reset endpoints",()=>{
  assert.match(index,/app\.delete\("\/api\/ai\/personalization", auth\.authMiddleware/);
  assert.match(index,/app\.delete\("\/api\/ai\/voice-preferences", auth\.authMiddleware/);
  assert.match(index,/DELETE FROM ai_personalization WHERE userId = \?/);
  assert.match(index,/DELETE FROM ai_voice_preferences WHERE userId = \?/);
});

test("personalization API client exposes reset controls",()=>{
  const api=fs.readFileSync(path.join(root,"src/api.ts"),"utf8");
  assert.match(api,/resetDamiPersonalization/);
  assert.match(api,/resetDamiVoicePreferences/);
});
