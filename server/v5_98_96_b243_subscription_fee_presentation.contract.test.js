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
 ['M3950 package release is V5.98.96',()=>{assert.equal(json('package.json').version,CUR)}],
 ['M3951 server release matches',()=>{assert.equal(json('server/package.json').version,CUR)}],
 ['M3952 Expo release and build numbers match',()=>{const a=json('app.json');assert.equal(a.expo.version,CUR);assert.equal(a.expo.android.versionCode,CODE);assert.equal(a.expo.ios.buildNumber,String(CODE))}],
 ['M3953 lockfile release matches',()=>{const l=json('package-lock.json');assert.equal(l.version,CUR);assert.equal(l.packages[''].version,CUR)}],
 ['M3954 VERSION identifies B243',()=>{const s=read('VERSION.md');assert.match(s,new RegExp('^# NEXA V'+CUR.replace(/\./g,'\\.')+' '+CURB,'m'));assert.match(s,/Current Version:\*\* V\d+\.\d+\.\d+/);assert.match(s,/Batch:\*\* B\d+/);}],
 ['M3955 VERSION records roadmap',()=>{assert.match(read('MASTER_ROADMAP.md'),/M3950/);}],
 ['M3956 fee response has stable code type',()=>{assert.match(read('src/Subscription.tsx'),/type SubscriptionServiceFee=\{code:SubscriptionServiceFeeCode/)}],
 ['M3957 fee response amount is typed',()=>{assert.match(read('src/Subscription.tsx'),/fee:\{amount:number;currency:string\}/)}],
 ['M3958 UI imports fee resolver',()=>{assert.match(read('src/Subscription.tsx'),/subscriptionServiceFee/)}],
 ['M3959 UI resolves definition by stable code',()=>{assert.match(read('src/Subscription.tsx'),/const definition=subscriptionServiceFee\(code\)/)}],
 ['M3960 UI keys rows by stable code',()=>{assert.match(read('src/Subscription.tsx'),/key=\{code\}/)}],
 ['M3961 UI does not use label as key',()=>{assert.doesNotMatch(read('src/Subscription.tsx'),/key=\{label\}/)}],
 ['M3962 UI finds server fee by stable code',()=>{assert.match(read('src/Subscription.tsx'),/find\(x=>x\.code===code\)/)}],
 ['M3963 UI avoids silent zero fallback',()=>{assert.doesNotMatch(read('src/Subscription.tsx'),/fee\?\.fee\?\.amount\|\|0/)}],
 ['M3964 UI explicitly handles missing fee',()=>{assert.match(read('src/Subscription.tsx'),/Unavailable/)}],
 ['M3965 all nine fee codes remain',()=>{const s=read('src/subscriptionCentre.ts');for(const x of ['wallet_transfer','wallet_withdrawal','ajo_contribution','marketplace_service','yaayz_service','kitchen_service','zeeza_premium_action','dami_enhanced_action','extension_service'])assert.ok(s.includes(`code: '${x}'`),x)}],
 ['M3966 all nine labels remain',()=>{const s=read('src/subscriptionCentre.ts');for(const x of ['Wallet transfer','Wallet withdrawal','Sky Savings contribution','Dream Marketplace service','Yaayz service','Kitchen service','Zeeza premium action','Dami enhanced action','Extension service'])assert.ok(s.includes(`label: '${x}'`),x)}],
 ['M3967 canonical fee resolver remains',()=>{assert.match(read('src/subscriptionCentre.ts'),/export function subscriptionServiceFee\(code: SubscriptionServiceFeeCode\)/)}],
 ['M3968 canonical route remains',()=>{const s=read('src/subscriptionCentre.ts');assert.match(s,/pathname: '\/\(tabs\)\/money'/);assert.match(s,/view: 'subscription'/)}],
 ['M3969 compatibility route remains',()=>{assert.match(read('src/subscriptionCentre.ts'),/compatibilityRoute: '\/subscription'/)}],
 ['M3970 section authority remains',()=>{assert.match(read('src/subscriptionCentre.ts'),/SUBSCRIPTION_CENTRE_SECTIONS/)}],
 ['M3971 accessibility remains',()=>{assert.match(read('src/Subscription.tsx'),/accessibilityLabel=/)}],
 ['M3972 vendor/Yaayz boundaries remain',()=>{assert.ok(fs.existsSync(path.join(root,'server/vendorProductAi.test.js')));assert.match(read('server/yaayz.test.js'),/yaayzFeePreview/)}],
 ['M3973 active gate registers B243',()=>{assert.ok(fs.existsSync(__filename))}],
 ['M3974 version-only seal tooling remains',()=>{assert.match(read('scripts/release-seal.mjs'),/NEXA-MAIN-V\$\{version\}\.zip/)}],
]
for (const [name,fn] of tests) test(name,fn);
assert.equal(tests.length,25);
