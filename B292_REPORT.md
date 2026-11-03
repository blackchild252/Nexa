# B292 — V5.99.46 (checkpoint 5, M4475 rework and M4478 to M4481)

## Changed
- Rails (src/HomeCommandCenter.tsx): Developer Options screenshots showed Window, Transition and Animator duration scales all at 1x, so animations were ON and the still-strip path was not what the video showed. The moving rail now creates a fresh Animated.Value, born at the bar width (right edge), each time the bar or text size is measured, then loops to past the left edge. The still strip also starts at the right edge.
- New src/PasswordInput.tsx: show/hide eye, no autocorrect, current-password or new-password autofill hints. Used on login, signup (new password) and the Profile close-account password.
- Autofill hints on email (login, signup) and name (signup). The app has no phone-number fields.
- src/auth.tsx: the Restoring-your-NEXA-session and offline screens now use the dark theme background instead of the transparent one that showed the white window.
- M4479 checked: the login token is stored in SecureStore, restored on start, and cleared only when it has expired. A network failure keeps it (offline screen). No change needed.
- New guard v5_99_46_b292_sign_in_fields (5 checks) and the rail guard v5_99_45 (4 checks), both in the release gate.
- Older tests updated to match the new structure: homeTicker, v5_99_5_b251 rails, v5_21_0_access_block (password field now in PasswordInput).

## What this does NOT claim
The cause of the rail text starting in the middle was not seen on a phone. The rebuild removes the stale-value risk but is untested on a device.

## Checked
New guards 9 of 9. 96 older test files that read the touched files pass.

## NOT tested
Phone, new build, full typecheck (node_modules not installed), Playwright.

## Next
Menu row chevron on its own line (M4482), Ball House loading (M4483), Marketplace 502 recheck (M4484), menu-row guard (M4467).
