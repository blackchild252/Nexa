'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const __r=(p)=>JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'..',p),'utf8'));
const CUR=__r('package.json').version, CODE=__r('app.json').expo.android.versionCode, CURB=__r('PROJECT_MEMORY.json').currentBatch;

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const json = p => JSON.parse(read(p));
const checks = [
 ['package version',()=>json('package.json').version===CUR],
 ['server package version',()=>json('server/package.json').version===CUR],
 ['lockfile version',()=>json('package-lock.json').packages?.['']?.version===CUR],
 ['expo version',()=>json('app.json').expo?.version===CUR],
 ['android versionName',()=>json('app.json').expo?.android?.version===CUR],
 ['android versionCode',()=>json('app.json').expo?.android?.versionCode===CODE],
 ['ios versionName',()=>json('app.json').expo?.ios?.version===CUR],
 ['ios version',()=>json('app.json').expo?.ios?.version===CUR],
 ['ios buildNumber',()=>json('app.json').expo?.ios?.buildNumber===String(CODE)],
 ['theme release',()=>new RegExp(`release: ['"]${CUR.replace(/\./g,'\\.')}['"]`).test(read('src/theme.ts'))],
 ['shared environment contract exists',()=>fs.existsSync(path.join(root,'scripts/production-env-contract.mjs'))],
 ['public API URL required',()=>read('scripts/production-env-contract.mjs').includes("EXPO_PUBLIC_API_URL")],
 ['privacy URL required',()=>read('scripts/production-env-contract.mjs').includes("EXPO_PUBLIC_PRIVACY_POLICY_URL")],
 ['terms URL required',()=>read('scripts/production-env-contract.mjs').includes("EXPO_PUBLIC_TERMS_URL")],
 ['HTTPS validation shared',()=>/u\.protocol === 'https:'/.test(read('scripts/production-env-contract.mjs'))],
 ['secret values not rendered',()=>/renderSafeSummary/.test(read('scripts/production-env-contract.mjs')) && !/c\.value|c\.raw/.test(read('scripts/production-env-contract.mjs'))],
 ['launch preflight uses shared contract',()=>/inspectProductionEnvironment/.test(read('scripts/launch-preflight.mjs'))],
 ['launch preflight preserves AdMob protection',()=>/3940256099942544/.test(read('scripts/launch-preflight.mjs'))],
 ['launch preflight preserves EAS project guard',()=>/extra.*eas.*projectId/.test(read('scripts/launch-preflight.mjs'))],
 ['EAS production profile',()=>json('eas.json').build?.production?.environment==='production'],
 ['EAS production channel',()=>json('eas.json').build?.production?.channel==='production'],
 ['production API client remains HTTPS-guarded',()=>/EXPO_PUBLIC_API_URL must use HTTPS in production builds/.test(read('src/api.ts'))],
 ['production AdMob identifiers remain real',()=>!read('app.json').includes('ca-app-pub-3940256099942544')],
 ['no active private key material',()=>!/(BEGIN (RSA|OPENSSH|EC|PRIVATE) KEY)/.test(read('app.json'))],
 ['next roadmap documented',()=>/M\d{4}/.test(read('MASTER_ROADMAP.md'))],
];
for (const [name,fn] of checks) test(name,()=>assert.equal(fn(),true));
test('exactly 25 roadmap milestones are represented',()=>assert.equal(checks.length,25));
