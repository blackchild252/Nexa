# NEXA AI World Wallpaper System

**Stage:** V5.16.0 / B52

## Purpose
NEXA now has a shared, mobile-safe environmental layer so major product worlds can carry their own visual atmosphere without replacing existing screens or navigation.

## Implemented worlds
- Home — NEXA command-center atmosphere
- Dami — futuristic AI sanctuary
- Sky Money — premium financial/banking environment
- Dream Marketplace — premium showroom
- Kitchen — restaurant/open-kitchen environment
- Ball House — football stadium
- Fitness — premium gym
- Game House — immersive gaming lounge
- Zeeza — social lounge
- Yaayz — travel/events environment
- Profile/Search — private command environment

## Mobile-first implementation
- Uses bundled local image assets; no new image-service dependency.
- Decorative images do not receive touch input.
- A dark readability wash keeps text and controls above the artwork.
- Existing routes, business logic, authorization and navigation remain authoritative.
- Existing screens can opt into a world without being rewritten.

## AI asset handoff
The current bundled artwork is lightweight environment scaffolding so the feature can be tested safely on the phone. The supplied Dami screenshot is retained as a reference asset, not used as a live UI wallpaper.

The final high-fidelity AI-generated asset pass is staged for the laptop interface audit. Prompts are canonicalized in `src/nexaWorlds.ts` so generated replacements can be dropped into the same world slots without changing screen code.
