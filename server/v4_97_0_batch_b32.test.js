"use strict";
const test=require("node:test");
const {atLeast,currentVersionMd}=require('./versionAtLeast');
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("B32 release metadata is synchronized at root and server",()=>{
  assert.ok(atLeast(JSON.parse(read("package.json")).version,"5.6.0"));
  assert.ok(atLeast(JSON.parse(read("server/package.json")).version,"5.6.0"));
  assert.ok(atLeast(currentVersionMd(read("VERSION.md")),"5.6.0"));
});

test("B32 notification filtered read-all keeps server unread count",()=>{
  const ui=read("src/NotificationCenter.tsx");
  assert.match(ui,/const data=await authedFetch\(`\/api\/notifications\/read-all\$\{query\}`/);
  assert.match(ui,/setUnread\(Number\(data\?\.unreadCount\)\|\|0\)/);
});

test("B32 Home surfaces recoverable rail refresh failures",()=>{
  const ui=read("src/HomeCommandCenter.tsx");
  assert.match(ui,/railError/);
  assert.match(ui,/Some Home updates could not be refreshed/);
  assert.match(ui,/onPress=\{loadRails\}/);
});

test("B32 Home call failures are user-visible",()=>{
  const ui=read("src/HomeCommandCenter.tsx");
  assert.match(ui,/Alert\.alert\('Zeeza call'/);
});

test("B32 Marketplace invalidates fee preview when cart total changes",()=>{
  const ui=read("src/useMarketplace.ts");
  assert.match(ui,/setFeePreview\(null\)/);
  assert.match(ui,/\[cart,total\]/);
});

test("B32 Marketplace route accepts search context from unified search",()=>{
  const route=read("src/app/(tabs)/marketplace.tsx");
  const ui=read("src/MarketplaceScreen.tsx");
  assert.match(route,/useLocalSearchParams/);
  assert.match(route,/initialSearch/);
  assert.match(ui,/initialSearch\?:string/);
});

test("B32 Yaayz search deep-link uses its supported search contract",()=>{
  const nav=read("src/nexaNavigation.ts");
  const ui=read("src/YaayzScreen.tsx");
  assert.match(nav,/case 'yaayz': return validateNavigationTarget\({ pathname: '\/\(tabs\)\/yaayz', params: \{ search:/);
  assert.match(ui,/requestedSearch/);
});

test("B32 money search context is retained in canonical navigation",()=>{
  const nav=read("src/nexaNavigation.ts");
  assert.match(nav,/case 'money': return validateNavigationTarget\({ pathname: '\/\(tabs\)\/money', params: \{ view: 'activity', search:/);
});

test("B32 Dami workflow replay is not exposed as an executable operation surface",()=>{
  const server=read("server/index.js");
  assert.match(server,/workflow-replay\/\:workflowId/);
  assert.match(server,/status\(410\)\.json/);
  assert.match(server,/not a public operation surface/);
});

test("B32 canonical search navigation remains centralized",()=>{
  const nav=read("src/nexaNavigation.ts");
  assert.match(nav,/export function navigationForSearchResult/);
  assert.match(nav,/case 'marketplace'/);
  assert.match(nav,/case 'yaayz'/);
  assert.match(nav,/case 'money'/);
});
