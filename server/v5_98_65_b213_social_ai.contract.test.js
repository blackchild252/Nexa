"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("M3215 Zeeza communication remains friend/block gated",()=>{
 const s=read("server/zeezaMessaging.js");
 assert.match(s,/areFriends\(req\.user\.id, otherId\)/);
 assert.match(s,/You can only message friends/);
 assert.match(s,/isBlocked\(req\.user\.id, currentOtherId\)/);
 assert.match(s,/You can't message this person/);
 assert.match(s,/requireMember/);
});

test("M3216 Yaayz reward surfaces stay on the central Aami economy",()=>{
 const s=read("server/aamiEconomy.js");
 const y=read("src/YaayzSocialFeed.tsx");
 assert.match(s,/awardActivity/);
 assert.match(s,/yaayz_like/);
 assert.match(s,/yaayz_post/);
 assert.match(s,/yaayz_comment/);
 assert.match(s,/yaayz_share/);
 assert.match(y,/Aami/);
 assert.doesNotMatch(y,/cashback/i);
});

test("M3217 AdMob remains Yaayz Home-only and consent-gated",()=>{
 const screen=read("src/YaayzScreen.tsx");
 const feed=read("src/YaayzHomeFeed.tsx");
 const ad=read("src/YaayzNativeAd.tsx");
 const sub=read("src/Subscription.tsx");
 assert.match(screen,/mode==='home'/);
 assert.match(feed,/kind:'native-ad'/);
 assert.match(feed,/YaayzNativeAd/);
 assert.match(ad,/prepareAdConsent/);
 assert.match(ad,/autoLoad: sdkReady && consentReady/);
 assert.doesNotMatch(sub,/YaayzNativeAd/);
});

test("M3218 Dami supports all declared safe navigation destinations",()=>{
 const server=read("server/index.js");
 const nav=read("src/nexaNavigation.ts");
 const app=read("src/app/dami.tsx");
 assert.match(server,/"yaayz", "leisure"/);
 assert.match(app,/yaayz.*leisure.*none/);
 assert.match(nav,/value === 'yaayz'/);
 assert.match(nav,/value === 'leisure'/);
 assert.match(nav,/value === 'inbox'/);
});

test("M3219 Dami financial actions remain proposal/confirmation gated",()=>{
 const prompt=read("server/index.js");
 const actions=read("server/aiActions.js");
 assert.match(prompt,/Never propose money transfer, payment, checkout, purchase/);
 assert.match(prompt,/Preparing an action is NOT executing it/);
 assert.match(actions,/createPending/);
 assert.match(actions,/consume/);
 assert.match(actions,/consumedAt/);
 assert.match(actions,/expiresAt/);
});

test("M3215-M3219 do not expose Aami ledger mutation from the Dami client",()=>{
 const ai=read("src/NexaAI.tsx");
 assert.doesNotMatch(ai,/\/api\/aami\/.*POST/i);
 assert.doesNotMatch(ai,/awardActivity/);
});

test("B213 social/AI group preserves canonical navigation resolver",()=>{
 const nav=read("src/nexaNavigation.ts");
 assert.match(nav,/navigationForDamiDestination/);
 assert.match(nav,/navigationForNotification/);
 assert.match(nav,/navigationForSearchResult/);
});
