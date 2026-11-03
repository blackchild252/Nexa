# NEXA Theme & Interface V2.2 — Royal Dark 3D (V5.20.0 / B56)

Extends Royal Fusion 2.1 (environment + depth + motion). Nothing in 2.1 is removed.

## What changed
- **Cosmos** (`src/NexaCosmos.tsx`): native animated space scene for Home and Dami. Replaces the ChatGPT poster wallpaper. Stars, nebula, ringed planet, gold-rimmed mountains, glowing horizon, shimmering water.
- **Dami robot** (`src/NexaDamiRobot.tsx`): crown, headphones, glass face with glowing eyes and smile, three tilted spinning rings, waveform, drag-to-tilt. Built from native views only.
- **Glossy orbs** (`src/NexaGlossyOrb.tsx`): red Zeeza, blue Calls, glass mic, gold. `NexaBevel` for lit-edge glass panels.
- **Depth layer** (`src/NexaDepthLayer.tsx`): perspective-tilted, orbiting rings on every world screen.

## Mobile rules
- No new dependency. Decorative layers use `pointerEvents="none"`. Content stays above visuals.
- Reduced motion always wins. Free tier renders the same 3D look, static.
- Only transform/opacity are animated with the native driver; the robot tilt uses the JS driver on its own node.

## Reuse contract
Use `NexaGlossyOrb` / `NexaBevel` for any new primary control or card. Do not put poster images behind Home or Dami.

## Developer preview
`EXPO_PUBLIC_NEXA_MOTION_PREVIEW=vip npx expo start` shows every animation on any account. Ignored in release builds.
