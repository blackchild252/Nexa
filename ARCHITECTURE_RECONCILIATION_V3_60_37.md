# NEXA Architecture Reconciliation — V3.60.38

## Decision
The **Expo Router tree under `src/app/` is the active navigation surface** for the current NEXA release.

- Entry: `src/app/_layout.tsx`
- Tabs: `src/app/(tabs)/_layout.tsx`
- Primary tabs: Home, Money, Zeeza, Dream Marketplace, Profile, Chat, Dami
- Secondary routes: Developer, Extensions, Staff, and Zeeza chat

The older root `app/` state-based shell remains in the repository as a **recoverable legacy surface**. It is not the active Expo Router entry and must not receive new feature work unless a compatibility task explicitly requires it.

## Why it is retained
The root shell contains older functionality and is retained temporarily so cumulative work remains recoverable while the Router surface is validated on a real Expo dependency tree/device.

## Reconciliation rule
New UI/navigation features must be implemented in `src/app/` and shared components/hooks. Do not duplicate new routes into `app/` merely to keep the legacy shell visually aligned.

## Retirement gate
The legacy shell can be retired only after:
1. Expo Router dependency installation is reproducible from a committed lockfile.
2. Frontend TypeScript validation passes with the genuine dependency tree.
3. Device/emulator validation covers all active Router routes and critical loading/error/empty states.
4. Legacy-only capabilities have been confirmed migrated or intentionally retired.
5. A checkpoint archive has been verified and can restore the pre-retirement tree.

## Current blocker
The current environment has no installed `node_modules`; `package-lock.json` is present at the repository root, and offline dependency installation cannot currently reconstruct the full dependency tree. Therefore dependency installation and live Expo/device execution remain blocked; no fake typecheck or UI result is claimed.
