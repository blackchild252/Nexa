import fs from 'node:fs';
import path from 'node:path';
const root = process.env.NEXA_ROOT ? path.resolve(process.env.NEXA_ROOT) : process.cwd();
const fail = message => { console.error(`MAIN INTERNAL ROADMAP CHECK BLOCKED — ${message}`); process.exit(2); };
const masterPath = path.join(root, 'MASTER_ROADMAP.md');
if (!fs.existsSync(masterPath)) fail('MASTER_ROADMAP.md is missing');
for (const name of ['PRIORITY_ROADMAP.md', 'TEMPORARY_ROADMAP.md']) {
  if (fs.existsSync(path.join(root, name))) fail(`competing active roadmap is not allowed: ${name}`);
}
const text = fs.readFileSync(masterPath, 'utf8');
if (!text.startsWith('# NEXA MAIN — PERMANENT INTERNAL MASTER ROADMAP')) fail('permanent master authority header is missing');
const active = text.match(/^## CURRENT ACTIVE MAIN BLOCK — M(\d+)[–-]M(\d+) — .+$/m);
if (!active) fail('current active block pointer is missing');
const firstActive = Number(active[1]), lastActive = Number(active[2]);
if (!Number.isSafeInteger(firstActive) || lastActive !== firstActive + 24) fail('current active block must span exactly 25 sequential milestones');
const required = Array.from({length: 250}, (_, i) => firstActive + i);
const queueHeading = `## REGISTERED FUTURE MAIN APP BLOCK — M${firstActive}–M${lastActive}`;
const queueStart = text.indexOf(queueHeading);
if (queueStart < 0) fail(`registered forward queue starting at M${firstActive} is missing`);
const tail = text.slice(queueStart);
for (let block = 0; block < 10; block++) {
  const first = firstActive + block * 25; const last = first + 24;
  const headingRe = new RegExp(`^## REGISTERED FUTURE MAIN APP BLOCK — M${first}[–-]M${last} — .+$`, 'm');
  if (!headingRe.test(tail)) fail(`forward block M${first}–M${last} has no canonical heading`);
  const heading = tail.search(headingRe); const afterHeading = tail.slice(heading);
  const next = afterHeading.slice(1).search(/^## /m); const section = afterHeading.slice(0, next < 0 ? undefined : next + 1);
  const ids = [...section.matchAll(/^\d+\. M(\d+) —/gm)].map(m => Number(m[1]));
  const expected = Array.from({length:25},(_,i)=>first+i);
  if (ids.length !== 25 || ids.some((id,i)=>id !== expected[i])) fail(`block M${first}–M${last} must contain exactly 25 ordered milestone entries; found ${ids.length}`);
  if (section.includes('UNPLANNED / NOT AUTHORIZED')) fail(`block M${first}–M${last} contains an unauthorized slot`);
}
const all = [...tail.matchAll(/^\d+\. M(\d+) —/gm)].map(m=>Number(m[1]));
for (const id of required) if (!all.includes(id)) fail(`missing forward milestone M${id}`);
console.log(`MAIN INTERNAL ROADMAP CHECK PASS — MASTER_ROADMAP.md — 10 sequential blocks — 250 milestone slots — M${firstActive}–M${firstActive + 249}`);
