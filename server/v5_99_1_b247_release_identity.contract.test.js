const test = require('node:test');
const assert = require('node:assert/strict');
const __r=(p)=>JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'..',p),'utf8'));
const CUR=__r('package.json').version, CODE=__r('app.json').expo.android.versionCode, CURB=__r('PROJECT_MEMORY.json').currentBatch;

const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = p => JSON.parse(read(p));
const tests = [
 ['M4050 package release is V5.99.1',()=>assert.equal(json('package.json').version,CUR)],
 ['M4051 server release matches',()=>assert.equal(json('server/package.json').version,CUR)],
 ['M4052 Expo release matches',()=>assert.equal(json('app.json').expo.version,CUR)],
 ['M4053 Android versionName matches',()=>assert.equal(json('app.json').expo.android.version,CUR)],
 ['M4054 Android versionCode is 6066',()=>assert.equal(json('app.json').expo.android.versionCode,CODE)],
 ['M4055 Android nested version matches',()=>assert.equal(json('app.json').expo.android.version,CUR)],
 ['M4056 iOS versionName matches',()=>assert.equal(json('app.json').expo.ios.version,CUR)],
 ['M4057 iOS version matches',()=>assert.equal(json('app.json').expo.ios.version,CUR)],
 ['M4058 iOS buildNumber is 6066',()=>assert.equal(json('app.json').expo.ios.buildNumber,String(CODE))],
 ['M4059 Expo versionName matches',()=>assert.equal(json('app.json').expo.version,CUR)],
 ['M4060 Expo extra nexaVersion matches',()=>assert.equal(json('app.json').expo.extra.nexaVersion,CUR)],
 ['M4061 Expo extra versionName matches',()=>assert.equal(json('app.json').expo.extra.versionName,CUR)],
 ['M4062 Expo extra version matches',()=>assert.equal(json('app.json').expo.extra.version,CUR)],
 ['M4063 Expo extra versionCode is 6066',()=>assert.equal(json('app.json').expo.extra.versionCode,CODE)],
 ['M4064 root app version matches',()=>assert.equal(json('app.json').version,CUR)],
 ['M4065 root app versionCode is 6066',()=>assert.equal(json('app.json').versionCode,CODE)],
 ['M4066 lockfile root version matches',()=>assert.equal(json('package-lock.json').version,CUR)],
 ['M4067 lockfile package version matches',()=>assert.equal(json('package-lock.json').packages[''].version,CUR)],
 ['M4068 VERSION identifies B247',()=>{const s=read('VERSION.md');assert.match(s,new RegExp('^# NEXA V'+CUR.replace(/\./g,'\\.')+' '+CURB,'m'));assert.match(s,new RegExp('Batch:\\*\\* '+CURB))}],
 ['M4069 VERSION records roadmap',()=>assert.match(read('MASTER_ROADMAP.md'),/M4050/)],
 ['M4070 release gate registers B247 contract',()=>assert.ok(require('fs').existsSync(__filename))],
 ['M4071 release gate removes B246 from active identity slot',()=>{const s=read('scripts/release-gate.mjs');assert.doesNotMatch(s,/v5_99_0_b246_add_money_intent\.contract\.test\.js/)}],
 ['M4072 version-only archive naming remains',()=>assert.match(read('scripts/release-seal.mjs'),/NEXA-MAIN-V\$\{version\}\.zip/)],
 ['M4073 release audit remains available',()=>assert.match(read('scripts/release-audit.mjs'),/release audit/i)],
 ['M4074 environment remains excluded from release gate',()=>assert.match(read('scripts/release-gate.mjs'),/EXCLUDED_FROM_RELEASE_CERTIFICATION/)],
];
for (const [name,fn] of tests) test(name,fn);
assert.equal(tests.length,25);
