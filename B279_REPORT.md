# B279 — V5.99.33 (checkpoint 8)

## Changed
- src/NexaDamiRobot.tsx: removed the unread `ambient` flag (M4289, owner OK). The two flags that are used (`dami`, `vip-spotlight`) stay. Two older guards that pinned the line (v5_22_0 hero material, v5_99_18 M4230) now follow the code.
- New: server/v5_99_33_b279_block_guards.contract.test.js (4 checks), registered in scripts/release-gate.mjs.
- Roadmaps: new B279 block; M4147 and the environment-only files moved to a "Parked until external work starts" line.

## Root app/ was NOT removed (owner OK given, then blocked by the audit)
The owner approved removing the root `app/` folder, which the architecture note calls legacy. Before deleting, the audit found:
- Nothing under src/, scripts/ or any config imports from app/. Only 16 tests read it.
- But app/index.tsx is the only code in the project that asks for notification permission, gets the Expo push token, posts it to /api/push/register and creates the Android "default" and "calls" channels. No file under src/ imports expo-notifications.
- So deleting app/ would destroy the only copy of push registration. The folder was moved out as a trial, the 16 dependent tests were confirmed, and the folder and tests were restored byte for byte. The final sweep shows no change from that trial.
- Not proved here: which folder Expo Router actually runs (it needs node_modules). If the phone runs src/app, devices do not register for push today and the server's `channelId: "calls"` pushes have no high-priority channel. If it runs root app/, the folder is live. Either way it must not be deleted yet.
- Decision needed from the owner: port push registration and the calls channel into src (a behaviour change: it asks for notification permission at launch), then retire app/ and update the 16 tests. A guard keeps app/ in place until then.

## Checked and found clean
Standalone TypeScript (normal and strict), relative imports, require() asset targets, app.json asset paths and `node --check` on every server file. The remaining TypeScript errors are the kinds already reviewed in B278 or missing-module noise.

## Parked as external
M4147 (needs device screenshots). b144 x5 and v5_98_48 need dotenv or better-sqlite3 and this sandbox has no network. v5_71_0 passes with CI=true. b91_repair1 passes alone and only hits the 20 s limit under load. None of these is a known app bug.

## Result (per-file, 20 s limit, 8 at a time)
start 428 pass of 437; now 430 pass of 438. The 8 that fail are all parked (b144 x5, v5_98_48, v5_71_0 and b91_repair1, which pass with CI=true or alone)

## Not tested
Phone, full typecheck, EAS, Playwright, anything needing node_modules, the dotenv and better-sqlite3 files, and which folder Expo Router runs.
