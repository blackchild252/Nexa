# NEXA V5.54.0 / B91 Implementation Report

## Block
**B91 — Abuse Resistance & HTTP Surface Hardening.** Milestones **M700–M724**, exactly one 25-milestone block, in five slices (M700–704 keys/window/headers, M705–709 failure-safety/bounds/stats, M710–714 lifecycle/wiring/X-Powered-By, M715–719 404/timeouts, M720–724 error envelope/headers/docs/certification). The roadmap queue held no defined B91; theme chosen from two gaps found while inspecting the source: an unbounded in-memory rate-limit store and no JSON 404 / framework header disclosure.

## What changed
- `server/rateLimiter.js`: same options and 429 contract as before; bounded store (default 10,000 keys, expired swept first, then oldest evicted), IPv4-mapped IPv6 key normalisation, failure-safe keys, `RateLimit-*` headers, key-free stats, dispose.
- `server/httpSurface.js`: JSON 404, `X-Powered-By` disabled, explicit server timeouts (keep-alive 65 s, headers 66 s, request 120 s via `REQUEST_TIMEOUT_MS`, floor 66 s).
- `server/index.js`: `rateLimit()` now delegates to the module; 404 handler mounted after all routes and before the error handler; timeouts applied after listen.
- A real defect caught by the new tests during the block: the first timeout ordering could put headersTimeout above requestTimeout for small values; fixed and covered by M718.
- B90's version pin converted to a compatibility check (same pattern as B87/B89). Docs, env template, ADR, runbook, VERSION.md, all three roadmaps and PROJECT_MEMORY.json reconciled to V5.54.0.

## Validation
- B91 focused contracts: **25/25 PASS**. Full cumulative server suite: **1,415/1,415 PASS**. Release audit: **PASS — 5.54.0**. Syntax check of all server/script files: clean.
- Limiter behaviour is tested with a fake clock and mock req/res; **the running Express server was NOT started** (express and other dependencies cannot be installed here), so the mount order and header behaviour are verified by source contracts, not by live HTTP requests.
- Frontend TypeScript, Expo export, Playwright, device runtime: **NOT RUN** (npm registry blocked, HTTP 403).

## Carry-forwards (owner)
Smoke-test one real request after deploy (`curl -i` an unknown route and an authed route: expect JSON 404, no `X-Powered-By`, `RateLimit-*` headers). Limits are per process; a multi-instance deployment needs a shared store. Backup scheduling, EAS `projectId`, iOS AdMob test ID, `NEXA_STRICT_LAUNCH`.
