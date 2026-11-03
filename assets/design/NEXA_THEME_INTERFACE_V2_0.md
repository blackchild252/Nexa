# NEXA Theme Interface — Version 2.0 / Royal Fusion

## Purpose

NEXA Royal Fusion is the consolidated visual system for the existing NEXA app and for future apps that may reuse the NEXA interface language.

It combines three layers without creating three competing themes:

1. **Environment layer** — contextual AI/world artwork.
2. **Depth layer** — lightweight runtime 3D-like rings, glass, glow and depth built with existing React Native/Expo primitives.
3. **Motion layer** — the existing server-resolved subscription-aware motion system.

## Brand foundation

- Deep Black `#000000`
- Graphite `#1A1A1A`
- Charcoal `#2A2A2A`
- Royal Gold `#D4AF37`
- Bright Gold `#FFD700`
- Warm Ivory `#F8F5E9`

The gold gradient remains the primary NEXA signature. Gold is used for hierarchy and emphasis rather than outlining every object.

## Material model

- Base: deep black
- Surface: graphite
- Elevated: charcoal glass
- Highlight: controlled royal-gold glow
- Content: warm ivory

Environmental art sits behind the interface. A readability wash and the material layer sit above it. Interactive content remains the highest visual priority.

## Subscription-aware visual behavior

The existing subscription authority remains server-resolved through the MotionProvider:

| Tier | Environment | Depth | Motion | Ambient world motion | VIP spotlight |
|---|---|---|---|---|---|
| Free | Yes | Yes | No | No | No |
| Regular | Yes | Yes | Yes | No | No |
| Premium | Yes | Yes | Yes | Yes | No |
| VIP | Yes | Yes | Yes | Yes | Yes |

These are visual entitlements only. They do not authorize money, identity, payment, data, navigation, or other protected actions.

Reduced-motion accessibility always overrides motion.

## Mobile rules

- No new 3D engine.
- No required runtime image service.
- Local contextual art remains valid offline after bundling.
- Decorative layers are `pointerEvents="none"`.
- UI remains usable when animation is unavailable.
- Text and controls must remain readable over environmental art.

## Reuse contract

A future app can reuse the token model, material hierarchy, gradient roles, depth layer and motion policy while replacing product-specific world art and navigation.

## Current implementation

- `src/theme.ts` — canonical colors, gradients, material tokens and interface version.
- `src/nexaVisualSystem.ts` — reusable Royal Fusion layer contract.
- `src/NexaWorldBackground.tsx` — environment + readability shell.
- `src/NexaDepthLayer.tsx` — runtime 3D-like depth layer.
- `src/motion.tsx` — subscription-aware motion authority.
- `src/nexaWorlds.ts` — contextual world registry and AI art prompts.
