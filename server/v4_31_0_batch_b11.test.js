"use strict";
const assert=require("node:assert/strict");
const test=require("node:test");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("51 Motion catalog enforces 0/30/60/100 tiers and reduced-motion support",()=>{
 const motion=read("src/motion.tsx");
 for(const x of ["free:BASIC_MOTION_LEVEL","regular:30","premium:60","vip:100","MOTION_CATALOG","reducedMotion","reduceMotionChanged"]) assert.ok(motion.includes(x),`missing ${x}`);
 assert.match(motion,/motionLevelFor/); assert.ok(motion.includes("allows:(name:MotionName)"));
});

test("52 Ball House supports league/team filtered football discovery",()=>{
 const football=read("server/football.js"), index=read("server/index.js"), client=read("src/ballHouseFootball.ts"), screen=read("src/app/leisure/ball-house/index.tsx");
 assert.match(football,/filterFootballUpdates/); assert.match(index,/req\.query\?\.league/); assert.match(index,/req\.query\?\.team/); assert.match(client,/filters\?:\{league\?:string;team\?:string\}/); assert.match(screen,/Premier League/); assert.match(screen,/Nigeria Premier League/);
});

test("53 Account privacy has an authenticated read/update boundary",()=>{
 const index=read("server/index.js"); assert.match(index,/app\.get\("\/api\/account\/privacy", auth\.authMiddleware/); assert.match(index,/app\.patch\("\/api\/account\/privacy", auth\.authMiddleware/); assert.match(index,/profileVisibility/); assert.match(index,/zeezaExploreOptIn/);
});

test("54 Dami workflow preview remains user-owned and separate from execution",()=>{
 const hub=read("server/aiHub.js"), validation=read("server/aiHubValidation.js"); assert.match(hub,/\/api\/ai\/workflows\/:id\/next/); assert.match(hub,/userId=\?/); assert.match(hub,/requiresConfirmation/); assert.match(validation,/Explicit confirmation is required to run this workflow/);
});

test("55 Sky Money reconciliation exposes a safe operational summary",()=>{
 const index=read("server/index.js"), settlement=read("server/walletSettlement.js"); assert.match(index,/\/api\/wallet\/settlement\/readiness/); assert.match(index,/summary=results\.reduce/); assert.match(index,/mismatch/); assert.match(settlement,/safeToApply/); assert.match(settlement,/referenceMatches/); assert.match(settlement,/amountMatches/); assert.match(settlement,/currencyMatches/);
});
