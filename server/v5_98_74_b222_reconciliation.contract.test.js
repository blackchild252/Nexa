const test = require('node:test');
const CURRENT_VERSION = require('../package.json').version;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const json = p => JSON.parse(read(p));

const nav = () => read('src/nexaNavigation.ts');
const keys = () => read('src/nexaNavKeys.ts');
const inventory = () => read('src/nexaRouteInventory.ts');
const motion = () => read('src/motion.tsx');

// M3425–M3449: internal-only cumulative reconciliation. Environment/deployment is excluded.
test('M3425 verified source is B221 and the successor roadmap is B222',()=>{assert.match(read('B221_REPORT.md'),/B221/);assert.match(read('MASTER_ROADMAP.md'),/M3425–M3449 \/ B222/);});
test('M3427 Expo/server/lock identities are B222',()=>{assert.equal(json('app.json').expo.version,CURRENT_VERSION);assert.equal(json('server/package.json').version,CURRENT_VERSION);assert.equal(json('package-lock.json').version,CURRENT_VERSION);assert.equal(json('package-lock.json').packages[''].version,CURRENT_VERSION);});
test('M3428 search navigation rejects missing result identifiers',()=>assert.match(nav(),/if \(!id \|\| id === 'undefined' \|\| id === 'null'\) return null/));
test('M3429 search navigation keeps all active server result types',()=>{for(const type of ['people','groups','marketplace','yaayz','money','ai']) assert.match(nav(),new RegExp(`case '${type}'`));});
test('M3430 directory ownership has one vendor branch',()=>{const s=keys();assert.equal((s.match(/startsWith\('\/marketplace\/vendor'\).*return 'vendor'/g)||[]).length,1);});
test('M3431 route inventory exists as canonical source',()=>assert.match(inventory(),/NEXA_ROUTE_INVENTORY/));
test('M3432 Add remains a declared quick-access key and canonical resolver',()=>{assert.match(inventory(),/\['search','add','home','menu'\]/);assert.match(nav(),/function navigationForAddAction/);});
test('M3433 Search remains a declared quick-access key and resolver',()=>{assert.match(inventory(),/\['search','add','home','menu'\]/);assert.match((read('src/NexaNavKeys.tsx')+read('src/nexaAccessibility.ts')),/Search NEXA/);assert.match(nav(),/function navigationForSearchResult/);});
test('M3434 Home remains globally reachable',()=>assert.match(nav(),/home: \{ pathname: '\/\(tabs\)' \}/));
test('M3435 Zeeza and Yaayz remain directory destinations',()=>{assert.match(nav(),/zeeza: \{ pathname: '\/\(tabs\)\/zeeza' \}/);assert.match(nav(),/yaayz: \{ pathname: '\/\(tabs\)\/yaayz' \}/);});
test('M3436 Vendor Center remains independently reachable',()=>assert.match(nav(),/vendor: \{ pathname: '\/marketplace\/vendor' \}/));
test('M3437 Money and Wallet remain reachable',()=>{assert.match(nav(),/money: \{ pathname: '\/\(tabs\)\/money' \}/);assert.match(nav(),/pathname: '\/wallet'/);});
test('M3438 Leisure child routes remain inventoried',()=>{for(const route of ['\/leisure\/ball-house','\/leisure\/kitchen','\/leisure\/game-house','\/leisure\/fitness']) assert.match(inventory(),new RegExp(route.replaceAll('/','\\/')));});
test('M3439 notification routing remains canonical',()=>assert.match(nav(),/function navigationForNotification/));
test('M3440 back navigation always has a Home fallback',()=>assert.match(keys(),/return canGoBack \? 'back' : 'home'/));
test('M3441 canonical micro typography is at least 13px',()=>assert.match(read('src/theme.ts'),/micro: \{[^\n]*fontSize: 15, lineHeight: 18/));
test('M3442 device text scaling remains enabled',()=>assert.match(read('src/NexaTextSizeControl.tsx'),/Device accessibility scaling still applies/));
test('M3443 minimum touch target remains centralized',()=>assert.match(read('src/interactionAccessibility.ts'),/minTouchTarget/));
test('M3444 reduced motion remains authoritative',()=>assert.match(motion(),/reducedMotion/));
test('M3445 motion components retain animation cleanup',()=>{assert.match(motion(),/animation\.stop\(\)/);assert.match(motion(),/stopNexaAnimations/);});
test('M3446 vendor AI credential and ownership boundaries remain active',()=>{const s=read('server/index.js');assert.match(s,/auth\.authMiddleware, requireVendorAccess, vendorProductAiLimiter/);assert.match(s,/decodeImageDataUrl\(result\.image\)/);assert.doesNotMatch(read('src/VendorPhotos.tsx'),/OPENAI_API_KEY/);});
test('M3447 cumulative privacy financial social contracts remain registered',()=>{const s=read('scripts/release-gate.mjs');for(const f of ['v5_98_65_b213_identity_privacy.contract.test.js','v5_98_65_b213_skymoney_membership.contract.test.js','v5_98_65_b213_social_ai.contract.test.js']) assert.match(s,new RegExp(f.replaceAll('.','\\.')));});
test('M3448 historical B221 contract remains immutable evidence and is excluded from the active gate',()=>{assert.ok(fs.existsSync(path.join(root,'server/v5_98_73_b221_stabilization.contract.test.js')));assert.doesNotMatch(read('scripts/release-gate.mjs'),/v5_98_73_b221_stabilization\.contract\.test\.js/);assert.match(read('scripts/release-gate.mjs'),/EXCLUDED_FROM_RELEASE_CERTIFICATION/);});
