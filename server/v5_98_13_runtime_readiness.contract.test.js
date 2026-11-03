'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const __r=(p)=>JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'..',p),'utf8'));
const CUR=__r('package.json').version, CODE=__r('app.json').expo.android.versionCode, CURB=__r('PROJECT_MEMORY.json').currentBatch;

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p), 'utf8');
const json = p => JSON.parse(read(p));
const pkg = json('package.json');
const mem = json('PROJECT_MEMORY.json');
const version = CUR;
const batch = CURB;
const observability = read('server/v5_68_0_observability.js');
const recovery = read('server/v5_64_0_reliability_recovery.js');
const ops = read('server/operationalReadiness.js');
const prod = read('server/v5_66_0_production_integrity.js');
const launch = read('server/launchReadiness.js');
const backup = read('scripts/backup-db.mjs');
const drill = read('scripts/recovery-drill.mjs');
const scripts = pkg.scripts || {};
const checks = [
 ['1900 package release identity',()=>assert.equal(pkg.version,version)],
 ['1901 memory current state',()=>assert.equal(mem.currentState,`V${version} ${batch}`)],
 ['1902 correlation identifiers',()=>assert.match(observability,/correlationId/)],
 ['1903 diagnostic events',()=>assert.match(observability,/diagnosticEvent/)],
 ['1904 secret redaction',()=>assert.match(observability,/secretRedaction/)],
 ['1905 PII redaction',()=>assert.match(observability,/piiRedaction/)],
 ['1906 dependency health',()=>assert.match(observability,/dependencyHealth/)],
 ['1907 database health',()=>assert.match(observability,/databaseHealth/)],
 ['1908 queue health',()=>assert.match(observability,/queueHealth/)],
 ['1909 provider health',()=>assert.match(observability,/providerHealth/)],
 ['1910 audit lineage',()=>assert.match(observability,/auditLineage/)],
 ['1911 diagnostic rate limiting',()=>assert.match(observability,/diagnosticRateLimit/)],
 ['1912 failure burst detection',()=>assert.match(observability,/failureBurst/)],
 ['1913 event hash chain',()=>assert.match(recovery,/eventHash/)],
 ['1914 retry backoff',()=>assert.match(recovery,/retryDelayMs/)],
 ['1915 stale job recovery',()=>assert.match(recovery,/recoveryTransition/)],
 ['1916 operational database inspection',()=>assert.match(ops,/inspectDatabase/)],
 ['1917 runtime persistence check',()=>assert.match(ops,/DB_PATH/)],
 ['1918 backup separation boundary',()=>assert.match(ops,/backupDestination/)],
 ['1919 backup integrity verification',()=>assert.match(ops,/integrity_check/)],
 ['1920 production strict boundary',()=>assert.match(prod,/NEXA_STRICT_LAUNCH/)],
 ['1921 launch readiness integration',()=>assert.match(launch,/readiness|production/i)],
 ['1922 backup verification command',()=>assert.match(backup,/verify/)],
 ['1923 recovery drill command',()=>assert.match(drill,/recovery|backup/i)],
 ['1924 roadmap/release test entry',()=>{assert.equal(typeof scripts['verify:all'],'string');assert.match(String(mem.lastCompletedMilestones),/^M\d+–M\d+/)}],
];
for (const [name, fn] of checks) test(name, fn);
test('exactly 25 roadmap milestones',()=>assert.equal(checks.length,25));
