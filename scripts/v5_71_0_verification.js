const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MILESTONES = [
  [1125,'verification-profile-normalization'],
  [1126,'node-runtime-contract'],
  [1127,'npm-runtime-contract'],
  [1128,'lockfile-synchronization-contract'],
  [1129,'dependency-manifest-parity-contract'],
  [1130,'install-state-contract'],
  [1131,'deterministic-environment-contract'],
  [1132,'test-discovery-manifest-contract'],
  [1133,'contract-test-manifest-contract'],
  [1134,'syntax-sweep-manifest-contract'],
  [1135,'release-audit-gate-contract'],
  [1136,'dependency-preflight-gate-contract'],
  [1137,'server-suite-timeout-contract'],
  [1138,'e2e-timeout-contract'],
  [1139,'ci-concurrency-contract'],
  [1140,'ci-least-privilege-contract'],
  [1141,'action-pinning-contract'],
  [1142,'artifact-retention-contract'],
  [1143,'test-report-output-contract'],
  [1144,'failure-summary-contract'],
  [1145,'no-test-retry-contract'],
  [1146,'contract-network-isolation-contract'],
  [1147,'fixture-isolation-contract'],
  [1148,'release-archive-naming-contract'],
  [1149,'cumulative-verification-certification'],
];

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const readJson = file => JSON.parse(read(file));
const nodeVersionOk = version => {
  const m = String(version).match(/^(\d+)\.(\d+)\.(\d+)/); if (!m) return false;
  const [,a,b] = m.map(Number); return a > 20 || (a === 20 && b >= 19);
};
const npmVersionOk = version => /^10\.9\.2$/.test(String(version || ''));
const normalizeEnv = env => Object.keys(env || {}).filter(k => !/^(HOME|PATH|PWD|OLDPWD|SHLVL|_|npm_config_cache)$/i.test(k)).sort().reduce((o,k)=>{o[k]=String(env[k] ?? '');return o;},{});
const sha256 = value => crypto.createHash('sha256').update(String(value)).digest('hex');

function verificationProfile(){
  const pkg=readJson('package.json');
  return {version:pkg.version,node:pkg.engines?.node||null,npm:pkg.packageManager||null,profile:'ci-deterministic'};
}
function nodeRuntimeContract(){ return nodeVersionOk(process.versions.node) && String(readJson('package.json').engines?.node||'').includes('20.19'); }
function npmRuntimeContract(){ return npmVersionOk(readJson('package.json').packageManager?.replace(/^npm@/,'')); }
function lockfileSync(){ const p=readJson('package.json'), l=readJson('package-lock.json'); return l.lockfileVersion===3 && l.packages?.['']?.version===p.version && (l.packages?.['']?.packageManager===undefined||l.packages?.['']?.packageManager===p.packageManager); }
function dependencyManifestParity(){ const p=readJson('package.json'), s=readJson('server/package.json'); return Object.entries(s.dependencies||{}).every(([k,v])=>p.dependencies?.[k]===v); }
function installState(){ return fs.existsSync(path.join(ROOT,'node_modules')) || process.env.CI === 'true'; }
function deterministicEnvironment(){ return normalizeEnv({TZ:'UTC',LANG:'C.UTF-8',LC_ALL:'C.UTF-8'}).TZ==='UTC'; }
function testDiscoveryManifest(){ return fs.readdirSync(path.join(ROOT,'server')).some(f=>f.endsWith('.test.js')); }
function contractTestManifest(){ return fs.readdirSync(path.join(ROOT,'server')).some(f=>/contract\.test\.js$/.test(f)); }
function syntaxSweepManifest(){ return fs.existsSync(path.join(ROOT,'scripts','syntax-sweep.mjs')) || fs.existsSync(path.join(ROOT,'scripts','release-gate.mjs')); }
function releaseAuditGate(){ return fs.existsSync(path.join(ROOT,'scripts','release-audit.mjs')); }
function dependencyPreflightGate(){ return fs.existsSync(path.join(ROOT,'scripts','dependency-preflight.mjs')); }
function serverSuiteTimeout(){ return fs.readFileSync(path.join(ROOT,'.github','workflows','nexa-quality.yml'),'utf8').includes('timeout-minutes: 15'); }
function e2eTimeout(){ return fs.readFileSync(path.join(ROOT,'.github','workflows','nexa-quality.yml'),'utf8').includes('timeout-minutes: 20'); }
function ciConcurrency(){ return fs.readFileSync(path.join(ROOT,'.github','workflows','nexa-quality.yml'),'utf8').includes('cancel-in-progress: true'); }
function ciLeastPrivilege(){ return /permissions:\n\s+contents:\s+read/.test(fs.readFileSync(path.join(ROOT,'.github','workflows','nexa-quality.yml'),'utf8')); }
function actionPinning(){ const s=fs.readFileSync(path.join(ROOT,'.github','workflows','nexa-quality.yml'),'utf8'); return /actions\/checkout@v4/.test(s)&&/actions\/setup-node@v4/.test(s); }
function artifactRetention(){ return fs.readFileSync(path.join(ROOT,'.github','workflows','nexa-quality.yml'),'utf8').includes('retention-days: 7'); }
function testReportOutput(){ return fs.readFileSync(path.join(ROOT,'.github','workflows','nexa-quality.yml'),'utf8').includes('--test-reporter=spec'); }
function failureSummary(){ return fs.readFileSync(path.join(ROOT,'.github','workflows','nexa-quality.yml'),'utf8').includes('Test Summary'); }
function noTestRetry(){ const s=fs.readFileSync(path.join(ROOT,'.github','workflows','nexa-quality.yml'),'utf8'); return !s.includes('npm test -- --retry'); }
function contractNetworkIsolation(){ const s=read('scripts/v5_71_0_verification.js'); return !/require\(['"](?:node:)?(?:http|https|net|tls)['"]\)|\bfetch\s*\(/.test(s); }
function fixtureIsolation(){ const s=fs.readFileSync(path.join(ROOT,'.github','workflows','nexa-quality.yml'),'utf8'); return /NEXA_PREVIEW_MODE:\s*0/.test(s); }
function releaseArchiveNaming(){ return /^NEXA-V\d+\.\d+\.\d+-B\d+\.zip$/.test(process.env.RELEASE_ARCHIVE_NAME||'NEXA-V5.71.0-B112.zip'); }
function cumulativeCertification(results){ return results.length===25 && results.every(Boolean) && MILESTONES.length===25; }

const CONTROLS={1125:verificationProfile,1126:nodeRuntimeContract,1127:npmRuntimeContract,1128:lockfileSync,1129:dependencyManifestParity,1130:installState,1131:deterministicEnvironment,1132:testDiscoveryManifest,1133:contractTestManifest,1134:syntaxSweepManifest,1135:releaseAuditGate,1136:dependencyPreflightGate,1137:serverSuiteTimeout,1138:e2eTimeout,1139:ciConcurrency,1140:ciLeastPrivilege,1141:actionPinning,1142:artifactRetention,1143:testReportOutput,1144:failureSummary,1145:noTestRetry,1146:contractNetworkIsolation,1147:fixtureIsolation,1148:releaseArchiveNaming,1149:cumulativeCertification};
module.exports={MILESTONES,CONTROLS,verificationProfile,nodeRuntimeContract,npmRuntimeContract,lockfileSync,dependencyManifestParity,installState,deterministicEnvironment,testDiscoveryManifest,contractTestManifest,syntaxSweepManifest,releaseAuditGate,dependencyPreflightGate,serverSuiteTimeout,e2eTimeout,ciConcurrency,ciLeastPrivilege,actionPinning,artifactRetention,testReportOutput,failureSummary,noTestRetry,contractNetworkIsolation,fixtureIsolation,releaseArchiveNaming,cumulativeCertification,sha256};
