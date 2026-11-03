"use strict";
const test=require("node:test"); const assert=require("node:assert/strict"); const fs=require("node:fs"); const path=require("node:path");
const root=path.join(__dirname,".."); const read=p=>fs.readFileSync(path.join(root,p),"utf8"); const feed=()=>read("src/YaayzHomeFeed.tsx");

test("B63 adds explicit discovery modes without backend authority",()=>{const s=feed(); assert.match(s,/feedModes=\['For You','Live','Saved'\]/); assert.match(s,/feedModeFor/); assert.doesNotMatch(s,/authedFetch/);});
test("B63 live mode remains deterministic and time bounded",()=>{const s=feed(); assert.match(s,/mode==='Live'/); assert.match(s,/isLiveNow/); assert.match(s,/LIVE NOW/);});
test("B63 saved mode reuses the existing local save state",()=>{const s=feed(); assert.match(s,/mode==='Saved'/); assert.match(s,/saved\[String\(t\.id\)\]/); assert.match(s,/savedCount/);});
test("B63 adds a lightweight discovery story rail",()=>{const s=feed(); assert.match(s,/discoveryStories/); for(const x of ['Live now','Tonight','Journeys','Matchday','Fresh picks']) assert.match(s,new RegExp(x));});
test("B63 keeps mode/category controls accessible",()=>{const s=feed(); assert.match(s,/accessibilityState=\{\{selected:feedMode===m\}\}/); assert.match(s,/accessibilityLabel=\{`Discovery story/);});
test("B63 keeps cinematic scene accents available for content",()=>{const s=feed(); assert.match(s,/sceneAccentFor/); assert.match(s,/JOURNEY/); assert.match(s,/MATCH/); assert.match(s,/LIVE/);});
test("B63 keeps native ads bounded and attributed",()=>{const s=feed(); for(const x of ['native:0','native:1','native:2','Sponsored Google ad']) assert.match(s,new RegExp(x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));});
test("B63 preserves explicit sponsor attribution",()=>{const s=feed(); assert.match(s,/YAAYZADVERT · SPONSORED/); assert.match(s,/Explore offer/);});
test("B63 preserves save/share ticket actions",()=>{const s=feed(); assert.match(s,/Save ticket/); assert.match(s,/Share/); assert.match(s,/View/);});
test("B63 preserves empty-state recovery",()=>{const s=feed(); assert.match(s,/No Yaayz discovery results/); assert.match(s,/Show all/);});
