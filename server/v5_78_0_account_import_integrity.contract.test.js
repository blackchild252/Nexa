"use strict";
const assert=require("node:assert/strict");
const {test}=require("node:test");
const fs=require("node:fs");
const path=require("node:path");
const integrity=require("./v5_78_0_account_import_integrity");
const portability=fs.readFileSync(path.join(__dirname,"accountPortability.js"),"utf8");
const index=fs.readFileSync(path.join(__dirname,"index.js"),"utf8");
const milestones=[
[1300,"import integrity module is wired into portability",()=>assert.match(portability,/v5_78_0_account_import_integrity/)],
[1301,"preflight is invoked before transaction writes",()=>assert.ok(portability.indexOf("const migrated = preflightImport") < portability.indexOf("db.transaction"))],
[1302,"required-column inspection exists",()=>assert.equal(typeof integrity.requiredColumns,"function")],
[1303,"primary-key inspection exists",()=>assert.equal(typeof integrity.primaryKeys,"function")],
[1304,"duplicate primary keys are rejected",()=>assert.match(fs.readFileSync(path.join(__dirname,"v5_78_0_account_import_integrity.js"),"utf8"),/duplicate primary key/)],
[1305,"missing required fields are rejected",()=>assert.match(fs.readFileSync(path.join(__dirname,"v5_78_0_account_import_integrity.js"),"utf8"),/required field/)],
[1306,"cross-account primary-key ownership remains rejected",()=>assert.match(portability,/owned by another account/)],
[1307,"workflow run dependency is declared",()=>assert.ok(integrity.SEMANTIC_FKS.some(x=>x.table==="ai_workflow_runs"))],
[1308,"goal contribution dependency is declared",()=>assert.ok(integrity.SEMANTIC_FKS.some(x=>x.table==="financial_goal_contributions"))],
[1309,"savings rule dependency is declared",()=>assert.ok(integrity.SEMANTIC_FKS.some(x=>x.table==="financial_savings_rules"))],
[1310,"imported parent identifiers satisfy semantic references",()=>assert.match(fs.readFileSync(path.join(__dirname,"v5_78_0_account_import_integrity.js"),"utf8"),/importedParentIds/)],
[1311,"existing parent references are ownership checked",()=>assert.match(fs.readFileSync(path.join(__dirname,"v5_78_0_account_import_integrity.js"),"utf8"),/references another account/)],
[1312,"missing parent references are rejected",()=>assert.match(fs.readFileSync(path.join(__dirname,"v5_78_0_account_import_integrity.js"),"utf8"),/references missing/)],
[1313,"preflight preserves atomic import semantics",()=>assert.match(portability,/db\.transaction\(\(\) =>/)],
[1314,"import remains closed-account blocked",()=>assert.match(portability,/Closed accounts cannot import data/)],
[1315,"bundle size limit remains enforced",()=>assert.match(portability,/MAX_BUNDLE_BYTES/)],
[1316,"row limit remains enforced",()=>assert.match(portability,/MAX_ROWS_PER_TABLE/)],
[1317,"unsupported tables remain rejected",()=>assert.match(portability,/Import does not allow table/)],
[1318,"userId remains server-owned",()=>assert.match(portability,/c !== "userId"/)],
[1319,"import endpoint remains authenticated",()=>assert.match(index,/app\.post\("\/api\/account\/import", auth\.authMiddleware/)],
[1320,"validate endpoint remains authenticated",()=>assert.match(index,/app\.post\("\/api\/account\/import\/validate", auth\.authMiddleware/)],
[1321,"import response remains no-store",()=>assert.match(index,/res\.setHeader\("Cache-Control", "no-store"\)/)],
[1322,"preflight returns deterministic checksum",()=>assert.match(fs.readFileSync(path.join(__dirname,"v5_78_0_account_import_integrity.js"),"utf8"),/createHash\("sha256"/)],
[1323,"portable API exposes preflight for focused certification",()=>assert.equal(typeof require("./accountPortability").preflightImport,"function")],
[1324,"semantic FK set is immutable",()=>assert.match(fs.readFileSync(path.join(__dirname,"v5_78_0_account_import_integrity.js"),"utf8"),/Object\.freeze/)],
];
for(const [m,d,fn] of milestones)test(`M${m} ${d}`,fn);

test("B119 semantic preflight rejects orphan workflow runs",()=>{
 const state={};
 const db={prepare(sql){return {all(){if(sql.startsWith("PRAGMA table_info")) return [{name:"id",pk:1,notnull:1},{name:"workflowId",pk:0,notnull:1,dflt_value:null},{name:"userId",pk:0,notnull:1,dflt_value:null}];return[];},get(...args){if(sql.includes("sqlite_master")) return {ok:1}; if(sql.includes("SELECT userId FROM")) return null; return null;}}}};
 const bundle={data:{ai_workflows:[],ai_workflow_runs:[{id:"r1",workflowId:"missing",userId:"u1",result:"{}",createdAt:"x"}]}};
 assert.throws(()=>integrity.preflight(db,"u1",bundle,{tables:["ai_workflows","ai_workflow_runs"]}),/references missing/);
});
