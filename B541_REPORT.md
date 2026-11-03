# B541 report — V6.1.95

**Product:** NEXA MAIN only.

**Goal (one):** give AAMI Central's activation factor check something to call in Main.

**Built:** `server/centralFactorVerify.js`, registered in `server/index.js` as `POST /zeeza/v1/central/verify-factor`. Signed with `NEXA_CENTRAL_ZEEZA_VERIFY_KEYS` (own key set). Checks signature, scope (`factor.verify`, issuer `aami-central`, audience `nexa-main-zeeza`), 5-minute window and exact `data` keys. Proof is `<challengeId>.<challengeSecret>`; the challenge must belong to that user, purpose `central_activation`, fixed server-side context. Single use and attempt limits come from the existing Zeeza 2FA engine. Answers only `{ verified }`; any refusal is `verified:false`.

**TESTED/PASSED:** `server/centralFactorVerify.test.js` 7/7. One-off interop with Central v1.0.37's real verifier: good proof verified, replay refused, wrong key refused. `npm run walk` CLEAN. Release identity and roadmap checks PASS.

**TESTED, one failure not from this change:** `npm run verify:contract` 1211 pass / 1 fail (M1130 only checks that `node_modules` exists; none in this sandbox).

**NOT TESTED:** real SQLite runtime for this route, full `npm run test:server`, live HTTPS, production keys.

**BLOCKED:** no authenticated route yet lets a person request a `central_activation` challenge, and no delivery adapter exists for it. Until both exist no real proof can be produced.

**Next (one goal):** the challenge-issuing route and Zeeza inbox delivery for `central_activation`.
