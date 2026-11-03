"use strict";
const test=require("node:test"); const assert=require("node:assert/strict"); const fs=require("node:fs"); const path=require("node:path");
const root=path.join(__dirname,".."); const read=p=>fs.readFileSync(path.join(root,p),"utf8"); const feed=()=>read("src/YaayzHomeFeed.tsx");

test("B62 exposes deterministic discovery category registry",()=>{const s=feed(); assert.match(s,/discoveryCategories=\['All','Events','Travel','Concerts','Stadium'\]/); assert.match(s,/categoryMatch/);});
test("B62 adds contextual time-of-day discovery",()=>{const s=feed(); assert.match(s,/contextForHour/); assert.match(s,/THIS MORNING/); assert.match(s,/THIS AFTERNOON/); assert.match(s,/TONIGHT/);});
test("B62 adds live-now classification without backend authority",()=>{const s=feed(); assert.match(s,/isLiveNow/); assert.match(s,/LIVE NOW/); assert.doesNotMatch(s,/authedFetch/);});
test("B62 adds bounded availability language",()=>{const s=feed(); assert.match(s,/availabilityTone/); assert.match(s,/ALMOST GONE/); assert.match(s,/LIMITED/); assert.match(s,/SOLD OUT/);});
test("B62 adds destination context to discovery cards",()=>{const s=feed(); assert.match(s,/destinationFor/); assert.match(s,/destinationFor\(t\)/);});
test("B62 keeps shortcut rail horizontally scrollable",()=>{const s=feed(); assert.match(s,/Your discovery shortcuts/); assert.match(s,/ScrollView horizontal/); assert.match(s,/Tickets/); assert.match(s,/Offers/); assert.match(s,/Ask Dami/);});
test("B62 keeps saved-count continuity local to the feed",()=>{const s=feed(); assert.match(s,/savedCount/); assert.match(s,/Object\.values\(saved\)/);});
test("B62 keeps native ads bounded and attributed",()=>{const s=feed(); assert.match(s,/native:0/); assert.match(s,/native:1/); assert.match(s,/native:2/); assert.match(s,/Sponsored Google ad/);});
test("B62 keeps sponsor attribution explicit",()=>{const s=feed(); assert.match(s,/YAAYZADVERT · SPONSORED/); assert.match(s,/Explore offer/);});
test("B62 preserves accessible feed state and recovery",()=>{const s=feed(); assert.match(s,/Yaayz discovery feed/); assert.match(s,/accessibilityState={{selected:category===c}}/); assert.match(s,/No Yaayz discovery results/); assert.match(s,/Show all/);});
