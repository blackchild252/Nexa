"use strict";
const test=require("node:test"); const assert=require("node:assert/strict"); const fs=require("node:fs"); const path=require("node:path");
const root=path.join(__dirname,".."); const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const feed=()=>read("src/YaayzHomeFeed.tsx");
test("B61 feed ranks and deduplicates discovery inventory",()=>{const s=feed(); assert.match(s,/sort\(\(a,b\)=>/); assert.match(s,/seen=new Set/); assert.match(s,/findIndex/); assert.match(s,/slice\(0,4\)/);});
test("B61 adds a featured discovery scene without changing ticket authority",()=>{const s=feed(); assert.match(s,/kind:'featured'/); assert.match(s,/FEATURED DISCOVERY/); assert.match(s,/onOpenTickets/); assert.doesNotMatch(s,/fetch\(/); assert.doesNotMatch(s,/authedFetch/);});
test("B61 preserves bounded native advertising and explicit sponsorship",()=>{const s=feed(); assert.match(s,/native:0/); assert.match(s,/native:1/); assert.match(s,/native:2/); assert.match(s,/YaayzNativeAd index/); assert.match(s,/YAAYZADVERT · SPONSORED/); assert.match(s,/Sponsored Google ad/);});
test("B61 preserves category and empty-state recovery",()=>{const s=feed(); assert.match(s,/const categories=\['All','Events','Travel','Concerts','Stadium'\]/); assert.match(s,/No Yaayz discovery results/); assert.match(s,/setCategory\('All'\)/);});
test("B61 keeps saved/share accessibility surfaces",()=>{const s=feed(); assert.match(s,/accessibilityLabel={isSaved\?'Remove saved ticket':'Save ticket'}/); assert.match(s,/Share\.share/); assert.match(s,/accessibilityLabel={`Share \$\{t\.title\}`}/);});
