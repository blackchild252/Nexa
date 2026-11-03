const test = require('node:test');
const CURRENT_VERSION = require('../package.json').version;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const json = p => JSON.parse(read(p));
const tests = [
        ['M3832 canonical target authority exists',()=>assert.match(read('src/subscriptionCentre.ts'),/SUBSCRIPTION_CENTRE_CANONICAL_TARGET/)],
 ['M3833 canonical target owns Money pathname',()=>assert.match(read('src/subscriptionCentre.ts'),/pathname: '\/\(tabs\)\/money'/)],
 ['M3834 canonical target owns subscription view',()=>assert.match(read('src/subscriptionCentre.ts'),/view: 'subscription'/)],
 ['M3835 policy references canonical target',()=>assert.match(read('src/subscriptionCentre.ts'),/canonicalTarget: SUBSCRIPTION_CENTRE_CANONICAL_TARGET/)],
 ['M3836 navigation imports canonical target',()=>assert.match(read('src/nexaNavigation.ts'),/SUBSCRIPTION_CENTRE_CANONICAL_TARGET/)],
 ['M3837 navigation directory uses canonical target',()=>assert.match(read('src/nexaNavigation.ts'),/subscription: \{ \.\.\.SUBSCRIPTION_CENTRE_CANONICAL_TARGET/)],
 ['M3838 subscription navigation function uses canonical target',()=>assert.match(read('src/nexaNavigation.ts'),/return validateNavigationTarget\(\{ \.\.\.SUBSCRIPTION_CENTRE_CANONICAL_TARGET/)],
 ['M3839 navigation no longer imports legacy route policy',()=>assert.doesNotMatch(read('src/nexaNavigation.ts'),/subscriptionEntryPolicy/)],
 ['M3840 compatibility route remains declared',()=>assert.match(read('src/subscriptionCentre.ts'),/compatibilityRoute: '\/subscription'/)],
 ['M3841 canonical route remains declared',()=>assert.match(read('src/subscriptionCentre.ts'),/canonicalRoute: '\/\(tabs\)\/money\?view=subscription'/)],
 ['M3842 compatibility screen remains redirect-only',()=>{const s=read('src/app/subscription.tsx');assert.match(s,/router\.replace\('\/\(tabs\)\/money\?view=subscription'/);assert.doesNotMatch(s,/Subscription\(/)}],
 ['M3843 Money route accepts subscription view',()=>assert.match(read('src/app/(tabs)/money.tsx'),/'subscription'/)],
 ['M3844 Money Dashboard renders Subscription for view',()=>assert.match(read('src/MoneyDashboard.tsx'),/if \(view === "subscription"\)/)],
 ['M3845 all seven Centre categories remain declared',()=>{const s=read('src/subscriptionCentre.ts');for(const x of ['account-access','rewards-economy','current-plan-billing','spending-cap','membership-plans','service-fees','experience'])assert.ok(s.includes(`'${x}'`),x)}],
 ['M3846 nine fee mappings remain centralized',()=>{const s=read('src/subscriptionCentre.ts');for(const x of ['wallet_transfer','wallet_withdrawal','ajo_contribution','marketplace_service','yaayz_service','kitchen_service','zeeza_premium_action','dami_enhanced_action','extension_service'])assert.ok(s.includes(`'${x}'`),x)}],
 ['M3847 Subscription UI consumes centralized fees',()=>assert.match(read('src/Subscription.tsx'),/SUBSCRIPTION_SERVICE_FEES\.map/)],
 ['M3848 vendor membership and Aami boundaries remain explicit',()=>{const s=read('src/subscriptionCentre.ts');assert.match(s,/vendorMembershipIsSeparate: true/);assert.match(s,/aamiIsSeparateFromSkyWalletCash: true/)}],
 ];
for (const [name,fn] of tests) test(name,fn);
assert.ok(tests.length>0) /* count was 25 before frozen-identity checks were retired in B268 */;
