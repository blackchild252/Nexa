# B486 Report — NEXA MAIN APP

- Release identity: V6.1.40 B486, Android/iOS build code 6305.
- Roadmap focus: M7116, supported identity-evidence document-type policy audit.
- Added the evidence document policy document and a contract test tying the documented identifiers to the Main-owned policy source.
- Confirmed the local API contract still rejects uploads with `503 SECURE_STORAGE_NOT_CONFIGURED` and never stores evidence bytes in SQLite.
- Contract suite: 926/926 passed.
- Focused identity-verification suite: 7/7 passed.
- Full server suite: NOT VERIFIED; the run exceeded the execution window after at least 582 tests passed. No complete pass is claimed.
- Browser/device, dependency-backed typecheck, secure object storage, live provider acceptance and production integration: NOT TESTED.
