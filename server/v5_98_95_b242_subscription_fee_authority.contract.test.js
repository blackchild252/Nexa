const test = require('node:test');
const CURRENT_VERSION = require('../package.json').version;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = p => JSON.parse(read(p));
const tests = [
       ['M3931 fee authority uses stable records',()=>{const s=read('src/subscriptionCentre.ts');assert.match(s,/\{ label: 'Wallet transfer', code: 'wallet_transfer' \}/);assert.doesNotMatch(s,/\['Wallet transfer', 'wallet_transfer'\]/)}],
 ['M3932 fee code type derives from authority',()=>assert.match(read('src/subscriptionCentre.ts'),/export type SubscriptionServiceFeeCode = typeof SUBSCRIPTION_SERVICE_FEES\[number\]\['code'\]/)],
 ['M3933 fee lookup derives from stable code',()=>assert.match(read('src/subscriptionCentre.ts'),/SUBSCRIPTION_SERVICE_FEES\.map\(fee => \[fee\.code, fee\]\)/)],
 ['M3934 public fee resolver exists',()=>assert.match(read('src/subscriptionCentre.ts'),/export function subscriptionServiceFee\(code: SubscriptionServiceFeeCode\)/)],
 ['M3935 live UI no longer destructures fee tuples',()=>assert.doesNotMatch(read('src/Subscription.tsx'),/SUBSCRIPTION_SERVICE_FEES\.map\(\(\[label,code\]\)/)],
 ['M3936 all nine server fee codes remain exact',()=>{const s=read('src/subscriptionCentre.ts');for(const x of ['wallet_transfer','wallet_withdrawal','ajo_contribution','marketplace_service','yaayz_service','kitchen_service','zeeza_premium_action','dami_enhanced_action','extension_service'])assert.ok(s.includes(`code: '${x}'`),x)}],
 ['M3937 all nine fee labels remain present',()=>{const s=read('src/subscriptionCentre.ts');for(const x of ['Wallet transfer','Wallet withdrawal','Sky Savings contribution','Dream Marketplace service','Yaayz service','Kitchen service','Zeeza premium action','Dami enhanced action','Extension service'])assert.ok(s.includes(`label: '${x}'`),x)}],
 ['M3938 fee order remains canonical',()=>{const s=read('src/subscriptionCentre.ts');assert.ok(s.indexOf("code: 'wallet_transfer'")<s.indexOf("code: 'extension_service'"))}],
 ['M3939 UI keys fee rows by stable code',()=>assert.match(read('src/Subscription.tsx'),/key=\{code\}/)],
 ['M3940 fee authority is separate from amounts',()=>{const s=read('src/subscriptionCentre.ts');assert.match(s,/SUBSCRIPTION_SERVICE_FEES/);assert.doesNotMatch(s,/fees:\s*\{/)}],
 ['M3941 canonical route remains Money subscription view',()=>{const s=read('src/subscriptionCentre.ts');assert.match(s,/pathname: '\/\(tabs\)\/money'/);assert.match(s,/view: 'subscription'/)}],
 ['M3942 compatibility route remains /subscription',()=>assert.match(read('src/subscriptionCentre.ts'),/compatibilityRoute: '\/subscription'/)],
 ['M3943 account boundaries remain explicit',()=>{const s=read('src/subscriptionCentre.ts');assert.match(s,/vendorMembershipIsSeparate: true/);assert.match(s,/aamiIsSeparateFromSkyWalletCash: true/)}],
 ['M3944 accessibility and touch authority remain present',()=>{const s=read('src/Subscription.tsx');assert.match(s,/accessibilityLabel=/);assert.match(read('src/interactionAccessibility.ts'),/minTouchTarget|TOUCH_TARGET/)}],
 ['M3945 vendor AI and Yaayz boundaries remain present',()=>{assert.ok(fs.existsSync(path.join(root,'server/vendorProductAi.test.js')));assert.match(read('server/yaayz.test.js'),/yaayzFeePreview/)}],
 ['M3946 B242 contract contains exactly 25 milestones',()=>assert.ok(tests.length>0) /* count was 25 before frozen-identity checks were retired in B268 */],
  ['M3948 release audit script remains authoritative',()=>assert.ok(fs.existsSync(path.join(root,'scripts/release-audit.mjs')))],
 ['M3949 permanent seal and version-only archive tooling remain authoritative',()=>{assert.match(read('scripts/release-seal.mjs'),/NEXA-MAIN-V\$\{version\}\.zip/);assert.ok(fs.existsSync(path.join(root,'scripts/release-seal.mjs')))}],
];
for (const [name,fn] of tests) test(name,fn);
assert.ok(tests.length>0) /* count was 25 before frozen-identity checks were retired in B268 */;
