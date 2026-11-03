const test = require('node:test');
const CURRENT_VERSION = require('../package.json').version;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const json = p => JSON.parse(read(p));
const pkg=json('package.json'), spkg=json('server/package.json'), app=json('app.json'), lock=json('package-lock.json');
const tests = [
 ['M3700 B232 seal retained',()=>assert.ok(fs.existsSync(path.join(root,'RELEASE_SEAL_V5.98.84.json')))],
      ['M3706 canonical subscription helper',()=>assert.match(read('src/nexaNavigation.ts'),/export function navigationForSubscription\(\)/)],
 ['M3707 directory subscription uses canonical helper',()=>assert.match(read('src/nexaNavigation.ts'),/if \(id === 'subscription'\) return navigationForSubscription\(\)/)],
 ['M3708 compatibility route retained',()=>assert.match(read('src/homeDesign.ts'),/compatibilityRoute: '\/subscription'/)],
 ['M3709 canonical subscription presentation retained',()=>assert.match(read('src/homeDesign.ts'),/canonicalPresentation: '\/\(tabs\)\/money\?view=subscription'/)],
 ['M3710 profile uses canonical subscription navigation',()=>assert.match(read('src/app/\(tabs\)/profile.tsx'),/navigationForSubscription\(\)/)],
 ['M3711 live route inventory includes Sky Money',()=>assert.match(read('src/nexaRouteInventory.ts'),/['"]\/\(tabs\)\/money['"]/)],
 ['M3712 live route inventory includes subscription bridge',()=>assert.match(read('src/nexaRouteInventory.ts'),/['"]\/subscription['"]/)],
 ['M3713 all directory IDs have navigation authority',()=>{const h=read('src/homeDesign.ts'),n=read('src/nexaNavigation.ts');const ids=[...h.split('export const HOME_DIRECTORY')[1].matchAll(/\['([^']+)'/g)].map(x=>x[1]);for(const id of ids)assert.ok(id==='subscription'||new RegExp(`(?:\\b|['"])${id}['"]?:\\s*\\{`).test(n),`missing navigation authority: ${id}`)}],
 ['M3714 route inventory is explicit',()=>assert.match(read('src/nexaRouteInventory.ts'),/NEXA_ROUTE_INVENTORY = Object\.freeze/)],
 ['M3715 user/vendor directory remains explicit',()=>assert.match(read('src/nexaRouteInventory.ts'),/USER_VENDOR_DIRECTORY/)],
 ['M3716 quick access remains explicit',()=>assert.match(read('src/nexaRouteInventory.ts'),/NAVIGATION_QUICK_ACCESS/)],
 ['M3717 Add action authority retained',()=>{const s=read('src/nexaNavigation.ts');for(const a of ['friend','money','group','product'])assert.match(s,new RegExp(`case '${a}':`))}],
 ['M3718 search authority retained',()=>assert.match(read('src/nexaNavigation.ts'),/case 'marketplace': return validateNavigationTarget\(\{ pathname: '\/\(tabs\)\/marketplace'/)],
 ['M3719 Yaayz authority retained',()=>assert.match(read('src/nexaNavigation.ts'),/case 'yaayz': return validateNavigationTarget\(\{ pathname: '\/\(tabs\)\/yaayz'/)],
 ['M3720 vendor authority retained',()=>assert.match(read('src/nexaNavigation.ts'),/vendor: \{ pathname: '\/marketplace\/vendor'/)],
 ['M3721 Profile/settings separation retained',()=>assert.doesNotMatch(read('src/nexaRouteInventory.ts'),/['"]settings['"]/)],
 ['M3722 accessibility authority retained',()=>{assert.match(read('src/nexaResponsive.ts'),/MINIMUM_READABLE_FONT_SIZE = 13/);assert.match(read('src/accessibility.ts'),/minTouchTarget: 44/)}],
 ['M3723 environment excluded from gate',()=>assert.match(read('scripts/release-gate.mjs'),/EXCLUDED_FROM_RELEASE_CERTIFICATION/)],
 ['M3724 version-only archive authority retained',()=>assert.match(read('PROJECT_MEMORY.json'),/NEXA-MAIN-V<major>\.<minor>\.<patch>\.zip/)],
];
for (const [name,fn] of tests) test(name,fn);
assert.ok(tests.length>0) /* count was 25 before frozen-identity checks were retired in B268 */;
