const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const nav = () => read('src/nexaNavigation.ts');
const home = () => read('src/HomeCommandCenter.tsx');
const keys = () => read('src/NexaNavKeys.tsx');
const tabs = () => read('src/app/(tabs)/_layout.tsx');
const design = () => read('src/homeDesign.ts');

const milestones = [
  ['M3200','global navigation has a canonical directory/add/search/notification authority',()=>{const s=nav();assert.match(s,/navigationForDirectoryItem/);assert.match(s,/navigationForAddAction/);assert.match(s,/navigationForSearchResult/);assert.match(s,/navigationForNotification/);}],
  ['M3201','Home uses the shared directory and preserves its established destination actions',()=>{assert.match(home(),/HOME_DIRECTORY/);assert.match(home(),/navigationForDirectoryItem/);for(const route of ['/\\(tabs\\)/search','/dami','/\\(tabs\\)/yaayz','/marketplace/vendor']) assert.match(home(),new RegExp(`router\\.push\\('${route}`));}],
  ['M3202','user-world dock excludes Profile/settings while Vendor remains reachable',()=>{const s=tabs();const iconMap=s.match(/const iconMap:[\s\S]*?\};/);assert.ok(iconMap);assert.doesNotMatch(iconMap[0],/profile\s*:/);assert.match(s,/name="profile" options=\{\{title:BRAND\.profile,href:null\}\}/);assert.match(home(),/Open Business Hub/);}],
  ['M3203','Add actions remain mapped through the canonical Add authority',()=>{const s=nav();assert.match(s,/export type AddNavigationAction/);for(const action of ['friend','money','group','product']) assert.match(s,new RegExp(`case '${action}'`));assert.match(keys(),/navigationForAddAction\(action\)/);}],
  ['M3204','Home retains a dedicated Search rail and global search resolves through shared navigation',()=>{assert.match(home(),/title="SEARCH NEXA"/);assert.match(home(),/router\.push\('\/\(tabs\)\/search'/);assert.match(read('src/UnifiedSearch.tsx'),/navigationForSearchResult/);}],
];
for (const [id,title,fn] of milestones) test(`${id} ${title}`,fn);
assert.equal(milestones.length,5);
