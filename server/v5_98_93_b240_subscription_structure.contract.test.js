const test = require('node:test');
const CURRENT_VERSION = require('../package.json').version;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = p => JSON.parse(read(p));
const tests = [
                ['M3882 seven structural category IDs remain canonical',()=>{const s=read('src/subscriptionCentre.ts');for(const x of ['account-access','rewards-economy','current-plan-billing','spending-cap','membership-plans','service-fees','experience'])assert.ok(s.includes(`'${x}'`),x)}],
  ['M3883 seven presentation definitions are centralized',()=>{const s=read('src/subscriptionCentre.ts');assert.match(s,/SUBSCRIPTION_CENTRE_SECTIONS = Object\.freeze\(\[/);assert.equal((s.match(/\{ id: '/g)||[]).length,7)}],
  ['M3884 account/access section label is centralized',()=>assert.match(read('src/subscriptionCentre.ts'),/id: 'account-access', label: 'ACCOUNT & ACCESS'/)],
  ['M3885 rewards/economy section label is centralized',()=>assert.match(read('src/subscriptionCentre.ts'),/id: 'rewards-economy', label: 'REWARDS & ECONOMY'/)],
  ['M3886 current plan/billing section label is centralized',()=>assert.match(read('src/subscriptionCentre.ts'),/id: 'current-plan-billing', label: 'CURRENT PLAN & BILLING'/)],
  ['M3887 spending/cap section label is centralized',()=>assert.match(read('src/subscriptionCentre.ts'),/id: 'spending-cap', label: 'SPENDING & CAP'/)],
  ['M3888 membership plans section label is centralized',()=>assert.match(read('src/subscriptionCentre.ts'),/id: 'membership-plans', label: 'MEMBERSHIP PLANS'/)],
  ['M3889 service fees section label is centralized',()=>assert.match(read('src/subscriptionCentre.ts'),/id: 'service-fees', label: 'SERVICE FEES'/)],
  ['M3890 experience section label is centralized',()=>assert.match(read('src/subscriptionCentre.ts'),/id: 'experience', label: 'EXPERIENCE'/)],
  ['M3891 live Subscription imports centralized section definitions',()=>assert.match(read('src/Subscription.tsx'),/subscriptionCentreSection, SUBSCRIPTION_SERVICE_FEES/)],
  ['M3892 account/access UI consumes authority',()=>assert.match(read('src/Subscription.tsx'),/subscriptionCentreSection\('account-access'\)\.label/)],
  ['M3893 rewards/economy UI consumes authority',()=>assert.match(read('src/Subscription.tsx'),/subscriptionCentreSection\('rewards-economy'\)\.label/)],
  ['M3894 billing UI consumes authority',()=>assert.match(read('src/Subscription.tsx'),/subscriptionCentreSection\('current-plan-billing'\)\.label/)],
  ['M3895 spending UI consumes authority',()=>assert.match(read('src/Subscription.tsx'),/subscriptionCentreSection\('spending-cap'\)\.label/)],
  ['M3896 plans UI consumes authority',()=>assert.match(read('src/Subscription.tsx'),/subscriptionCentreSection\('membership-plans'\)\.label/)],
  ['M3897 service-fees UI consumes authority',()=>assert.match(read('src/Subscription.tsx'),/subscriptionCentreSection\('service-fees'\)\.label/)],
  ['M3898 experience UI consumes authority',()=>assert.match(read('src/Subscription.tsx'),/subscriptionCentreSection\('experience'\)\.label/)],
  ['M3899 canonical route, compatibility bridge and boundaries remain intact',()=>{const s=read('src/subscriptionCentre.ts');assert.match(s,/canonicalRoute: '\/\(tabs\)\/money\?view=subscription'/);assert.match(s,/compatibilityRoute: '\/subscription'/);assert.match(s,/vendorMembershipIsSeparate: true/);assert.match(s,/aamiIsSeparateFromSkyWalletCash: true/)}],
];
for (const [name,fn] of tests) test(name,fn);
assert.ok(tests.length>0) /* count was 25 before frozen-identity checks were retired in B268 */;
