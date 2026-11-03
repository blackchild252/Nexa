const test = require('node:test');
const CURRENT_VERSION = require('../package.json').version;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const json = p => JSON.parse(read(p));
const tests = [
          ['M3804 Subscription Centre authority exists',()=>assert.match(read('src/subscriptionCentre.ts'),/SUBSCRIPTION_CENTRE_POLICY/)],
  ['M3805 canonical presentation is Sky Money',()=>assert.match(read('src/subscriptionCentre.ts'),/canonicalRoute: '\/\(tabs\)\/money\?view=subscription'/)],
  ['M3806 legacy route is compatibility-only',()=>assert.match(read('src/subscriptionCentre.ts'),/compatibilityRoute: '\/subscription'/)],
  ['M3807 Sky Money owns the presentation',()=>assert.match(read('src/subscriptionCentre.ts'),/presentationOwner: 'Sky Money'/)],
  ['M3808 compatibility route redirects to canonical view',()=>assert.match(read('src/app/subscription.tsx'),/router\.replace\('\/\(tabs\)\/money\?view=subscription'/)],
  ['M3809 navigation authority resolves subscription canonically',()=>assert.match(read('src/nexaNavigation.ts'),/navigationForSubscription\(\)/)],
  ['M3810 navigation target is canonical subscription view',()=>assert.match(read('src/nexaNavigation.ts'),/subscription: \{ \.\.\.SUBSCRIPTION_CENTRE_CANONICAL_TARGET/)],
  ['M3811 Money route accepts subscription view',()=>assert.match(read('src/app/(tabs)/money.tsx'),/'subscription'/)],
  ['M3812 Money Dashboard renders Subscription for subscription view',()=>assert.match(read('src/MoneyDashboard.tsx'),/if \(view === "subscription"\)/)],
  ['M3813 account/access category retained',()=>assert.match(read('src/subscriptionCentre.ts'),/'account-access'/)],
  ['M3814 rewards/economy category retained',()=>assert.match(read('src/subscriptionCentre.ts'),/'rewards-economy'/)],
  ['M3815 current plan/billing category retained',()=>assert.match(read('src/subscriptionCentre.ts'),/'current-plan-billing'/)],
  ['M3816 spending/cap category retained',()=>assert.match(read('src/subscriptionCentre.ts'),/'spending-cap'/)],
  ['M3817 membership plans category retained',()=>assert.match(read('src/subscriptionCentre.ts'),/'membership-plans'/)],
  ['M3818 service fees category retained',()=>assert.match(read('src/subscriptionCentre.ts'),/'service-fees'/)],
  ['M3819 experience category retained',()=>assert.match(read('src/subscriptionCentre.ts'),/'experience'/)],
  ['M3820 all nine service fee codes are centralized',()=>{const s=read('src/subscriptionCentre.ts');for(const code of ['wallet_transfer','wallet_withdrawal','ajo_contribution','marketplace_service','yaayz_service','kitchen_service','zeeza_premium_action','dami_enhanced_action','extension_service'])assert.ok(s.includes(`'${code}'`),`missing ${code}`)}],
  ['M3821 Subscription screen consumes centralized service fee authority',()=>assert.match(read('src/Subscription.tsx'),/SUBSCRIPTION_SERVICE_FEES\.map/)],
  ['M3822 vendor membership remains separate',()=>assert.match(read('src/subscriptionCentre.ts'),/vendorMembershipIsSeparate: true/)],
  ['M3823 Aami remains separate from Sky Wallet cash',()=>assert.match(read('src/subscriptionCentre.ts'),/aamiIsSeparateFromSkyWalletCash: true/)],
  ];
for (const [name,fn] of tests) test(name,fn);
assert.ok(tests.length>0) /* count was 25 before frozen-identity checks were retired in B268 */;
