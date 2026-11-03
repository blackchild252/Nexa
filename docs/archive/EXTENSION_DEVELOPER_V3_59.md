# NEXA V3.59 — Extension Developer Guide

## Purpose

V3.59 gives extension authors a discoverable, validated contract without allowing arbitrary third-party code to execute inside the NEXA server.

## Developer endpoints

- `GET /api/extensions/developer/manifest` — complete developer contract.
- `GET /api/extensions/developer/capabilities` — capability catalog and endpoint shapes.
- `POST /api/extensions/developer/validate` — validates a manifest without registering it.

All endpoints require an authenticated NEXA session.

## Minimal manifest

```json
{
  "manifestVersion": "1.0",
  "name": "Weather Helper",
  "slug": "weather-helper",
  "version": "1.0.0",
  "description": "Example extension",
  "requestedScopes": ["profile.read"],
  "publicConfig": {}
}
```

## Capability lifecycle

A capability call succeeds only when the extension is owned by the signed-in user, enabled, has requested the scope, and has active user consent for that scope.

## Configuration boundary

`publicConfig` is deliberately non-secret. Keys containing names such as `token`, `secret`, `password`, `apiKey`, `credential`, `authorization`, or `cookie` are rejected, including nested keys.

## No arbitrary server-side code

An extension is a capability identity and permission boundary. It is not a plugin runtime. Future execution models must preserve isolation and must not expose server credentials or bypass the per-user consent gate.


## V3.59.2 developer identities and compatibility

Each registered extension can have one or more user-owned developer identities. Create a key through `POST /api/extensions/:id/identity/keys`; the raw API key is returned only once. Store it securely. The database stores only a SHA-256 hash and a short display prefix.

Runtime requests use both `X-NEXA-CLIENT-ID` and `X-NEXA-EXTENSION-KEY`. The server verifies the identity, extension ownership, enabled lifecycle state, current NEXA compatibility range, and requested/consented capability scope on every call.

Extension manifests may declare:
```json
{
  "compatibility": {
    "minNexaVersion": "3.59.0",
    "maxNexaVersion": "3.60.0"
  }
}
```

The in-app Developer Console provides manifest validation, capability discovery, identity creation, rotation, and revocation.

### Operational limitations
- API-key rate limiting is not yet part of this milestone.
- Production secret storage/rotation policy and external developer onboarding remain future work.
- Native/device UI validation is pending until project dependencies and a test device/emulator are available.
