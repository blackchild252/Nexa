# B444 — Block 08 Global Country, Locale & Regionalization

**Product:** NEXA Main App  
**Release identity:** V6.0.98 B444 · Build 6263  
**Block status:** TESTED/PASSED for the local in-app regionalization foundation  
**Milestones:** M6591–M6615

## Implemented

- Completed the canonical 249-entry country/territory directory with unique uppercase two-letter codes and canonical names.
- Added localized country-name fallback, locale-aware alphabetical sorting, search by name/code/calling code, country flags and calling-code metadata.
- Added country-region, default-timezone, informational local-currency and separately bounded NEXA-supported display-currency metadata. Antarctica does not receive an invented local currency.
- Added explicit directory-status handling distinct from legal or commercial eligibility. The restricted-country rule list remains empty until approved rules exist.
- Added unsupported-country handling, country-aware phone normalization in Kitchen Hub onboarding, address-field order guidance, postal-code hints/normalization, and metric/imperial defaults.
- Added locale-aware date/time formatting and Profile & Settings controls for country, locale and language.
- Added authenticated, no-store regional-preference API routes and SQLite-backed persistence; validated regional preferences are included in account portability.
- Added Main-owned read-only `/api/regional/countries` reference data so Admin consumes Main-supplied local-currency and supported display-currency mappings.
- Removed forced `en-NG` numeric grouping from locale-neutral counters without changing explicitly NGN-only financial paths or Nigerian demo/branding content.
- Registered the next independent Main block: M6616–M6640, Block 09 Identity Verification.

## Verification

- `npm run verify:contract`: **574/574 passed**.
- Dedicated regionalization and regional-preference tests pass, including actual SQLite preference persistence.
- `npm run walk`: clean; 794/794 JavaScript syntax checks, 218 TypeScript syntax files, 733/733 relative imports, 52/52 route targets.
- `npm run angels-duty`: 0 blockers; 5 exact-duplicate groups remain review-only.
- `npm run godhand -- verify`: passed.

## NOT TESTED / BLOCKED

- Full `npm run test:server` did not finish within the available run window; the process reached 5,372 test cases in its output before timing out. Do not treat the full server suite as passed.
- `npm run typecheck` remains blocked by missing `expo/tsconfig.base` and missing React/Expo dependency declarations; it has not passed.
- Device UI runtime acceptance and live Main–Admin HTTP runtime acceptance were not run. The local contracts and static sweeps passed.

## Safety boundaries

Country directory presence does not mean legal/commercial eligibility. Language preference is stored, but complete translation coverage is not claimed. Country currency metadata is reference data only; display preferences never change transaction currency, and Main remains the only financial authority.
