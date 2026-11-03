# B296 — V5.99.50 (Dami page had no back button)

## Cause found
The global Back / Home / Menu bar is hidden on /dami on purpose (the page "owns its chrome"). Dami's own header only draws a Close button when it is NOT embedded. The Dami page is embedded, so it had no Back and no Close at all. Only the phone's system back gesture worked.

## Changed
- src/NexaAI.tsx: new optional onBack prop. In embedded mode, when onBack is given, the header shows a 44px round "Go back" button on the left.
- src/app/dami.tsx: passes nexaGoBack. It goes to the previous screen, and to Home if there is nothing to go back to, so it never dead-ends.
- The global bar stays hidden on /dami, so there is only one back button.
- New guard v5_99_50_b296_dami_back (3 checks), in the release gate.

## What this does NOT claim
Home and the other screens are unchanged. I did not add Search, Home or Menu keys to Dami, only Back, as asked. Looks and position of the button were not seen on a phone.

## Checked
New guard 3 of 3. Older test files that read Dami or nav files: no new failures against the original V5.99.49.

## NOT tested
Phone, new build, full typecheck, Playwright.

## Next
M4465 needs a phone build to show the crash stack. M4485 phone re-check (blocked, needs phone).
