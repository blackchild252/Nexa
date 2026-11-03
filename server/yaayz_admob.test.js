"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("Yaayz AdMob is scoped to Yaayz Home",()=>{
 const screen=read("src/YaayzScreen.tsx");
 const feed=read("src/YaayzHomeFeed.tsx");
 assert.match(screen,/YaayzHomeFeed/);
 assert.match(screen,/mode==='home'/);
 assert.match(feed,/index:0/);
 assert.match(feed,/index:1/);
 assert.match(feed,/index:2/);
 assert.match(feed,/kind:'native-ad'/);
 assert.match(feed,/SPONSORED/);
 const adsLine=screen.split('\n').find(line=>line.includes("mode==='ads'"))||'';
 assert.doesNotMatch(adsLine,/YaayzNativeAd/);
 assert.doesNotMatch(read("src/app/(tabs)/index.tsx"),/YaayzNativeAd/);
});

test("Yaayz Home feed keeps discovery and monetisation composable",()=>{
 const feed=read("src/YaayzHomeFeed.tsx");
 assert.match(feed,/type FeedItem/);
 assert.match(feed,/kind:'advert'/);
 assert.match(feed,/kind:'ticket'/);
 assert.match(feed,/kind:'native-ad'/);
 assert.match(feed,/onOpenTickets/);
 assert.match(feed,/onOpenAdverts/);
});

test("Yaayz native ad surface uses the supplied production IDs",()=>{
 const ad=read("src/YaayzNativeAd.tsx");
 assert.match(ad,/ca-app-pub-9908588255141470\/7710261131/);
 assert.match(ad,/ca-app-pub-9908588255141470\/6735627793/);
 assert.match(ad,/NativeAdView/);
 assert.match(ad,/NativeMediaView/);
 assert.match(ad,/NativeAssetType\.HEADLINE/);
 assert.match(ad,/NativeAssetType\.CTA/);
 assert.match(ad,/SPONSORED/);
});

test("AdMob native integration is configured at Expo native-build layer",()=>{
 const app=JSON.parse(read("app.json"));
 const plugin=app.expo.plugins.find(x=>Array.isArray(x)&&x[0]==='react-native-google-mobile-ads');
 assert.ok(plugin,"missing react-native-google-mobile-ads config plugin");
 assert.equal(plugin[1].androidAppId,"ca-app-pub-9908588255141470~9214914497");
 assert.equal(plugin[1].iosAppId,"ca-app-pub-9908588255141470~7557929889");
 const pkg=JSON.parse(read("package.json"));
 assert.equal(pkg.dependencies["react-native-google-mobile-ads"],"16.5.0");
});
