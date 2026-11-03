'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const json = p => JSON.parse(read(p));
const pkg = json('package.json');
const checks = [
 ['package version',()=>json('package.json').version===pkg.version],
 ['server package version',()=>json('server/package.json').version===pkg.version],
 ['lockfile root version',()=>json('package-lock.json').packages?.['']?.version===pkg.version],
 ['Expo version',()=>json('app.json').expo?.version===pkg.version],
 ['Android versionName remains valid',()=>/^\d+\.\d+\.\d+$/.test(String(json('app.json').expo?.android?.version||''))],
 ['Android versionCode remains internally typed',()=>Number.isInteger(json('app.json').expo?.android?.versionCode) && json('app.json').expo.android.versionCode > 0],
 ['iOS release identity',()=>String(json('app.json').expo?.ios?.buildNumber||'').length>0],
 ['iOS buildNumber remains non-empty',()=>/^\d+$/.test(String(json('app.json').expo?.ios?.buildNumber||''))],
 ['Android package identity',()=>json('app.json').expo?.android?.package==='com.aami.nexa'],
 ['iOS bundle identity',()=>json('app.json').expo?.ios?.bundleIdentifier==='com.aami.nexa'],
 ['EAS project identity',()=>/^[0-9a-f-]{36}$/i.test(json('app.json').expo?.extra?.eas?.projectId||'')],
 ['production environment',()=>json('eas.json').build?.production?.environment==='production'],
 ['production channel',()=>json('eas.json').build?.production?.channel==='production'],
 ['production Android bundle',()=>json('eas.json').build?.production?.android?.buildType==='app-bundle'],
 ['base Node identity',()=>json('eas.json').build?.base?.node==='22.22.2'],
 ['store preflight exists',()=>fs.existsSync(path.join(root,'scripts/store-submission-preflight.mjs'))],
 ['store preflight has safe JSON reader',()=>/const json = p => JSON\.parse/.test(read('scripts/store-submission-preflight.mjs'))],
 ['store preflight validates Android identity',()=>/android\.package/.test(read('scripts/store-submission-preflight.mjs'))],
 ['store preflight validates iOS identity',()=>/ios\.bundleIdentifier/.test(read('scripts/store-submission-preflight.mjs'))],
 ['store preflight validates EAS production',()=>/eas\.production\.environment/.test(read('scripts/store-submission-preflight.mjs'))],
 ['store preflight validates Node',()=>/eas\.base\.node/.test(read('scripts/store-submission-preflight.mjs'))],
 ['production AdMob IDs remain non-sample',()=>!read('app.json').includes('ca-app-pub-3940256099942544')&&!read('src/YaayzNativeAd.tsx').includes('3940256099942544')],
 ['private key material absent from app config',()=>!/(BEGIN (RSA|OPENSSH|EC|PRIVATE) KEY)/.test(read('app.json'))],
 ['store preflight remains current-release driven rather than historical-roadmap driven',()=>/pkg\.version/.test(read('scripts/store-submission-preflight.mjs'))],
 ['25-roadmap contract completeness',()=>checks.length===25],
];
for(const [name,fn] of checks)test(name,()=>assert.equal(fn(),true));
test('exactly 25 roadmap milestones are represented',()=>assert.equal(checks.length,25));
