# NEXA V3.58.0 — Extension Framework

## Result

V3.58.0 adds the application-level extension framework on top of the stable V3.57 developer contracts. The framework provides registration, explicit per-user permissions/consent, lifecycle controls, configuration boundaries, and an audit trail.

## Implemented

- `server/extensions.js` — dependency-light extension validation, scope registry, consent gating, lifecycle rules, audit envelope, and public-configuration boundary.
- `server/extensions.test.js` — focused executable tests for scopes, consent, configuration security, lifecycle gating, and audit records.
- SQLite tables for extensions, per-scope consent, and extension audit events.
- Authenticated `/api/extensions` APIs for registration, listing, inspection, consent grant/revocation, enable/disable, revocation, and audit history.
- `/api/extensions/manifest` framework manifest.
- V3.57 contract manifest now advertises the extension contract.
- Version synchronized to 3.58.0 in root/server metadata.

## Security boundary

This milestone deliberately does **not** execute arbitrary third-party JavaScript on the NEXA server. An extension is a registered capability identity and permission boundary. Server secrets are not exposed; public configuration rejects secret-like keys such as API keys, passwords, tokens, and credentials.

An extension cannot be enabled until the signed-in user has explicitly consented to every requested scope. Revoking consent automatically disables an enabled extension. Lifecycle and consent changes are audit logged.

## API surface

- `GET /api/extensions/manifest`
- `GET /api/extensions`
- `POST /api/extensions`
- `GET /api/extensions/:id`
- `PATCH /api/extensions/:id` — edit non-security-sensitive metadata
- `POST /api/extensions/:id/consent`
- `DELETE /api/extensions/:id/consent`
- `POST /api/extensions/:id/enable`
- `POST /api/extensions/:id/disable`
- `DELETE /api/extensions/:id`
- `GET /api/extensions/:id/audit`

## Validation

- JavaScript syntax checks for new/changed server modules: PASS.
- Focused V3.57/V3.58 contract + extension tests: PASS — 8/8.
- Full server suite: NOT RUN in this build environment because the supplied project dependencies (`better-sqlite3`, Express stack) are not installed here.
- Frontend TypeScript: PENDING.
- Device/emulator UI: PENDING.
- Live provider/payment validation: remains carry-forward.

## Mobile UI added

- `src/ExtensionsScreen.tsx` — signed-in extension management screen.
- Home screen now exposes an Extensions entry point.
- Registration form supports name, slug, version, description, and requested permission scopes.
- Users can grant/revoke consent, enable/disable, permanently revoke, and inspect audit history.
- The UI makes the consent gate visible before activation and does not expose public configuration fields for secrets.

## Validation after mobile UI work

- Contract + extension unit tests: PASS — 8/8.
- Frontend TypeScript/device validation: PENDING until Expo dependencies are installed and the app is run.
- Full server integration suite: PENDING because native/server dependencies are not installed in this build environment.

## V3.58 hardening update

- Added `PATCH /api/extensions/:id` for editing name, version, description, and validated public configuration. Revoked extensions remain immutable.
- Added `hasGrantedScope()` as the authorization primitive for future capability adapters: a scope is usable only when it was requested, explicitly granted, and the extension is enabled.
- Added focused tests for scope authorization and safe metadata updates.
- Mobile Extensions screen now supports editing extension metadata.

## Next step

Run the Expo app against the V3.58 server, fix any device-specific UI/type issues, then add temporary-SQLite API integration tests for the extension lifecycle before calling V3.58 fully validated.

## V3.59 continuation

The project now includes the V3.59 Extension Developer Experience in `EXTENSION_DEVELOPER_V3_59.md`, `server/extensionDeveloper.js`, and `examples/nexa-extension-weather/`. Developer manifest validation and capability discovery endpoints were added without changing the V3.58 security boundary.
