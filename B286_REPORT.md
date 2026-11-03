# B286 — V5.99.40 (checkpoint 15)

## Changed
- app.json: removed expo.versionCode, the last field Expo Doctor's schema rejected. The owner approved the change in chat.
- AGENTS.md (locked section): the build-code sentence no longer lists expo.versionCode. Only that sentence changed.
- scripts/release-identity.mjs no longer reads or writes expo.versionCode.
- 5 older tests follow (b155, b250, b251, b253, v5_99_39). New guard v5_99_40_b286_no_expo_versioncode (3 checks), registered in the release gate.

## Checked
- Identity check passes; version, Batch and build code advanced only through release:bump (6104 -> 6105).
- Server sweep: 4815 of 4888 checks pass; every failure comes from a missing dotenv or better-sqlite3 module in the sandbox, none from this change.

## NOT tested
Phone (including calls), Expo Doctor on the new app.json, EAS build, full typecheck, Playwright, the dotenv and better-sqlite3 files.

## Known limits
react-native-webrtc is still labelled untested on New Architecture; it only affects calls.
