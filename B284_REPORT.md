# B284 — V5.99.38 (checkpoint 13)

## Changed
- NEW NEXA_ENVIRONMENT_NOTES.md (project root): where the test server (Codespace Docker), the Expo settings and the builds live, how to restart the server and build the APK, and what must never be put in a zip or sent to an AI. It holds no tokens, keys or passwords.
- No source file changed.

## Checked
- The note was scanned for secrets (tokens, keys, passwords): none.
- release:ship checks, seal and zip run as normal.

## NOT tested
Phone, full typecheck (no node_modules), EAS, Playwright, the dotenv and better-sqlite3 files.

## Known limits
Nothing open inside the app. M4147 and the environment-only files stay parked.
