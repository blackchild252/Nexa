# NEXA MAIN APP — B476 Release Report

Release identity: V6.1.30 B476 (build code 6295)
Release purpose: add platforms to a Business Hub account after sign-up; launch benefits are decided once, at sign-up.

## Delivered
- A shop owner can add YouTube later; a YouTube-only account can add a shop later (paid entry, no launch benefit).
- Launch benefits are given only at sign-up. The account shows "launch benefit received / not received". After that there is only usage or no usage.
- Fixed: the dashboard never received the business type, so the YouTube tab could not show for a shop owner.
- Fixed: adding YouTube to a shop owner replaced the shop type with the YouTube type.
- Fixed: a YouTube-only account got free legacy shop access.
- New `src/BusinessPlatformsCard.tsx`; changes in `src/VendorDashboard.tsx`, `server/vendorSubscriptions.js`, `server/youtubeContent.js`, `server/index.js`.

## TESTED/PASSED
- New contract `server/b476_business_hub_add_platforms.contract.test.js` 5/5.
- All 43 existing test files that mention the touched files: 0 failures before and after.

## NOT TESTED / excluded
- Typecheck (Expo/React Native packages missing), running the screen, the register routes against a real database (better-sqlite3 missing), live payment, EAS, stores.

## ASSUMED
- "First login" means the sign-up moment, when the shop is created and the launch allocation is made.
- A legacy shop owner with no subscription history and no products who added YouTube under the old code may show as YouTube-only.
