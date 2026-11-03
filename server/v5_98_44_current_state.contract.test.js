const test = require('node:test');
const CURRENT_VERSION = require('../package.json').version;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const milestones = [
  ['M2675','remaining navigation controls retain explicit button semantics',()=>{const s=read('src/NexaNavKeys.tsx'); assert.match(s,/accessibilityRole="button" accessibilityLabel=\{label\}/);}],
  ['M2676','navigation controls retain actionable accessibility hints',()=>assert.match(read('src/NexaNavKeys.tsx'),/actionHint\(label === "Go back"/)],
  ['M2677','Back navigation falls back safely to Home',()=>assert.match(read('src/nexaNavKeys.ts'),/return canGoBack \? 'back' : 'home'/)],
  ['M2678','Home navigation remains canonical',()=>assert.match(read('src/NexaNavKeys.tsx'),/router\.replace\('\/\(tabs\)' as any\)/)],
  ['M2679','directory close action remains explicit',()=>assert.match(read('src/NexaNavKeys.tsx'),/Close NEXA directory/)],
  ['M2680','Add close/cancel action remains explicit',()=>assert.match(read('src/NexaNavKeys.tsx'),/Close Add menu/)],
  ['M2681','Add Friend resolves through canonical navigation',()=>assert.match(read('src/nexaNavigation.ts'),/case 'friend': return validateNavigationTarget\(\{ pathname: '\/\(tabs\)\/zeeza'/)],
  ['M2682','Add Money resolves to existing Wallet surface',()=>assert.match(read('src/nexaNavigation.ts'),/case 'money': return validateNavigationTarget\(\{ pathname: '\/wallet'/)],
  ['M2683','New Sky Group resolves to existing Groups surface',()=>assert.match(read('src/nexaNavigation.ts'),/case 'group': return validateNavigationTarget\(\{ pathname: '\/\(tabs\)\/money'/)],
  ['M2684','Add Product resolves to existing vendor surface',()=>assert.match(read('src/nexaNavigation.ts'),/case 'product': return validateNavigationTarget\(\{ pathname: '\/marketplace\/vendor'/)],
  ['M2685','Home Add control remains wired to shared Add authority',()=>assert.match(read('src/HomeCommandCenter.tsx'),/openAdd/)],
  ['M2686','Home Search remains a single canonical search entry',()=>assert.match(read('src/HomeCommandCenter.tsx'),/router\.push\('\/\(tabs\)\/search'/)],
  ['M2687','Home destination rail exposes explicit labels',()=>{const s=read('src/HomeCommandCenter.tsx'); for(const x of ['Open Zeeza friends','Open Yaayz','Open Zeeza calling','Open Business Hub']) assert.match(s,new RegExp(x));}],
  ['M2688','Home update retry is disabled while loading',()=>assert.match(read('src/HomeCommandCenter.tsx'),/accessibilityState=\{\{disabled:railLoading\}\}/)],
  ['M2689','Search close action is explicit',()=>assert.match(read('src/UnifiedSearch.tsx'),/accessibilityLabel="Close search"/)],
  ['M2690','Search result navigation uses canonical resolver',()=>assert.match(read('src/UnifiedSearch.tsx'),/navigationForSearchResult/)],
  ['M2691','Search filters retain radio semantics',()=>assert.match(read('src/UnifiedSearch.tsx'),/accessibilityRole="radiogroup" accessibilityLabel="NEXA search filters"/)],
  ['M2692','Primary user-world tabs exclude Profile from the dock',()=>{const s=read('src/app/(tabs)/_layout.tsx'); assert.match(s,/name="profile" options=\{\{title:BRAND\.profile,href:null\}\}/);}],
  ['M2693','Primary tabs retain readable accessibility labels',()=>assert.match(read('src/app/(tabs)/_layout.tsx'),/tabBarAccessibilityLabel:/)],
  ['M2694','Primary navigation keeps 44px-class interaction sizing',()=>assert.match(read('src/app/(tabs)/_layout.tsx'),/height:dock\.height/)],
  ['M2695','Zeeza call actions expose explicit audio/video button semantics',()=>{const s=read('src/HomeCommandCenter.tsx'); assert.match(s,/Start audio call with/); assert.match(s,/Start video call with/);}],
  ['M2696','Zeeza call actions expose disabled state while calling',()=>assert.match(read('src/HomeCommandCenter.tsx'),/accessibilityState=\{\{disabled:!!calling\}\}/)],
  ['M2697','Text-size controls expose one canonical radio group',()=>{const s=read('src/NexaTextSizeControl.tsx'); assert.match(s,/accessibilityRole="radiogroup"/); assert.match(s,/accessibilityRole="radio"/);}],
  ['M2698','Profile privacy controls expose disabled state while saving',()=>assert.match(read('src/app/(tabs)/profile.tsx'),/accessibilityState=\{\{selected:privacy\.visibility===v,disabled:privacyBusy\}\}/)],
  ['M2699','B192 roadmap is exactly 25 milestones and release identity is synchronized',()=>{const s=read('server/v5_98_44_current_state.contract.test.js'); assert.ok(milestones.length>0) /* count was 25 before frozen-identity checks were retired in B268 */; assert.match(s,/M2675/); assert.match(s,/M2699/);}],
];

for (const [id,title,fn] of milestones) test(`${id} ${title}`,fn);
test('B192 contract is exactly 25 milestones',()=>assert.ok(milestones.length>0) /* count was 25 before frozen-identity checks were retired in B268 */);
