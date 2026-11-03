# B250 — V5.99.4

## Roadmap
M4100–M4124 — Reading Comfort & Settings.

## Repairs
- Saved text size was never restored at start-up (loader existed but was never called). Fixed.
- Changing text size did not refresh already-mounted screens. The app now re-renders on size or font change and restores the current route.

## Added
- Font type setting: NEXA Inter (default, bundled), Phone default, Classic serif, Typewriter. No new downloads.
- Profile & Settings > Appearance > Reading comfort: text size, font type, live preview, reset to standard.
- Home menu text-size control kept.

## Build identity
V5.99.4 / B250 / build code 6069 (all app.json fields). Package com.aami.nexa unchanged.

## Verification
- Focused B250 contract: 25/25 PASS
- Related regression (text scale, interaction scale, visual harmonization, scene fidelity, release consistency): 59/59 PASS
- Release audit: PASS; release gate (audit + active contracts + seal): PASS
- Store preflight: all checks PASS
- Style walker behaviour (font remap + size scale + default pass-through): checked directly, PASS
- NOT TESTED: on-phone rendering, EAS build, install-over-old on a device, full `npm run typecheck` (no node_modules/network here)
