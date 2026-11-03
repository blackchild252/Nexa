"use strict";
const test=require("node:test"); const assert=require("node:assert/strict"); const fs=require("node:fs"); const path=require("node:path");
const p=require("./v5_73_0_disaster_recovery"); const root=path.join(__dirname,".."); const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const recovery=read("server/recoveryOps.js"), db=read("server/db.js"), index=read("server/index.js"), packageJson=read("package.json");
const checks=[
[1175,"manifest schema",()=>assert.equal(p.manifestSchema({file:"nexa-20260930-120000.db",bytes:10,sha256:"a".repeat(64),createdAt:new Date().toISOString()}).ok,true)],
[1176,"source destination isolation",()=>assert.equal(p.backupSourceDestinationIsolation("/data/nexa.db","/backup/nexa.db"),true)],
[1177,"checksum contract",()=>assert.equal(p.checksumContract("a".repeat(64),"a".repeat(64)),true)],
[1178,"size boundary",()=>{assert.equal(p.sizeWithinLimit(1),true);assert.equal(p.sizeWithinLimit(p.MAX_BACKUP_BYTES+1),false)}],
[1179,"freshness",()=>assert.equal(p.freshness(new Date(Date.now()-1000).toISOString()),"fresh")],
[1180,"monotonic backup times",()=>assert.equal(p.monotonicBackupTimes([{createdAt:"2026-01-01"},{createdAt:"2026-01-02"}]),true)],
[1181,"restore target isolation",()=>assert.equal(p.restoreTargetIsolation("/tmp/restore.db","/data/nexa.db"),true)],
[1182,"readonly restore",()=>assert.equal(p.readonlyContract({readonly:true,writable:false}),true)],
[1183,"restore integrity",()=>assert.equal(p.integrityContract("ok"),true)],
[1184,"restore foreign keys",()=>assert.equal(p.foreignKeyContract(0),true)],
[1185,"required tables",()=>assert.equal(p.requiredTablesContract(p.REQUIRED_TABLES),true)],
[1186,"schema fingerprint",()=>assert.equal(p.schemaFingerprintContract("b".repeat(64),"b".repeat(64)),true)],
[1187,"row counts",()=>assert.equal(p.rowCountContract({users:2},{users:2}),true)],
[1188,"restore smoke",()=>assert.equal(p.restoreSmokeContract([{ok:true},{ok:true},{ok:true}]),true)],
[1189,"corruption detection",()=>assert.equal(p.corruptionDetected("a","b"),true)],
[1190,"manifest immutability",()=>assert.equal(p.manifestImmutable({sha256:"a"},{sha256:"a"}),true)],
[1191,"backup lock",()=>assert.equal(p.backupLockContract("worker",{owner:"worker",expiresAt:Date.now()+60000}),true)],
[1192,"backup concurrency",()=>assert.equal(p.concurrencyContract(1,1),true)],
[1193,"recovery capacity",()=>assert.equal(p.capacityContract(200,100),true)],
[1194,"RPO",()=>assert.equal(p.rpoContract(1000),true)],
[1195,"RTO",()=>assert.equal(p.rtoContract(1000),true)],
[1196,"recovery readiness",()=>assert.equal(p.readinessContract({backupVerified:true,integrityOk:true,foreignKeysOk:true,schemaMatch:true,capacityOk:true}),true)],
[1197,"recovery drill",()=>assert.equal(p.drillContract({executed:true,restored:true,verified:true,cleaned:true}),true)],
[1198,"fail closed",()=>{assert.equal(p.failClosedContract({verified:false,startupAllowed:false}),true);assert.equal(p.failClosedContract({verified:false,startupAllowed:true}),false)}],
[1199,"cumulative certification",()=>assert.deepEqual(p.certification(Array(25).fill(true)),{version:"5.73.0",batch:"B114",milestones:25,total:25,passed:25,complete:true})]
];
for(const [id,name,fn] of checks)test(`M${id} ${name}`,fn);
test("B114 milestone list is exact",()=>assert.deepEqual(p.MILESTONES.map(x=>x[0]),Array.from({length:25},(_,i)=>1175+i)));
test("B114 uses existing recovery infrastructure",()=>{assert.match(recovery,/createVerifiedBackup/);assert.match(recovery,/restoreDrill/);assert.match(db,/DB_PATH/);assert.match(index,/recovery-status/);assert.match(packageJson,/backup-db/)});
