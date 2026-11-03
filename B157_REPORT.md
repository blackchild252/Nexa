# NEXA V5.98.7 B155

Launch-configuration run (the V5.98.6 release seal is one-way and cannot be overwritten, so the changed build is sealed as V5.98.7; Batch advances by 1).

## Changed
- `app.json`: removed the stray `expo.versionCode` (5960) and the duplicate version keys outside `expo`; `android.versionCode` and `ios.buildNumber` (5981) remain the only authority. Added the iOS tracking-permission text for AdMob (`userTrackingPermission`).
- `eas.json`: build Node aligned to `.nvmrc` (22.22.2).
- `src/legalLinks.ts` + Profile "Legal" card: Privacy Policy and Terms links, URLs supplied by `EXPO_PUBLIC_PRIVACY_POLICY_URL` / `EXPO_PUBLIC_TERMS_URL`, opened only through the safe external-navigation policy. Account closure is unchanged.
- `scripts/launch-preflight.mjs` (`npm run launch:preflight`): lists the external launch blockers.
- `README.md`, `AGENTS.md`, `VERSION.md`, `PROJECT_MEMORY.json`: current state synchronized to B155. `LAUNCH_HANDOFF.md` added.
- `server/b155_launch_config.contract.test.js` added.

## Not done (needs network, accounts or your IDs) — see LAUNCH_HANDOFF.md
Real iOS AdMob IDs, EAS `projectId`/`owner`, production env values, hosting target, store accounts, `npm ci`, typecheck and the full server suite.
