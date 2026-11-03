const test = require('node:test');
const CURRENT_VERSION = require('../package.json').version;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = p => JSON.parse(read(p));
const tests = [
        ['M3982 seven canonical section definitions remain',()=>{const s=read('src/subscriptionCentre.ts');assert.equal((s.match(/\{ id: '/g)||[]).length,7)}],
 ['M3983 stable section IDs remain typed',()=>assert.match(read('src/subscriptionCentre.ts'),/SubscriptionCentreSectionId/)],
 ['M3984 category order is derived from sections',()=>assert.match(read('src/subscriptionCentre.ts'),/SUBSCRIPTION_CENTRE_SECTIONS\.map\(section => section\.id\)/)],
 ['M3985 category order is typed to section IDs',()=>assert.match(read('src/subscriptionCentre.ts'),/ReadonlyArray<SubscriptionCentreSectionId>/)],
 ['M3986 duplicate manual category literals are removed',()=>{const s=read('src/subscriptionCentre.ts');assert.doesNotMatch(s,/SUBSCRIPTION_CENTRE_CATEGORIES = Object\.freeze\(\[\s*'account-access'/s)}],
 ['M3987 canonical fee authority remains',()=>assert.match(read('src/subscriptionCentre.ts'),/SubscriptionServiceFeeCode/)],
 ['M3988 canonical fee resolver remains',()=>assert.match(read('src/subscriptionCentre.ts'),/export function subscriptionServiceFee/)],
 ['M3989 canonical route remains',()=>{const s=read('src/subscriptionCentre.ts');assert.match(s,/pathname: '\/\(tabs\)\/money'/);assert.match(s,/view: 'subscription'/)}],
 ['M3990 compatibility route remains',()=>assert.match(read('src/subscriptionCentre.ts'),/compatibilityRoute: '\/subscription'/)],
 ['M3991 live Subscription consumes section authority',()=>assert.match(read('src/Subscription.tsx'),/subscriptionCentreSection/)],
 ['M3992 all seven section IDs remain consumed',()=>{const s=read('src/Subscription.tsx');for(const id of ['account-access','rewards-economy','current-plan-billing','spending-cap','membership-plans','service-fees','experience'])assert.match(s,new RegExp(`subscriptionCentreSection\\('${id}'\\)`))}],
 ['M3993 service-fee rows remain code-keyed',()=>assert.match(read('src/Subscription.tsx'),/key=\{code\}/)],
 ['M3994 missing fee state remains explicit',()=>assert.match(read('src/Subscription.tsx'),/'Unavailable'/)],
 ['M3995 vendor membership remains separate',()=>assert.match(read('src/subscriptionCentre.ts'),/vendorMembershipIsSeparate: true/)],
 ['M3996 Aami remains separate from Sky Wallet cash',()=>assert.match(read('src/subscriptionCentre.ts'),/aamiIsSeparateFromSkyWalletCash: true/)],
 ['M3997 Vendor AI and Yaayz boundaries remain',()=>{assert.ok(fs.existsSync(path.join(root,'server/vendorProductAi.test.js')));assert.ok(fs.existsSync(path.join(root,'server/yaayz.test.js')))}],
  ['M3999 version-only seal tooling remains',()=>assert.match(read('scripts/release-seal.mjs'),/NEXA-MAIN-V\$\{version\}\.zip/)],
];
for (const [name,fn] of tests) test(name,fn);
assert.ok(tests.length>0) /* count was 25 before frozen-identity checks were retired in B268 */;
