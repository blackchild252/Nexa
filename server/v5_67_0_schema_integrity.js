const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MILESTONES = [
  [1025, 'schema-version-contract'],[1026,'schema-fingerprint-contract'],[1027,'migration-ledger-contract'],[1028,'migration-checksum-contract'],[1029,'migration-order-contract'],
  [1030,'migration-lock-contract'],[1031,'transactional-migration-contract'],[1032,'destructive-migration-guard'],[1033,'required-table-contract'],[1034,'required-column-contract'],
  [1035,'column-type-contract'],[1036,'unique-index-contract'],[1037,'foreign-key-enforcement-contract'],[1038,'foreign-key-orphan-contract'],[1039,'duplicate-key-detection-contract'],
  [1040,'index-coverage-contract'],[1041,'database-integrity-contract'],[1042,'wal-journal-contract'],[1043,'busy-timeout-contract'],[1044,'backup-before-migration-contract'],
  [1045,'restore-schema-match-contract'],[1046,'seed-idempotency-contract'],[1047,'schema-drift-fail-closed-contract'],[1048,'startup-schema-certification-contract'],[1049,'cumulative-schema-integrity-certification'],
];
const MAX_HASH = 64;

function normalizedSql(sql){ return String(sql||'').replace(/--[^\n]*\n/g,'\n').replace(/\s+/g,' ').trim().toLowerCase(); }
function sha256(value){ return crypto.createHash('sha256').update(String(value),'utf8').digest('hex'); }
function schemaVersion(value){ const v=String(value||'').trim(); return {ok:/^schema-v\d+(?:\.\d+)*$/.test(v), value:v}; }
function schemaFingerprint(db){
  const rows=db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE type IN ('table','index','trigger','view') ORDER BY type,name").all();
  return sha256(rows.map(r=>[r.type,r.name,r.tbl_name,normalizedSql(r.sql)].join('|')).join('\n'));
}
function migrationLedger(entries){
  if(!Array.isArray(entries)) return {ok:false,reason:'entries'};
  const ids=entries.map(e=>String(e?.id||''));
  return {ok:entries.every((e,i)=>/^[A-Za-z0-9._:-]{2,120}$/.test(String(e?.id||'')) && /^[0-9a-f]{64}$/.test(String(e?.checksum||'')) && Number.isInteger(e?.order) && e.order>0 && (i===0 || e.order>entries[i-1].order)) && new Set(ids).size===ids.length};
}
function migrationChecksum(sql){ return {ok:Boolean(String(sql||'').trim()), hash:sha256(normalizedSql(sql))}; }
function migrationOrder(current,next){ return {ok:Number.isInteger(current)&&Number.isInteger(next)&&next===current+1,current,next}; }
function migrationLock(holder,expiresAt,now=Date.now()){ const h=String(holder||'').trim(); const e=Number(expiresAt); return {ok:h.length>=8&&h.length<=160&&Number.isFinite(e)&&e>Number(now),holder:h,expiresAt:e}; }
function transactionalMigration({began,committed,rolledBack,error}){ return {ok:began===true && ((committed===true && rolledBack===false && !error) || (committed===false && rolledBack===true && Boolean(error)))}; }
function destructiveMigrationGuard(sql,approved=false){ const destructive=/\b(DROP\s+(TABLE|INDEX|TRIGGER)|DELETE\s+FROM|TRUNCATE|ALTER\s+TABLE\s+\S+\s+DROP\s+COLUMN)\b/i.test(String(sql||'')); return {ok:!destructive||approved===true,destructive}; }
function requiredTables(db,names){ const set=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name)); const missing=(Array.isArray(names)?names:[]).filter(n=>!set.has(String(n))); return {ok:missing.length===0,missing}; }
function requiredColumns(db,table,columns){ const actual=new Set(db.prepare(`PRAGMA table_info(${JSON.stringify(String(table))})`).all().map(r=>r.name)); const missing=(Array.isArray(columns)?columns:[]).filter(c=>!actual.has(String(c))); return {ok:missing.length===0,missing}; }
function columnTypeContract(db,table,expectations){ const rows=db.prepare(`PRAGMA table_info(${JSON.stringify(String(table))})`).all(); const by=new Map(rows.map(r=>[r.name,String(r.type||'').toUpperCase()])); const mismatches=Object.entries(expectations||{}).filter(([k,v])=>by.get(k)!==String(v).toUpperCase()).map(([k,v])=>({column:k,expected:String(v).toUpperCase(),actual:by.get(k)||null})); return {ok:mismatches.length===0,mismatches}; }
function uniqueIndexContract(db,table,columns){ const wanted=(Array.isArray(columns)?columns:[]).map(String).join(','); const rows=db.prepare(`PRAGMA index_list(${JSON.stringify(String(table))})`).all(); for(const r of rows){ if(!r.unique) continue; const cols=db.prepare(`PRAGMA index_info(${JSON.stringify(String(r.name))})`).all().sort((a,b)=>a.seqno-b.seqno).map(x=>x.name).join(','); if(cols===wanted) return {ok:true,index:r.name}; } return {ok:false,index:null}; }
function foreignKeysEnabled(db){ return {ok:Number(db.pragma('foreign_keys',{simple:true}))===1}; }
function foreignKeyOrphans(db){ const rows=db.prepare('PRAGMA foreign_key_check').all(); return {ok:rows.length===0,violations:rows.length}; }
function duplicateKeyDetection(db,table,columns){ const cols=(Array.isArray(columns)?columns:[]).map(String); if(!cols.length) return {ok:false,count:null}; const sql=`SELECT COUNT(*) AS n FROM (SELECT ${cols.map(c=>`"${c.replaceAll('"','""')}"`).join(',')} FROM "${String(table).replaceAll('"','""')}" GROUP BY ${cols.map(c=>`"${c.replaceAll('"','""')}"`).join(',')} HAVING COUNT(*)>1)`; const n=Number(db.prepare(sql).get().n); return {ok:n===0,count:n}; }
function indexCoverage(db,table,columns){ const target=(Array.isArray(columns)?columns:[]).map(String).join(','); const rows=db.prepare(`PRAGMA index_list(${JSON.stringify(String(table))})`).all(); const covered=rows.some(r=>{const cols=db.prepare(`PRAGMA index_info(${JSON.stringify(String(r.name))})`).all().sort((a,b)=>a.seqno-b.seqno).map(x=>x.name).join(','); return cols===target;}); return {ok:covered}; }
function databaseIntegrity(db){ return {ok:String(db.pragma('integrity_check',{simple:true}))==='ok',result:String(db.pragma('integrity_check',{simple:true}))}; }
function walJournal(db){ const mode=String(db.pragma('journal_mode',{simple:true})).toLowerCase(); return {ok:mode==='wal',mode}; }
function busyTimeout(db,min=1000){ const value=Number(db.pragma('busy_timeout',{simple:true})); return {ok:Number.isFinite(value)&&value>=Number(min),value}; }
function backupBeforeMigration({backupCreated,verified,source,backup}){ return {ok:backupCreated===true&&verified===true&&Boolean(source)&&Boolean(backup)}; }
function restoreSchemaMatch(actual,expected){ return {ok:Boolean(actual)&&actual===expected}; }
function seedIdempotency({before,after,runs}){ return {ok:Number(before)===Number(after)&&Number(runs)>=2}; }
function schemaDriftFailClosed(actual,expected){ return {ok:Boolean(actual)&&Boolean(expected)&&actual===expected}; }
function startupSchemaCertification({versionOk,fingerprintOk,integrityOk,fkOk,requiredTablesOk}){ return {ok:[versionOk,fingerprintOk,integrityOk,fkOk,requiredTablesOk].every(Boolean)}; }
function cumulativeCertification(results){ return {ok:Array.isArray(results)&&results.length===MILESTONES.length&&results.every(Boolean),count:Array.isArray(results)?results.length:0}; }

module.exports={MILESTONES,MAX_HASH,schemaVersion,schemaFingerprint,migrationLedger,migrationChecksum,migrationOrder,migrationLock,transactionalMigration,destructiveMigrationGuard,requiredTables,requiredColumns,columnTypeContract,uniqueIndexContract,foreignKeysEnabled,foreignKeyOrphans,duplicateKeyDetection,indexCoverage,databaseIntegrity,walJournal,busyTimeout,backupBeforeMigration,restoreSchemaMatch,seedIdempotency,schemaDriftFailClosed,startupSchemaCertification,cumulativeCertification};
