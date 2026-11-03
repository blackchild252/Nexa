# NEXA V5.54.4 — Open-case hardening

Patch on V5.54.3 (Batch B91, no new milestones). Contains every V5.54.3 change.

## Changed
1. **Trust proxy.** `TRUST_PROXY` env var: integer hops (default 1, so behaviour is unchanged), `0`/`false`, or an IP/CIDR list. You must still confirm how many proxies your host puts in front of the server; the default is a guess I cannot verify.
2. **`/health`.** Now returns only `{ ok, version }` (the smoke script reads `version`). Model name, API-key flag and specialist list are gone.
3. **Login lock-out.** The 10-attempt cap is now per email **and IP**, so an attacker can no longer lock a victim out from another IP. A looser email-only cap (200 per 15 min) still stops distributed guessing. Trade-off: a botnet can now make about 10 guesses per IP per 15 minutes; the per-IP `authLimiter` (30) still applies.
4. **Uploads.** `/api/transcribe` accepts audio only (audio/* MIME, or octet-stream/video-container MIME with an audio extension), one file, sanitized extension; anything else is rejected with 415 before it touches disk. Temp-file cleanup was checked: the route deletes the upload in a `finally` block, unchanged.

## Tests
`server/v5_54_4.contract.test.js` (4 tests): trust-proxy parsing, upload predicate and limiter behaviour are executed; route wiring is source-level.

## Still open
WebRTC web fallback; memory-only web login token; reconciliation of stuck payments; signup limited only per IP; single large `server/index.js`, in-memory limiter, no DB schema version; repo-root clutter; test suite depth (mostly source-text checks). Google sign-in has not been started (needs your Google Cloud client IDs).
