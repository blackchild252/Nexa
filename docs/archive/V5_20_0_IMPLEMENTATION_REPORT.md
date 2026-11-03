# V5.20.0 — Batch B56 — Royal Dark 3D AI Interface (checkpoint 2 of 2)

## Problem
Home used the ChatGPT mockup poster (`NEXA_HOME_DESIGN_V1_2_3D_REFERENCE.png`) as its wallpaper, and the "3D" depth layer was flat circles.

## Delivered
- `src/NexaCosmos.tsx` — native animated space scene (nebula, twinkling stars, ringed planet, gold-rimmed mountains, glowing horizon, water shimmer). Used for Home and Dami.
- `src/NexaDamiRobot.tsx` — 3D Dami robot from native views: crown, headphones, glass face, glowing eyes with blink, smile, three tilted spinning perspective rings, waveform, bob, drag-to-tilt. On Home (tap opens Dami) and in the Dami screen header.
- `src/NexaGlossyOrb.tsx` — glossy 3D orbs (red Zeeza, blue Calls, glass mic) and `NexaBevel` glass panels (Home rails).
- `src/NexaDepthLayer.tsx` — perspective-tilted orbiting rings on every world screen.
- `src/NexaAI.tsx` — embedded Dami screen is now transparent so the cosmos shows through.
- `src/motion.tsx` — dev-only `EXPO_PUBLIC_NEXA_MOTION_PREVIEW=vip`; `NexaPressable` forwards accessibility props.
- Theme docs: `assets/design/NEXA_THEME_INTERFACE_V2_2.md` and `_V2_2_TOKENS.json`.
- Version 5.20.0 in package.json, server/package.json, app.json, theme.ts, VERSION.md, roadmaps.

## Rules preserved
Free tier renders the same 3D look, static. Reduced motion wins. No new dependencies. Decorative layers never take input. Existing Home accessibility labels and B25/B26 style contracts kept.

## Tests
Server suite: 797 tests, 765 pass, 32 fail. The same 32 fail on the untouched V5.19.0 zip (stale version checks etc.); no new failures. New: `server/v5_20_0_royal_dark_3d.contract.test.js` (8 tests).
B55's version test now accepts 5.19.0 or later.

## Not verified
No `node_modules` here, so no full TypeScript check and no device/Expo run. Files were syntax-checked only. Please run `npx tsc --noEmit` and view it on a device (use the motion preview switch if on a Free account).
