# B309 — V5.99.63 (Zeeza profile photo button)

## What I did
- Cause: the photo picker was only inside the "Edit your profile" panel, which is closed by default. The main profile view had no photo control.
- Fix: a camera button on the avatar and a text link under it ("Add profile photo", or "Change photo" once one is set). Both use the existing picker and upload, which saves straight to the profile. The Edit panel picker stays.
- Added `zeeza_profile_photo_button.contract.test.js` (3 tests) to the release gate.

## TESTED / PASSED
- New guard: 3 of 3. The 21 older test files that read ZeezaProfile.tsx: 274 of 274.

## NOT tested
- Phone or browser view (no node_modules, no network here). The button position on the avatar is checked in source only.
- A real photo upload to the server. The upload code is unchanged.
- Real typecheck, Playwright.
- On the web build, the picker depends on the browser allowing a file dialog; not checked.

## Next
Open the profile on the new build and tap the camera on the avatar.
