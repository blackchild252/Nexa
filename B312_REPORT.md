# B312 — V5.99.66 (Chase nationality, Nearby country, Kitchen and Fitness icons)

## What I did
- Chase sign-up form (Zeeza profile): Nationality is now required. The form asks for it before saving, and the server refuses a Chase opt-in with no nationality. The label no longer says "(optional)" and the helper text says it is required.
- The field "Approximate country" is now "Nearby country" (accessibility label "Chase nearby country"). The words "approximate area" (Chase safety text) and "approximate location" (72-hour message) are unchanged.
- Kitchen and Fitness icons: the plate and weightlifter emoji need a variation selector and draw blank on many Android phones. Kitchen card is now 🍴, Fitness card 💪, Fitness page title 💪, Sports & fitness department 💪. Ball House and Game House were already fine.

## TESTED / PASSED
- New guards: nationality/nearby country 3 of 3, L.A. icons 2 of 2.
- 26 related test files, 0 failed (L.A., Fitness, Kitchen, marketplace departments, navigation, Chase, profile, Zeeza).

## Not tested
- How the icons look on a phone; the Chase form on a phone; a real Chase opt-in against the server; typecheck; Playwright.
- Marketplace couch emoji (🛋️) has the same selector risk and was not changed.

## Next
- Kitchen Hub (Home Kitchen + Iceland tabs, Join the hub, Vendor's Hub, pending approval).
