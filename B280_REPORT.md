# B280 — V5.99.34 (checkpoint 9)

## Changed
- NEW src/pushRegistration.ts. It holds what the retired root app/index.tsx did for push: create the Android "default" and "calls" channels, ask for notification permission, get the Expo push token, and POST it with the platform to /api/push/register. Web is skipped. Any failure is swallowed so it can never block sign-in or the app.
- src/app/_layout.tsx now mounts `<PushRegistration/>` next to `<AuthGate/>`, inside AuthProvider. It runs once per signed-in user and cancels if the user signs out before it finishes.
- The root `app/` folder is retired (owner OK). Nothing imported from it. The architecture note has an update line.
- 16 tests followed the retirement. Checks on the web page shell (`+html`), the root layout fonts, the calls channel and the nav labels now read the live files. Checks that only pinned the retired shell's own text were retired, and tables with an exact milestone count keep their count (each retired entry now asserts the folder is gone, and says so in its name).
- New guard v5_99_34_b280_block_guards (6 checks), registered in scripts/release-gate.mjs. The v5_99_33 guard follows the new reality.

## Why this matters
Before this release no code under src/ asked for notification permission, registered a push token or created the calls channel. If a phone runs src/app (the project notes and the live layout say so), devices were never registered, so the server's push messages had nowhere to go and call pushes had no high-priority channel.

## Behaviour change to expect
After sign-in the app asks for notification permission, the same as the retired shell did.

## Checked (outside the repo, native modules stubbed)
Android asks then registers (both channels created, calls at MAX); iOS already granted registers with no prompt; denied stops after the prompt; web is skipped; token failure and server failure end quietly; signing out mid-way stops before the network call; the component does nothing with no user and registers with one.

## Open: M4314
The retired code also routed a tapped notification to its screen (routeForPush). The live app has no tap listener and no foreground display handler, so a tap opens the app only and a push that arrives while the app is open is not shown. Porting that needs a route map for src/app and a phone to test.

## Result (per-file, 20 s limit, 8 at a time)
start 430 pass of 438; now 431 pass of 439. The 8 that fail are all parked (b144 x5, v5_98_48, v5_71_0 and b91_repair1, which pass with CI=true or alone)

## Not tested
Phone (permission prompt, token, channels, a real push), full typecheck, EAS, Playwright, anything needing node_modules, the dotenv and better-sqlite3 files.
