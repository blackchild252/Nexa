# NEXA MAIN APP — B475 Release Report

Release identity: V6.1.29 B475 (build code 6294)
Release purpose: Business Hub single sign-up (one uniform sign-up, then the user picks the platforms).

## Delivered
- New `src/BusinessHubSignup.tsx`: the user enters the business name once (plus an optional "about"), then picks Shop and/or YouTube. The YouTube channel URL field appears only when YouTube is picked. Shop price/launch-offer text appears only when Shop is picked.
- `src/VendorDashboard.tsx`: the no-business screen shows this one sign-up instead of the two separate forms. The Staff join box is unchanged.
- Server routes are unchanged. Shop runs first (it creates the business record and the launch benefit), then YouTube attaches the channel to that same record. If one platform fails, the other still runs and the result message says which one failed.
- Contract 2475 in `server/v5_98_36_current_state.contract.test.js` now checks the new "Sign up to Business Hub" button.

## TESTED/PASSED
- v5_98_36 current-state contract 27/27, standing_features 11/11, globalCurrencyUi 3/3.

## NOT PASSED (not caused by this change)
- `docs/legacy/admin-ui-contracts/youtubeContent.contract.test.js` fails the same way on the untouched V6.1.28 zip (it reads a missing `youtubeContent.js`).

## NOT TESTED / excluded
- Typecheck (Expo/React Native packages missing here), running the screen, both server routes end to end, live YouTube, payments, EAS, stores.

## DEFERRED
- A shop-only business has no way to add YouTube later (same as before this change).
- A YouTube-only business adding a shop later reaches the shop route's "existing" path, which does not create the launch benefit.
