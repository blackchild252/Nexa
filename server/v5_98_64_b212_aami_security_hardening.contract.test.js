const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('node:fs'); const path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
const a=()=>read('server/aamiEconomy.js');
const checks=[
()=>assert.match(a(),/aami_streak_checkins/),
()=>assert.match(a(),/serverStreak/),
()=>assert.doesNotMatch(a(),/metadata\.amount/),
()=>assert.match(a(),/verifiedAmount/),
()=>assert.match(a(),/variableSources/),
()=>assert.match(a(),/AAMI_CLAIM_AMOUNT_MISMATCH/),
()=>assert.match(a(),/AAMI_CLAIM_AMOUNT_OUT_OF_RANGE/),
()=>assert.match(a(),/Claim amount does not match the authoritative Aami rule/),
()=>assert.match(a(),/Claim amount is outside the authoritative Aami range/),
()=>assert.match(a(),/db\.inTransaction \? work\(\) : db\.transaction\(work\)\(\)/),
()=>assert.match(a(),/dailyCap!=null && activityCountToday/),
()=>assert.match(a(),/PRIMARY KEY\(userId,dayKey\)/),
()=>assert.match(a(),/streakCheckIn/),
()=>assert.match(a(),/INSERT INTO aami_streak_checkins/),
()=>assert.match(a(),/ORDER BY dayKey DESC LIMIT 6/),
()=>assert.match(a(),/Math\.min\(5,streak\)/),
()=>assert.match(a(),/streak:\$\{today\}/),
()=>assert.match(a(),/verifiedAmount:claim\.amount/),
()=>assert.match(a(),/source==='bug_report' \|\| source==='promotional_campaign'/),
()=>assert.match(a(),/maxPerEvent/),
()=>assert.match(a(),/aami-activity:/),
()=>assert.match(a(),/aami_reward_events/),
()=>assert.match(a(),/adultConfirmedAt/),
()=>assert.match(read('B212_REPORT.md'),/V5\.98\.64 B212/),
()=>assert.match(read('MASTER_ROADMAP.md'),/M3175–M3199 \/ B212/)
];
checks.forEach((fn,i)=>test(`B212 M${3175+i} — Aami hardening contract`,fn));
