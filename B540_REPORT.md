# B540 report — V6.1.94 B540

Adds the NEXA app screen for the Zeeza sign-in code (the client work left open by B539).

## What changed
- `src/adminCodeEntry.ts` (new): plain helpers. Keep digits only (max 6), read the login reply, expire and restore a pending code step, and tell a wrong code (retry) from a dead challenge (sign in again).
- `src/AdminCodePrompt.tsx` (new): a bar over the app with a 6-digit field, Confirm, "Open my Zeeza inbox" and Sign out. It does not read or fill the code. The bar folds away while the inbox is open and comes back on tap.
- `src/auth.tsx`: when the login reply carries a challenge, the app keeps the ordinary session, remembers the pending step (saved so an app restart inside the five minutes keeps it), and shows the bar. Entering the code calls `/api/auth/admin-mfa/verify`, swaps in the verified token and logs out the ordinary session. Sign-out and session loss clear the pending step.
- `src/api.ts`: `verifyAdminLoginCode`.
- No server change.

## Tests
- `server/v6_1_93_app_admin_code_entry.test.js`: 8 of 8 (helper behaviour plus contract checks on the wiring).
- 490 existing tests that read `auth.tsx`, `api.ts` or `AuthGate`: 0 failures.
- Account and access suites (Zeeza login, admin security center, central access, identity): 117 of 117.

## Not tested
- Real device or browser run of the bar, keyboard behaviour, layout and the inbox hand-off (no Expo or node_modules here).
- Full `tsc` typecheck (no node_modules). The four edited client files were only syntax-checked.
- A real HTTP login against a running server.
- Sending a new code without signing in again (not built: the person signs in again after five minutes).
