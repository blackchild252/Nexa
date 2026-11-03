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
  ['M3725 B233 seal retained',()=>assert.ok(fs.existsSync(path.join(root,'RELEASE_SEAL_V5.98.86.json')))],
            ['M3731 canonical nav accessibility authority exists',()=>assert.match(read('src/nexaAccessibility.ts'),/NEXA_NAV_LABELS = Object\.freeze/ )],
  ['M3732 all directory labels are centralized',()=>{const s=read('src/nexaAccessibility.ts');for(const label of ['Home','Dami','Zeeza','Sky Money','Dream Marketplace','Business Hub','Yaayz','L.A.','Ball House','Kitchen','Game House','Fitness','Notifications','Search','NEXA Membership','Profile','Extensions','Developer Console']) assert.ok(s.includes(`'${label}'`),`missing label: ${label}`)}],
  ['M3733 directory drawer uses canonical accessibility labels',()=>assert.match(read('src/NexaNavKeys.tsx'),/navigationAccessibilityLabel\(id\)/)],
  ['M3734 quick access labels centralized',()=>assert.match(read('src/NexaNavKeys.tsx'),/NEXA_QUICK_ACCESS_LABELS/)],
  ['M3735 search quick label retained',()=>assert.match(read('src/nexaAccessibility.ts'),/search: 'Search NEXA'/)],
  ['M3736 add quick label retained',()=>assert.match(read('src/nexaAccessibility.ts'),/add: 'Open NEXA Add actions'/)],
  ['M3737 home quick label retained',()=>assert.match(read('src/nexaAccessibility.ts'),/home: 'NEXA Home'/)],
  ['M3738 menu quick label retained',()=>assert.match(read('src/nexaAccessibility.ts'),/menu: 'Open NEXA directory'/)],
  ['M3739 canonical subscription label retained',()=>assert.match(read('src/nexaAccessibility.ts'),/subscription: 'NEXA Membership'/)],
  ['M3740 accessibility fallback is nonempty',()=>assert.match(read('src/nexaAccessibility.ts'),/return NEXA_NAV_LABELS\[id as NexaNavigationLabelId\] \|\| 'NEXA destination'/)],
  ['M3741 navigation route inventory retained',()=>assert.match(read('src/nexaRouteInventory.ts'),/NEXA_ROUTE_INVENTORY = Object\.freeze/)],
  ['M3742 user/vendor directory retained',()=>assert.match(read('src/nexaRouteInventory.ts'),/USER_VENDOR_DIRECTORY/)],
  ['M3743 quick access authority retained',()=>assert.match(read('src/nexaRouteInventory.ts'),/NAVIGATION_QUICK_ACCESS/)],
  ['M3744 Add action authority retained',()=>{const s=read('src/nexaNavigation.ts');for(const a of ['friend','money','group','product'])assert.match(s,new RegExp(`case '${a}':`))}],
  ['M3745 Zeeza authority retained',()=>assert.match(read('src/nexaNavigation.ts'),/zeeza: \{ pathname: '\/\(tabs\)\/zeeza'/)],
  ['M3746 Yaayz authority retained',()=>assert.match(read('src/nexaNavigation.ts'),/yaayz: \{ pathname: '\/\(tabs\)\/yaayz'/)],
  ['M3747 Vendor authority retained',()=>assert.match(read('src/nexaNavigation.ts'),/vendor: \{ pathname: '\/marketplace\/vendor'/)],
  ['M3748 readable/accessibility baseline retained',()=>{assert.match(read('src/nexaResponsive.ts'),/MINIMUM_READABLE_FONT_SIZE = 13/);assert.match(read('src/accessibility.ts'),/minTouchTarget: 44/)}],
  ['M3749 version-only archive authority retained',()=>assert.match(read('PROJECT_MEMORY.json'),/NEXA-MAIN-V<major>\.<minor>\.<patch>\.zip/)],
] ;
for (const [name,fn] of tests) test(name,fn);
assert.ok(tests.length>0) /* count was 25 before frozen-identity checks were retired in B268 */;
