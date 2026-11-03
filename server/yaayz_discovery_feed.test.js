"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("B59 Yaayz Home uses a bounded deterministic discovery composer",()=>{
 const feed=read("src/YaayzHomeFeed.tsx");
 assert.match(feed,/composeYaayzFeed/); assert.match(feed,/slice\(0,3\)/); assert.match(feed,/slice\(0,4\)/);
 for(const kind of ["hero","filter","advert","ticket","native-ad","ai"]) assert.match(feed,new RegExp(`kind:'${kind}'`));
});

test("B59 Yaayz Home has cinematic scene, category and motion seams",()=>{
 const feed=read("src/YaayzHomeFeed.tsx");
 assert.match(feed,/ImageBackground/); assert.match(feed,/dream_marketplace_world\.jpg/); assert.match(feed,/categories=/);
 assert.match(feed,/accessibilityState=/); assert.match(feed,/NexaAnimatedView/); assert.match(feed,/NexaPressable/);
});

test("B59 monetisation remains explicit and Home-only",()=>{
 const feed=read("src/YaayzHomeFeed.tsx"); const screen=read("src/YaayzScreen.tsx");
 assert.match(feed,/YAAYZADVERT · SPONSORED/); assert.match(feed,/Sponsored Google ad/); assert.match(feed,/SPONSORED/);
 assert.match(screen,/mode==='home'/); assert.doesNotMatch(read("src/app/(tabs)/index.tsx"),/YaayzNativeAd/);
});

test("B59 discovery interactions have save/share and Dami seams",()=>{
 const feed=read("src/YaayzHomeFeed.tsx");
 assert.match(feed,/Share\.share/);
 for(const needle of ["Save ticket","Ask Dami","onAskDami","onOpenTickets","onOpenAdverts"]) assert.match(feed,new RegExp(needle));
});


test("B60 Yaayz Discovery World keeps visual scenes, quick actions and bounded ad cadence",()=>{
 const feed=read("src/YaayzHomeFeed.tsx");
 for(const needle of ["quick-actions","heroFor","sceneFor","ScrollView horizontal","Sponsored Google ad","YAAYZADVERT · SPONSORED","accessibilityState={{checked:isSaved}}","native:2"]) assert.match(feed,new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
});

test("B60 Yaayz Home remains presentation-only and preserves the existing ticket boundary",()=>{
 const feed=read("src/YaayzHomeFeed.tsx"); const screen=read("src/YaayzScreen.tsx");
 assert.doesNotMatch(feed,/\/api\//); assert.match(screen,/YaayzHomeFeed/);
 assert.match(feed,/onOpenTickets/); assert.match(feed,/onOpenAdverts/); assert.match(feed,/onAskDami/);
});
