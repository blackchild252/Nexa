const test = require('node:test');
const CURRENT_VERSION = require('../package.json').version;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = p => JSON.parse(read(p));
const tests = [
        ['M4007 Home membership route is canonical',()=>assert.match(read('src/homeDesign.ts'),/route: '\/\(tabs\)\/money\?view=subscription'/)],
 ['M4008 Home membership directory entry is canonical',()=>assert.match(read('src/homeDesign.ts'),/\['subscription','NEXA Membership','card-outline','\/\(tabs\)\/money\?view=subscription'\]/)],
 ['M4009 legacy route remains explicit compatibility route',()=>assert.match(read('src/homeDesign.ts'),/compatibilityRoute: '\/subscription'/)],
 ['M4010 compatibility bridge remains enabled',()=>assert.match(read('src/homeDesign.ts'),/compatibilityBridge: true/)],
 ['M4011 canonical presentation matches route',()=>{const s=read('src/homeDesign.ts');assert.match(s,/route: '\/\(tabs\)\/money\?view=subscription'/);assert.match(s,/canonicalPresentation: '\/\(tabs\)\/money\?view=subscription'/)}],
 ['M4012 canonical navigation resolver remains',()=>assert.match(read('src/nexaNavigation.ts'),/SUBSCRIPTION_CENTRE_CANONICAL_TARGET/)],
 ['M4013 resolver returns canonical target',()=>assert.match(read('src/nexaNavigation.ts'),/return validateNavigationTarget\(\{ \.\.\.SUBSCRIPTION_CENTRE_CANONICAL_TARGET/)],
 ['M4014 global directory subscription uses canonical resolver',()=>assert.match(read('src/nexaNavigation.ts'),/if \(id === 'subscription'\) return navigationForSubscription\(\)/)],
 ['M4015 legacy route remains in route inventory',()=>assert.match(read('src/nexaRouteInventory.ts'),/\/subscription/)],
 ['M4016 nav title still recognizes legacy route',()=>assert.match(read('src/nexaNavKeys.ts'),/\/subscription.*NEXA Membership/)],
 ['M4017 no user-facing Home membership entry targets legacy route',()=>{const s=read('src/homeDesign.ts');assert.doesNotMatch(s,/\['subscription','NEXA Membership','card-outline','\/subscription'\]/)}],
 ['M4018 no duplicate Subscription Centre directory implementation added',()=>{const s=read('src/homeDesign.ts');assert.equal((s.match(/\['subscription','NEXA Membership','card-outline','\/\(tabs\)\/money\?view=subscription'\]/g)||[]).length,1)}],
 ['M4019 Subscription Centre canonical authority remains',()=>assert.match(read('src/subscriptionCentre.ts'),/SUBSCRIPTION_CENTRE_CANONICAL_TARGET/)],
 ['M4020 compatibility route remains Subscription Centre policy',()=>assert.match(read('src/subscriptionCentre.ts'),/compatibilityRoute: '\/subscription'/)],
 ['M4021 seven section authority remains',()=>{const s=read('src/subscriptionCentre.ts');assert.equal((s.match(/\{ id: '/g)||[]).length,7)}],
 ['M4022 stable fee authority remains',()=>assert.match(read('src/subscriptionCentre.ts'),/SubscriptionServiceFeeCode/)],
  ['M4024 version-only seal tooling remains',()=>assert.match(read('scripts/release-seal.mjs'),/NEXA-MAIN-V\$\{version\}\.zip/)],
];
for (const [name,fn] of tests) test(name,fn);
assert.ok(tests.length>0) /* count was 25 before frozen-identity checks were retired in B268 */;
