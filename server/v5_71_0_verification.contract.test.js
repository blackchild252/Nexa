const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const V=require('../scripts/v5_71_0_verification.js');
const cases=[
 [1125,()=>V.verificationProfile().profile==='ci-deterministic'],
 [1126,()=>V.nodeRuntimeContract()],
 [1127,()=>V.npmRuntimeContract()],
 [1128,()=>V.lockfileSync()],
 [1129,()=>V.dependencyManifestParity()],
 [1130,()=>V.installState()],
 [1131,()=>V.deterministicEnvironment()],
 [1132,()=>V.testDiscoveryManifest()],
 [1133,()=>V.contractTestManifest()],
 [1134,()=>V.syntaxSweepManifest()],
 [1135,()=>V.releaseAuditGate()],
 [1136,()=>V.dependencyPreflightGate()],
 [1137,()=>V.serverSuiteTimeout()],
 [1138,()=>V.e2eTimeout()],
 [1139,()=>V.ciConcurrency()],
 [1140,()=>V.ciLeastPrivilege()],
 [1141,()=>V.actionPinning()],
 [1142,()=>V.artifactRetention()],
 [1143,()=>V.testReportOutput()],
 [1144,()=>V.failureSummary()],
 [1145,()=>V.noTestRetry()],
 [1146,()=>V.contractNetworkIsolation()],
 [1147,()=>V.fixtureIsolation()],
 [1148,()=>V.releaseArchiveNaming()],
 [1149,()=>V.cumulativeCertification(Array(25).fill(true))],
];
for(const [id,fn] of cases)test(`M${id}`,()=>assert.equal(fn(),true));
test('verification module exports all 25 controls',()=>{for(const [id] of V.MILESTONES){assert.equal(typeof V.CONTROLS[id],'function',String(id));}});
test('workflow keeps production verification separate from preview fixtures',()=>{const s=fs.readFileSync(require('path').join(__dirname,'..','.github/workflows/nexa-quality.yml'),'utf8');assert.match(s,/NEXA_PREVIEW_MODE:\s*0/);assert.match(s,/npm run test:server/);});
test('verification certification is exactly 25 milestones',()=>assert.equal(V.MILESTONES.length,25));
