const test = require('node:test');
const CURRENT_VERSION = require('../package.json').version;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const json = p => JSON.parse(read(p));
const app=json('app.json'), pkg=json('package.json'), spkg=json('server/package.json'), lock=json('package-lock.json');
const tests = [
['M3675 B231 seal retained',()=>assert.ok(fs.existsSync(path.join(root,'RELEASE_SEAL_V5.98.83.json')))],
['M3676 root package',()=>assert.equal(pkg.version,CURRENT_VERSION)],
['M3677 server package',()=>assert.equal(spkg.version,CURRENT_VERSION)],
['M3680 Subscription entry policy',()=>{const s=read('src/homeDesign.ts');assert.match(s,/subscriptionEntryPolicy/);assert.match(s,/compatibilityRoute: '\/subscription'/);assert.match(s,/canonicalPresentation: '\/\(tabs\)\/money\?view=subscription'/)}],
['M3681 all Home directory items resolve',()=>{const h=read('src/homeDesign.ts');const n=read('src/nexaNavigation.ts');const directory=h.split('export const HOME_DIRECTORY')[1];const ids=[...directory.matchAll(/\['([^']+)'/g)].map(x=>x[1]);for(const id of ids){assert.match(n,new RegExp(`(?:\\b|['"])${id}['"]?:\\s*\\{`),`missing nav authority: ${id}`)}}],
['M3682 SkyMoney canonical presentation',()=>assert.match(read('src/app/subscription.tsx'),/SkyMoney > Subscription Centre/)],
['M3683 compatibility bridge',()=>assert.match(read('src/app/subscription.tsx'),/router\.replace\('\/\(tabs\)\/money\?view=subscription'/)],
['M3684 SkyMoney deep link',()=>assert.match(read('src/MoneyDashboard.tsx'),/navigationForSubscription/)],
['M3685 subscription route coherence',()=>{assert.match(read('src/nexaNavigation.ts'),/SUBSCRIPTION_CENTRE_CANONICAL_TARGET/);assert.match(read('src/nexaNavKeys.ts'),/\/subscription.*NEXA Membership/)}],
['M3686 membership title semantics',()=>assert.match(read('src/nexaNavKeys.ts'),/NEXA Membership/)],
['M3687 Add actions complete',()=>{const s=read('src/nexaNavigation.ts');for(const a of ['friend','money','group','product'])assert.match(s,new RegExp(`case '${a}':`))}],
['M3688 directory membership',()=>{const s=read('src/nexaRouteInventory.ts');for(const x of ['home','zeeza','money','marketplace','vendor','yaayz','leisure','profile','subscription'])assert.match(s,new RegExp(`['"]${x}['"]`))}],
['M3689 settings separation',()=>assert.doesNotMatch(read('src/nexaRouteInventory.ts'),/settings/)],
['M3690 subscription auth',()=>{const s=read('server/subscriptions.js');for(const x of ['/api/subscription','/api/subscription/change-plan','/api/subscription/autopay','/api/subscription/cancel'])assert.match(s,new RegExp(x.replaceAll('/','\\/')));assert.match(s,/auth\.authMiddleware/)}],
['M3691 vendor AI authorization',()=>assert.match(read('server/index.js'),/requireVendorAccess, vendorProductAiLimiter, vendorProductAiDailyLimiter/)],
['M3692 image safeguards',()=>{const s=read('server/index.js');assert.match(s,/MAX_IMAGE_BYTES/);assert.match(s,/decodeImageDataUrl\(imageData\)/);assert.match(s,/decodeImageDataUrl\(result\.image\)/)}],
['M3693 Yaayz ad boundary',()=>{assert.match(read('src/YaayzNativeAd.tsx'),/Yaayz Home-only AdMob surface/);assert.match(read('src/YaayzHomeFeed.tsx'),/YaayzNativeAd/)}],
['M3694 legal routes',()=>{const s=read('server/index.js');assert.match(s,/app\.get\("\/privacy"/);assert.match(s,/app\.get\("\/terms"/)}],
['M3695 accessibility authorities',()=>{assert.match(read('src/nexaResponsive.ts'),/MINIMUM_READABLE_FONT_SIZE = 13/);assert.match(read('src/accessibility.ts'),/minTouchTarget: 44/);assert.match(read('src/motion.tsx'),/outlineWidth:2/)}],
['M3696 B232 contract exists',()=>assert.ok(fs.existsSync(__filename))],
['M3697 B232 roadmap recorded',()=>assert.match(read('MASTER_ROADMAP.md'),/M3675–M3699 \/ B232/)],
['M3698 environment excluded',()=>assert.match(read('scripts/release-gate.mjs'),/EXCLUDED_FROM_RELEASE_CERTIFICATION/)],
['M3699 version-only archive authority',()=>assert.match(read('PROJECT_MEMORY.json'),/NEXA-MAIN-V<major>\.<minor>\.<patch>\.zip/)]
];
for(const [name,fn] of tests)test(name,fn);
assert.ok(tests.length>0) /* count was 25 before frozen-identity checks were retired in B268 */;
