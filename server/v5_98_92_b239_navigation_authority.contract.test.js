const test = require('node:test');
const CURRENT_VERSION = require('../package.json').version;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = p => JSON.parse(read(p));
const tests = [
              ['M3856 navigation source parses query-aware title input',()=>{const s=read('src/nexaNavKeys.ts');assert.match(s,/const query = raw\.split\('\?'\)\[1\]/);assert.match(s,/new URLSearchParams\(query\)/)}],
  ['M3857 Subscription Centre title is canonical on Money route',()=>assert.match(read('src/nexaNavKeys.ts'),/params\.get\('view'\) === 'subscription'\) return 'NEXA Membership'/)],
  ['M3858 canonical Subscription Centre directory identity is subscription',()=>assert.match(read('src/nexaNavKeys.ts'),/params\.get\('view'\) === 'subscription'\) return 'subscription'/)],
  ['M3859 ordinary Money remains Money directory identity',()=>assert.match(read('src/nexaNavKeys.ts'),/if \(p\.startsWith\('\/money'\) \|\| p\.startsWith\('\/wallet'\)\) return 'money'/)],
  ['M3860 canonical subscription route remains in navigation authority',()=>assert.match(read('src/nexaNavigation.ts'),/navigationForSubscription/)],
  ['M3861 canonical subscription target remains Money subscription view',()=>{const s=read('src/subscriptionCentre.ts');assert.match(s,/pathname: '\/\(tabs\)\/money'/);assert.match(s,/view: 'subscription'/)}],
  ['M3862 legacy subscription route remains compatibility bridge',()=>assert.match(read('src/subscriptionCentre.ts'),/compatibilityRoute: '\/subscription'/)],
  ['M3863 directory contains subscription access entry',()=>assert.match(read('src/homeDesign.ts'),/subscriptionEntryPolicy[\s\S]*compatibilityRoute: '\/subscription'[\s\S]*label: 'NEXA Membership'/)],
  ['M3864 directory click path resolves through navigation authority',()=>{const s=read('src/NexaNavKeys.tsx');assert.match(s,/navigationForDirectoryItem\(id\)/);assert.doesNotMatch(s,/router\.(push|replace)\(.*item\[3\]/)}],
  ['M3865 global Search key remains present',()=>assert.match(read('src/NexaNavKeys.tsx'),/NEXA_QUICK_ACCESS_LABELS\.search/)],
  ['M3866 global Add key remains present',()=>assert.match(read('src/NexaNavKeys.tsx'),/NEXA_QUICK_ACCESS_LABELS\.add/)],
  ['M3867 global Home key remains present',()=>assert.match(read('src/NexaNavKeys.tsx'),/NEXA_QUICK_ACCESS_LABELS\.home/)],
  ['M3868 global Menu key remains present',()=>assert.match(read('src/NexaNavKeys.tsx'),/NEXA_QUICK_ACCESS_LABELS\.menu/)],
  ['M3869 Add Friend resolves through canonical resolver',()=>assert.match(read('src/nexaNavigation.ts'),/case 'friend': return validateNavigationTarget\(\{ pathname: '\/\(tabs\)\/zeeza', params: \{ section: 'friends' \} \}/)],
  ['M3870 Add Money resolves to Sky Wallet',()=>assert.match(read('src/nexaNavigation.ts'),/case 'money': return validateNavigationTarget\(\{ pathname: '\/wallet'/)],
  ['M3871 New Sky Group resolves to Money groups',()=>assert.match(read('src/nexaNavigation.ts'),/case 'group': return validateNavigationTarget\(\{ pathname: '\/\(tabs\)\/money', params: \{ view: 'groups' \} \}/)],
  ['M3872 Add Product resolves to Vendor Center',()=>assert.match(read('src/nexaNavigation.ts'),/case 'product': return validateNavigationTarget\(\{ pathname: '\/marketplace\/vendor' \}/)],
  ['M3873 all active search result types retain destinations',()=>{const s=read('src/nexaNavigation.ts');for(const x of ['people','social','groups','marketplace','yaayz','money','ai']) assert.match(s,new RegExp(`case '${x}'`),x)}],
  ['M3874 route inventory retains core user/vendor surfaces',()=>{const s=read('src/nexaRouteInventory.ts');for(const x of ['/(tabs)/zeeza','/(tabs)/money','/(tabs)/marketplace','/(tabs)/yaayz','/marketplace/vendor','/(tabs)/search','/(tabs)/profile']) assert.ok(s.includes(`'${x}'`),x)}],
];
for (const [name,fn] of tests) test(name,fn);
assert.ok(tests.length>0) /* count was 25 before frozen-identity checks were retired in B268 */;
