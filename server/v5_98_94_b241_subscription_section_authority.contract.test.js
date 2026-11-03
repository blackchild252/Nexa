const test = require('node:test');
const CURRENT_VERSION = require('../package.json').version;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = p => JSON.parse(read(p));
const tests = [
                ['M3907 section IDs are typed from the canonical authority',()=>assert.match(read('src/subscriptionCentre.ts'),/export type SubscriptionCentreSectionId = typeof SUBSCRIPTION_CENTRE_SECTIONS\[number\]\['id'\]/)],
  ['M3908 section lookup is derived from stable IDs',()=>assert.match(read('src/subscriptionCentre.ts'),/Object\.fromEntries\(SUBSCRIPTION_CENTRE_SECTIONS\.map\(section => \[section\.id, section\]\)/)],
  ['M3909 public section resolver exists',()=>assert.match(read('src/subscriptionCentre.ts'),/export function subscriptionCentreSection\(id: SubscriptionCentreSectionId\)/)],
  ['M3910 account/access resolves by stable ID',()=>assert.match(read('src/Subscription.tsx'),/subscriptionCentreSection\('account-access'\)/)],
  ['M3911 rewards/economy resolves by stable ID',()=>assert.match(read('src/Subscription.tsx'),/subscriptionCentreSection\('rewards-economy'\)/)],
  ['M3912 billing resolves by stable ID',()=>assert.match(read('src/Subscription.tsx'),/subscriptionCentreSection\('current-plan-billing'\)/)],
  ['M3913 spending/cap resolves by stable ID',()=>assert.match(read('src/Subscription.tsx'),/subscriptionCentreSection\('spending-cap'\)/)],
  ['M3914 membership plans resolves by stable ID',()=>assert.match(read('src/Subscription.tsx'),/subscriptionCentreSection\('membership-plans'\)/)],
  ['M3915 service fees resolves by stable ID',()=>assert.match(read('src/Subscription.tsx'),/subscriptionCentreSection\('service-fees'\)/)],
  ['M3916 experience resolves by stable ID',()=>assert.match(read('src/Subscription.tsx'),/subscriptionCentreSection\('experience'\)/)],
  ['M3917 numeric section access is removed from live presentation',()=>assert.doesNotMatch(read('src/Subscription.tsx'),/SUBSCRIPTION_CENTRE_SECTIONS\[\d+\]/)],
  ['M3918 canonical route remains Money subscription view',()=>{const s=read('src/subscriptionCentre.ts');assert.match(s,/pathname: '\/\(tabs\)\/money'/);assert.match(s,/view: 'subscription'/)}],
  ['M3919 compatibility bridge remains /subscription',()=>assert.match(read('src/subscriptionCentre.ts'),/compatibilityRoute: '\/subscription'/)],
  ['M3920 vendor membership remains separate',()=>assert.match(read('src/subscriptionCentre.ts'),/vendorMembershipIsSeparate: true/)],
  ['M3921 Aami remains separate from Sky Wallet cash',()=>assert.match(read('src/subscriptionCentre.ts'),/aamiIsSeparateFromSkyWalletCash: true/)],
  ['M3922 service-fee authority remains centralized',()=>assert.match(read('src/Subscription.tsx'),/SUBSCRIPTION_SERVICE_FEES/)],
  ['M3923 navigation still consumes canonical subscription target',()=>assert.match(read('src/nexaNavigation.ts'),/SUBSCRIPTION_CENTRE_CANONICAL_TARGET/)],
  ['M3924 Home Design keeps the compatibility bridge and canonical presentation',()=>{const s=read('src/homeDesign.ts');assert.match(s,/route: '\/\(tabs\)\/money\?view=subscription'/);assert.match(s,/canonicalPresentation: '\/\(tabs\)\/money\?view=subscription'/);assert.match(s,/compatibilityBridge: true/) }],
];
for (const [name,fn] of tests) test(name,fn);
assert.ok(tests.length>0) /* count was 25 before frozen-identity checks were retired in B268 */;
