# NEXA V6.0.25 B371

**B371 summary:** Preview Demo Data Layer for Consumer + Admin: preview-only seeded data now populates the major NEXA sections for launch testing, with a visible DEMO DATA indicator in Consumer and Admin, deterministic demo identities, interactive-safe preview records for social, marketplace, money, subscriptions, lifestyle, kitchen, fitness, Dami, extensions, verification and Admin work, automatic demo vendor seeding in preview mode, and controlled cleanup tooling. Existing **Blaca Essentials** is explicitly tracked as a Marketplace showcase/demo and is included in final pre-production cleanup. Production remains protected because the demo pack requires `NEXA_PREVIEW_MODE=1`; cleanup also covers known demo vendors. Focused B365–B371 regression/accessibility/demo contracts: **68/68 PASS** in the executed suite; Devil’s Walk CLEAN — JS 747/747, TS 206/206, imports 657/657, routes 43/43. Dependency-backed typecheck, browser/device, live providers, EAS, stores and deployment remain NOT TESTED/excluded.

# NEXA Demo Data Layer

## Purpose

B371 introduces a preview-only demo data layer so a launch tester can see populated sections and exercise real UI flows before live customer data exists.

## Existing demo inventory

- **Blaca Essentials** — existing Marketplace showcase vendor and products. This is now explicitly tracked as a demo/showcase item and must be removed/disabled for the final production launch.
- Existing Chase preview profiles remain in `ZeezaChase.tsx`.
- Existing deterministic preview buyer/vendor/admin identities remain gated by `NEXA_PREVIEW_MODE=1`.
- Existing preview Marketplace products remain gated by the preview fixture path.

## New preview pack

The B371 preview pack covers Home, Yaayz, Zeeza, Dream Marketplace, Sky Money, Subscription Centre, Lifestyle, Kitchen, Fitness, Ball House, Game House, Dami, Extensions, Verification and Admin.

The pack is seeded only when `NEXA_PREVIEW_MODE=1` and uses `demo_` identifiers or `@nexa.local` identities. Preview records are not customer records and demo money is explicitly non-real.

## Production removal

Before final production launch:

1. Disable `NEXA_PREVIEW_MODE`.
2. Disable `NEXA_SEED_DEMO_VENDORS`.
3. Set `NEXA_SKIP_BLACA_SEED=1`.
4. Run the preview cleanup (`require('./server/demoFixtures').remove()` in a controlled maintenance/preview database context).
5. Verify no `demo_` identities/records or Blaca Essentials showcase remain.
6. Run production launch certification and the final release gate.

Production launch certification already rejects preview mode and fixture identities; this B371 layer does not weaken that boundary.

## Cleanup command

`node server/removePreviewDemos.js` is intentionally guarded by `NEXA_PREVIEW_MODE=1` and should be run only against the controlled preview database. It removes the preview pack plus the known Marketplace showcase/demo vendors, including **Blaca Essentials**.
