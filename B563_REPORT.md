# B563 — Dami Avatar Studio checkpoint

- Identity: V6.2.17 B563, build 6382. Identity check passed.
- Scope: NEXA Main only.
- Replaced the old Dami robot component with a cartoon avatar that can be customized from the homepage.
- Added avatar options for gender/voice style, skin, face/expression, hair/style colour, glasses, moustache, top, bottoms, shoes, bag, pose, and a compact background selection.
- Added local-first language options and persisted avatar preferences; saving requests the existing voice-preference endpoint.
- Development preview defaults to VIP motion tier to inspect higher-tier visual abilities. Production still relies on the server-reported subscription tier.
- Focused contract test: 3 passed, 0 failed.
- `npm run typecheck`: BLOCKED by absent React/Expo dependencies and missing `expo/tsconfig.base` in the workspace.
- Native build, browser/device acceptance, and live voice API: NOT TESTED.
- No release seal issued; this is an unsealed checkpoint archive.
