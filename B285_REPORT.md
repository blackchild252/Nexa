# B285 — V5.99.39 (checkpoint 14)

## Changed
- app.json: removed three version fields that Expo's schema rejects (expo.versionName, expo.android.versionName, expo.ios.versionName). Expo Doctor flagged them on the EAS build; the build still ran.
- scripts/release-identity.mjs no longer checks those three fields. server/v5_66_0_production_integrity.js now checks that the Android versionCode is an integer instead of reading versionName.
- 20 older tests now read the valid `version` field instead of the removed fields.
- New guard v5_99_39_b285_block_guards (4 checks), registered in the release gate.

## Not changed on purpose
- expo.versionCode stays. The locked section of AGENTS.md names it as a required build-code field, and only the project owner can change that section. Expo Doctor will still report this one extra field until the owner decides.
- react-native-webrtc: Expo Doctor says "untested on New Architecture" (a directory label, not a failure). It is loaded only when a call starts, so it can only affect calls. Not changed.

## Checked
- Identity check passes; version, Batch and build code advanced only through release:bump.
- Every test that reads the changed fields passes.

## NOT tested
Phone (including calls), full typecheck (no node_modules), EAS (a rebuilt app.json was not sent to Expo Doctor), Playwright, the dotenv and better-sqlite3 files.

## Known limits
Expo Doctor still reports expo.versionCode (locked) and the webrtc label.
