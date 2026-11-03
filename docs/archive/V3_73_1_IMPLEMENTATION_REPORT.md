# NEXA V3.73.1 Implementation Report

## Scope
Issues 34–36 were implemented cumulatively on the V3.72.1 tree. A whole-tree audit was also performed for obvious source artifacts, release drift, authentication boundaries, external-provider waits, and frontend endpoint configuration.

## Issue 34 — Runtime dependency preflight correctness
- Enforced the declared Node `>=20.19.0` engine floor instead of checking only Node major version.
- Added npm runtime/package-manager drift detection when npm exposes its user-agent version.

## Issue 35 — Bounded notification-provider delivery
- Added a 15-second abortable timeout around the Expo push-provider request.
- Timeout errors enter the existing bounded retry/terminal-failure path.
- This prevents an external provider call from hanging a delivery worker indefinitely.

## Issue 36 — Production frontend API configuration safety
- Production frontend builds now require `EXPO_PUBLIC_API_URL`.
- Configured URLs must be absolute HTTP(S) URLs and cannot contain embedded credentials.
- Development retains the existing localhost fallback.

## Repository hygiene
- Removed the empty `server/search.js.tmp` source artifact.
- Release audit now rejects that temporary artifact if it reappears.

## Verification
- Server regression suite: **233/233 passed**.
- V3.73.1 hardening/release contracts: **8/8 passed** in targeted verification.
- Release audit: **PASS**.
- Release gate: **PASS** for application-testable checks.
- Dependency preflight: **BLOCKED** only by missing `package-lock.json` and installed `node_modules` in the current environment.
- Frontend TypeScript/device/provider/production deployment validation remains externally unclaimed; a standalone global `tsc` run cannot substitute for the missing Expo dependency tree.
