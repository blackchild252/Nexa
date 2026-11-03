# NEXA V3.84.1 — Embedded Product Identity & Observability Report

## Issues 49–51

### 49 — Zeeza embedded social identity
- NEXA remains the backbone platform.
- Dami remains the native assistant that ships directly with NEXA.
- Zeeza is now the explicit embedded social product name in Home, the social route, and user-facing global-search labels.
- The server-side search entity type remains `people` for compatibility; this is an internal data type, not a product title.

### 50 — Dream Marketplace product identity
- The embedded commerce product is consistently named **Dream Marketplace** in Home and primary navigation.
- Existing storefront, vendor, order, payment, refund, and dispute functionality was preserved.
- No marketplace rewrite was performed.

### 51 — Sentry observability wiring
- Added `@sentry/node` 10.75.2 to the server dependency manifest.
- Added `@sentry/react-native` 8.28.0 to the Expo app dependency manifest.
- Added optional server initialization, Express error handling, request correlation, and safe exception helpers.
- Added optional React Native initialization and exception helper.
- Added `sendDefaultPii: false` and deliberately excluded auth credentials/tokens from the client integration.
- Added environment examples for DSN/environment/trace rate.
- No fake DSN or auth token was added.

## Validation

- Cumulative server suite: **262/262 passed**.
- Release audit: **PASS**.
- Release gate: **PASS**.
- Builder contracts: **2/2 passed**.
- Sentry contract coverage: **PASS**.
- Playwright: **BLOCKED** because the dependency/browser tree is not installed in this environment.
- Sentry runtime delivery: **BLOCKED** until a real Sentry project DSN is supplied and the dependency tree can be installed.

## Sentry connection boundary

Sentry's current Node SDK guidance recommends initializing the SDK as early as possible, and Sentry's React Native SDK supports Expo and native crash/error tracking. The code is therefore wired now, but a real project DSN is still required before events can be observed. Source-map/release upload should use a CI-held Sentry auth token rather than a committed credential.
