const test=require('node:test'); const assert=require('node:assert/strict'); const C=require('./v5_67_0_schema_integrity');
class MockDb { constructor(){this.duplicateCount=0;this.tables=[{name:'users'},{name:'orders'}];this.columns={users:[{name:'id',type:'TEXT'},{name:'email',type:'TEXT'}]};this.indexes={users:[{unique:1,name:'uq_users_email',columns:['email']}],orders:[{unique:0,name:'ix_orders_user',columns:['userId']} ]};this.pragmas={foreign_keys:1,journal_mode:'wal',busy_timeout:5000,integrity_check:'ok'};} prepare(sql){ return {all:()=>{if(sql.includes("sqlite_master")) return this.tables.map(x=>({type:'table',name:x.name,tbl_name:x.name,sql:`CREATE TABLE ${x.name}(id TEXT)`})); if(sql.includes('PRAGMA table_info')){const t=(sql.match(/table_info\((?:\"|')?([^\"')]+)(?:\"|')?\)/)||[])[1]; return this.columns[t]||[];} if(sql.includes('PRAGMA index_list')){const t=(sql.match(/index_list\((?:\"|')?([^\"')]+)(?:\"|')?\)/)||[])[1]; return (this.indexes[t]||[]).map(x=>({unique:x.unique,name:x.name}));} if(sql.includes('PRAGMA index_info')){const n=(sql.match(/index_info\((?:\"|')?([^\"')]+)(?:\"|')?\)/)||[])[1]; for(const t of Object.values(this.indexes)) for(const i of t) if(i.name===n) return i.columns.map((name,seqno)=>({name,seqno}));} if(sql.includes('GROUP BY')) return [{n:this.duplicateCount||0}]; if(sql.includes('foreign_key_check')) return []; return []},get:()=>({n:this.duplicateCount||0})};} pragma(name,opts){return this.pragmas[name];} }
assert.equal(C.MILESTONES.length,25);
function run(n,name,fn){test(`M${n} ${name}`,fn)}
run(1025,'schema version contract',()=>assert.equal(C.schemaVersion('schema-v108').ok,true));
run(1026,'schema fingerprint deterministic',()=>{const d=new MockDb();assert.match(C.schemaFingerprint(d),/^[0-9a-f]{64}$/);assert.equal(C.schemaFingerprint(d),C.schemaFingerprint(d));});
run(1027,'migration ledger validates ordered checksums',()=>assert.equal(C.migrationLedger([{id:'m1',order:1,checksum:'a'.repeat(64)},{id:'m2',order:2,checksum:'b'.repeat(64)}]).ok,true));
run(1028,'migration checksum deterministic',()=>assert.equal(C.migrationChecksum('CREATE TABLE x(id TEXT);').hash,C.migrationChecksum(' create   table x(id text); ').hash));
run(1029,'migration order is contiguous',()=>assert.equal(C.migrationOrder(7,8).ok,true));
run(1030,'migration lock requires live holder',()=>assert.equal(C.migrationLock('worker-12345',Date.now()+10000).ok,true));
run(1031,'transactional migration requires commit or rollback',()=>{assert.equal(C.transactionalMigration({began:true,committed:true,rolledBack:false,error:null}).ok,true);assert.equal(C.transactionalMigration({began:true,committed:false,rolledBack:true,error:'x'}).ok,true)});
run(1032,'destructive migration requires approval',()=>assert.equal(C.destructiveMigrationGuard('DROP TABLE users').ok,false));
run(1033,'required table contract',()=>{const d=new MockDb();assert.equal(C.requiredTables(d,['users']).ok,true)});
run(1034,'required column contract',()=>{const d=new MockDb();assert.equal(C.requiredColumns(d,'users',['id','email']).ok,true)});
run(1035,'column type contract',()=>{const d=new MockDb();assert.equal(C.columnTypeContract(d,'users',{id:'TEXT',email:'TEXT'}).ok,true)});
run(1036,'unique index contract',()=>{const d=new MockDb();assert.equal(C.uniqueIndexContract(d,'users',['email']).ok,true)});
run(1037,'foreign keys enabled',()=>{const d=new MockDb();assert.equal(C.foreignKeysEnabled(d).ok,true)});
run(1038,'foreign key check is clean',()=>{const d=new MockDb();assert.equal(C.foreignKeyOrphans(d).ok,true)});
run(1039,'duplicate key detection',()=>{const d=new MockDb(); d.duplicateCount=1;assert.equal(C.duplicateKeyDetection(d,'t',['a','b']).ok,false)});
run(1040,'index coverage contract',()=>{const d=new MockDb(); d.indexes.t=[{unique:0,name:'ix',columns:['a','b']}];assert.equal(C.indexCoverage(d,'t',['a','b']).ok,true)});
run(1041,'database integrity check',()=>{const d=new MockDb();assert.equal(C.databaseIntegrity(d).ok,true)});
run(1042,'wal journal contract',()=>{const d=new MockDb();assert.equal(C.walJournal(d).ok,true);});
run(1043,'busy timeout contract',()=>{const d=new MockDb();assert.equal(C.busyTimeout(d,1000).ok,true)});
run(1044,'backup before migration contract',()=>assert.equal(C.backupBeforeMigration({backupCreated:true,verified:true,source:'/data/a',backup:'/backup/a'}).ok,true));
run(1045,'restore schema must match',()=>assert.equal(C.restoreSchemaMatch('abc','abc').ok,true));
run(1046,'seed is idempotent',()=>assert.equal(C.seedIdempotency({before:8,after:8,runs:2}).ok,true));
run(1047,'schema drift fails closed',()=>assert.equal(C.schemaDriftFailClosed('a','b').ok,false));
run(1048,'startup schema certification aggregates gates',()=>assert.equal(C.startupSchemaCertification({versionOk:true,fingerprintOk:true,integrityOk:true,fkOk:true,requiredTablesOk:true}).ok,true));
run(1049,'cumulative schema certification requires all 25',()=>assert.equal(C.cumulativeCertification(Array(25).fill(true)).ok,true));
