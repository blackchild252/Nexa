"use strict";
const assert=require("node:assert/strict");
const test=require("node:test");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("V4.26 Motion tiers are centralized (Free has the basic level since M4494)",()=>{
 const motion=read("src/motion.tsx");
 assert.match(motion,/BASIC_MOTION_LEVEL = 30/); assert.match(motion,/free:BASIC_MOTION_LEVEL/); assert.match(motion,/regular:30/); assert.match(motion,/premium:60/); assert.match(motion,/vip:100/);
 assert.match(motion,/authedFetch\('\/api\/subscription'\)/);
 assert.match(motion,/level>=minLevel/);

});

test("V4.26 motion is mounted once and shared across the app shell",()=>{
 const layout=read("src/app/_layout.tsx"), tabs=read("src/app/(tabs)/_layout.tsx");
 assert.match(layout,/MotionProvider/); assert.match(layout,/AuthProvider><NexaLocationProvider><MotionProvider>/); assert.match(tabs,/NexaAnimatedView/);
});

test("V4.26 Ball House has authenticated football feed, tickets and reusable motion",()=>{
 const ball=read("src/app/leisure/ball-house/index.tsx"), api=read("server/index.js"), football=read("server/football.js");
 assert.match(api,/\/api\/ball-house\/football/); assert.match(api,/auth\.authMiddleware/); assert.match(api,/ballHouseFootballLimit/);
 for(const x of ["live matches","Upcoming fixtures","Recent results","table","Football news","Get Ball House arena tickets"]) assert.match(ball,new RegExp(x));
 assert.match(ball,/\/\(tabs\)\/yaayz/); assert.match(football,/site\.api\.espn\.com\/apis\/site\/v2\/sports\/soccer/); assert.match(football,/standings/); assert.match(football,/now\.core\.api\.espn\.com/);
});

test("V4.26 Ball House reuses existing Yaayz stadium inventory",()=>{
 const client=read("src/ballHouseFootball.ts"), ball=read("src/app/leisure/ball-house/index.tsx");
 assert.match(client,/\/api\/yaayz\/tickets\?type=stadium&search=Ball%20House/); assert.match(ball,/authenticated Yaayz inventory/);
});
