# NEXA V3.50.9 — Final Setup & Run Guide

## Verified in this environment

- Package version: 3.50.9
- Expo app version: 3.50.9
- Server version: 3.50.9
- Server JavaScript syntax: PASS
- Server automated tests: 17/17 PASS

## Local setup

1. Install Node.js 20+ (Node 22 is supported by the current environment).
2. From the project root run:

   `npm install`

3. Copy `.env.example` to `.env` and configure the values required for the environment.
4. Start the server:

   `npm run server`

   The server listens on port 3000 by default.
5. Set `EXPO_PUBLIC_API_URL` to the reachable server URL for the device/emulator.
6. Start Expo:

   `npm start`

## Payment configuration

For sandbox payment testing, configure:

- `PAYMENTS_ENABLED=true`
- `PAYSTACK_SECRET_KEY=<sandbox secret>`
- `PAYSTACK_CALLBACK_URL=<callback URL>` when required by the provider setup

Do not commit secrets.

## Administrator configuration

Configure one or both:

- `NEXA_ADMIN_EMAILS=admin@example.com`
- `NEXA_ADMIN_USER_IDS=<user-id>`

The server, not the client UI, enforces administrator authorization.

## Verification commands

Server tests:

`npm run test:server`

Frontend typecheck:

`npm run typecheck`

## Current environment limitation

The source package was verified and the server test suite passes, but this execution environment cannot reach the npm registry, so the Expo/React dependency tree could not be installed here. Device/emulator and real Paystack sandbox transactions therefore require execution on a normal networked development machine or CI environment.
