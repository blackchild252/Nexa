# B311 — V5.99.65 (profile photo in every profile icon)

## What I did
- Cause: only the Zeeza profile screen drew your photo. Other profile icons were fixed person icons, and the sign-in data does not carry the photo.
- New `src/myAvatar.tsx`: one shared copy of your photo, fetched once from your profile, and a `ProfilePhotoIcon` that shows the photo in a circle or falls back to the old icon.
- Now used in: Zeeza top-right button, Zeeza "Profile" tab, "Profile" row in the Home menu and in the inner-screen menu.
- Upload or save on the Zeeza profile updates all of them at once. Sign-in, sign-up, Google sign-in and sign-out clear it first.
- I did not add the photo to the sign-in/session data: it can be 800 KB and would travel on every request.

## TESTED / PASSED
- New guard 5 of 5. 141 related test files: 1,643 tests, 0 failed.

## NOT tested
- Browser or phone look: crop, size inside the 44px Zeeza button and the menu rows.
- Typecheck (no node_modules here), Playwright.
- Whether a large photo makes the first icon load slowly on a weak connection.

## Not changed
- Other people's photos in the Zeeza inbox list and chat. The server does not send them there, so that needs a server change. Say so if you want it.

## Next
Open the new build, add a photo, and check the Zeeza top-right icon and the menus.
