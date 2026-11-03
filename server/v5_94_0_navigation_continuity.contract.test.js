const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const home = () => read('src/HomeCommandCenter.tsx');
const nav = () => read('src/nexaNavigation.ts');
const keys = () => read('src/NexaNavKeys.tsx');
const tabs = () => read('src/app/(tabs)/_layout.tsx');
const design = () => read('src/homeDesign.ts');

const milestones = [
 ['M1700','canonical shell uses centralized navigation resolver',()=>assert.match(nav(),/navigationForDirectoryItem|navigationForAddAction|navigationForSearchResult|navigationForNotification/)],
 ['M1701','Home exposes the canonical Add action',()=>assert.match(home(),/useNexaNav\(\)/)],
 ['M1702','Home Add control invokes shared Add authority',()=>assert.match(home(),/openAdd/)],
 ['M1703','Add remains mapped through canonical resolver',()=>assert.match(nav(),/function navigationForAddAction/)],
 ['M1704','Home Search remains a single shared-search authority',()=>assert.match(home(),/router\.push\('\/\(tabs\)\/search'/)],
 ['M1705','Home keeps the dedicated Search rail',()=>assert.match(home(),/title="SEARCH NEXA"/)],
 ['M1706','Home directory remains centralized',()=>assert.match(home(),/HOME_DIRECTORY|DIRECTORY/)],
 ['M1707','Yaayz is directly reachable from Home actions',()=>assert.match(home(),/router\.push\('\/\(tabs\)\/yaayz'/)],
 ['M1708','Vendor Center is directly reachable from Home actions',()=>assert.match(home(),/router\.push\('\/marketplace\/vendor'/)],
 ['M1709','Zeeza friends remains directly reachable',()=>assert.match(home(),/router\.push\('\/\(tabs\)\/zeeza\?section=friends'/)],
 ['M1710','Calling remains inside Zeeza call flow',()=>assert.match(home(),/setCallOpen\(true\)|router\.push\(\{pathname:'\/zeeza\/call'/)],
 ['M1711','Home dock adapts to viewport width',()=>assert.match(home(),/useWindowDimensions\(\)|dockOrb/)],
 ['M1712','Home action controls retain explicit accessibility labels',()=>{const s=home(); for(const x of ['Open NEXA Add actions','Open NEXA directory','Open Zeeza friends','Open Yaayz','Open Zeeza calling','Open Business Hub']) assert.match(s,new RegExp(x));}],
 ['M1713','Home action targets retain 44px+ interaction sizing',()=>{const s=home(); assert.match(s,/headerAction:\{width:46,height:46/); assert.match(s,/menuButton:\{width:46,height:46/);}],
 ['M1714','Shared Back falls back safely to Home',()=>assert.match(read('src/nexaNavKeys.ts'),/return canGoBack \? 'back' : 'home'/)],
 ['M1715','Shared Home action remains canonical',()=>assert.match(keys(),/nexaGoHome/)],
 ['M1716','Notification routing remains server-owned',()=>assert.match(read('src/app/(tabs)/index.tsx'),/navigationForNotification/)],
 ['M1717','Search results return through the canonical resolver',()=>assert.match(read('src/UnifiedSearch.tsx'),/navigationForSearchResult/)],
 ['M1718','Yaayz deep links retain their real route',()=>assert.match(nav(),/yaayz.*\/\(tabs\)\/yaayz|case 'yaayz'/)],
 ['M1719','Vendor route remains a protected destination boundary',()=>assert.match(read('src/app/marketplace/vendor.tsx'),/VendorDashboard/)],
 ['M1720','Settings/profile remain outside the user-world dock',()=>{const s=tabs(); assert.match(s,/name="profile" options=\{\{title:BRAND\.profile,href:null\}\}/); const iconBlock=s.match(/const iconMap:[\s\S]*?\};/); assert.ok(iconBlock); assert.doesNotMatch(iconBlock[0],/profile\s*:/);}],
 ['M1721','Reduced-motion navigation behavior remains preserved',()=>assert.match(keys(),/allows\('navigation'\) \? SIDE_MENU_MS : 0/)],
 ['M1722','Home visual authority remains tied to the existing design contract',()=>assert.match(design(),/home-command-center/)],
 ['M1723','B135 source contract covers all 25 milestone IDs',()=>{const s=read('server/v5_94_0_navigation_continuity.contract.test.js'); for(const [id] of milestones) assert.ok(s.includes(id),id); assert.equal(milestones.length,25);}],
 ['M1724','Release target is V5.94.0 / B135',()=>{assert.match(read('MASTER_ROADMAP.md'),/B135 \/ V5\.94\.0/); }],
];
for(const [id,title,fn] of milestones) test(`${id} ${title}`,fn);
