"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = p => fs.readFileSync(path.join(root,p),"utf8");

test("V4.15 Chase preference filters and profile attributes are connected",()=>{
 const screen=read("src/ZeezaChase.tsx"), profile=read("src/ZeezaProfile.tsx"), friends=read("server/friends.js"), db=read("server/db.js");
 for(const x of ["ageMin","ageMax","nationality","town","heightMin","heightMax","jobType"]) assert.match(screen,new RegExp(x));
 for(const x of ["chaseAge","chaseNationality","chaseHeightCm","chaseJobType"]) { assert.match(profile,new RegExp(x)); assert.match(friends,new RegExp(x)); }
 for(const x of ["zeezaChaseAge","zeezaChaseNationality","zeezaChaseHeightCm","zeezaChaseJobType"]) assert.match(db,new RegExp(x));
 assert.match(friends,/ZEEZA_CHASE_TERMS_VERSION = "1\.1"/);
 assert.match(friends,/age < 18/);
 assert.match(friends,/chaseOptIn && age === null/);
});

test("V4.15 L.A. includes Ball House, Game House, Fitness and preserves Kitchen",()=>{
 const la=read("src/LeisureArenaScreen.tsx");
 for(const x of ["The Kitchen","Ball House","Game House","Fitness"]) assert.match(la,new RegExp(x));
 assert.ok(fs.existsSync(path.join(root,"src/app/leisure/ball-house/index.tsx")));
 assert.ok(fs.existsSync(path.join(root,"src/app/leisure/game-house/index.tsx")));
 assert.ok(fs.existsSync(path.join(root,"src/app/leisure/fitness/index.tsx")));
});

test("V4.15 venue ticket discovery reuses Yaayz and has constrained return routes",()=>{
 const ball=read("src/app/leisure/ball-house/index.tsx"), game=read("src/app/leisure/game-house/index.tsx"), yaayz=read("src/YaayzScreen.tsx"), api=read("server/index.js");
 assert.match(ball,/\(tabs\)\/yaayz/); assert.match(game,/\(tabs\)\/yaayz/);
 assert.match(yaayz,/\['\/leisure\/ball-house','\/leisure\/game-house','\/leisure'\]/);
 assert.match(api,/lower\(COALESCE\(venue,''\)\)/);
});

test("V4.15 Fitness PDFs are bundled and gym listings require moderation",()=>{
 for(const f of ["01_Gym_Workout_Basics.pdf","02_Equipment_Use_Guide.pdf","03_Gym_Safety_Checklist.pdf"]) assert.ok(fs.existsSync(path.join(root,"assets/fitness",f)));
 const api=read("server/index.js"), db=read("server/db.js"), fitness=read("src/app/leisure/fitness/index.tsx");
 assert.match(api,/app\.post\("\/api\/fitness\/gyms", auth\.authMiddleware, fitnessGymWriteLimit/);
 assert.match(api,/status='approved'/); assert.match(api,/isConfiguredAdmin\(req\.user\)/);
 assert.match(db,/CREATE TABLE IF NOT EXISTS fitness_gyms/);
 assert.match(fitness,/Open PDF guide/); assert.match(fitness,/\/api\/fitness\/gyms/);
});

test("V4.15 Game House does not claim livestreaming or fabricated leaderboard data",()=>{
 const game=read("src/app/leisure/game-house/index.tsx"), ball=read("src/app/leisure/ball-house/index.tsx");
 assert.match(game,/does not broadcast gameplay like Twitch/i);
 assert.match(game,/No fabricated player scores/i);
 assert.match(ball,/football home inside NEXA|live updates|Ball House arena tickets/i);
});
