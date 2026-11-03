# NEXA Architecture Reconciliation V3.60.41

- Active frontend surface: `src/app/` via Expo Router (`expo-router/entry`).
- Legacy surface: `app/` is retained only as recoverable legacy code and is not an active route surface.
- New screens/routes must be added under `src/app/`.
- Shared feature components live under `src/` and may be reused by active routes.
- No deletion of `app/` is authorized until a dependency/route audit proves it is no longer required for recovery.
- Release audit must fail if package entrypoint, root layout, or active tabs drift back to the legacy shell.

- Update: the legacy root `app/` folder was retired after a dependency audit, with the owner's approval. It held the only push registration and Android calls channel, which were first ported to `src/pushRegistration.ts` and are mounted from `src/app/_layout.tsx`.
