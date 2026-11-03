# B262 — V5.99.16 (M4175–M4199, internal source audit)

## Repaired (2)
1. Raw error text on server errors. Signup, login, session rotation, Google sign-in start, account export, account import, and the Kitchen and Yaayz service-fee settle routes answered a 500 with the error's own message. That message can be database or internal wording. They now use `clientErrorMessage`: a 5xx sends a fixed safe sentence, a 4xx keeps its message. The shared error handler already did this; these eight sites bypassed it.
2. External links. The vendor payment link (`VendorDashboard.tsx`) and Google sign-in link (`auth.tsx`) called the phone's link opener directly. They now go through `openPaymentUrl` and `openGoogleUrl` (HTTPS only, approved hosts only), as the B116 rule requires.

## Checked, no defect
JSON files (6), syntax of 628 server and script files, eval/innerHTML, plain http links, dynamic SQL (all names hard-coded, all values bound), signup/login rate limits, body/upload/CORS limits, timing-safe compares, money parsing, timers and listeners. The Fitness PDF fallback opens a bundled local file, so it is a deliberate exemption in the guard.

## Tests
Guard `v5_99_16_b262_block_m4175_guards.contract.test.js`: 5/5 PASS. Mutation-checked: putting each defect back makes it fail (3/5 pass, 2 fail), restoring passes 5/5. Release gate contracts: 218/218 PASS.

## Deferred
M4147 device sweep, M4161 dark error-text contrast (owner approval), M4165 unused imports (needs tsc), M4166 manual Home spacing control (owner confirmation), M4190 123 empty catch blocks (counted, not reviewed), M4191 6 index-keyed lists (counted, not reviewed).

## Not tested
On-phone rendering, EAS build, tsc (no node_modules), Playwright, Docker, and the server runtime tests. Both repairs are proven by source-level guard tests only; no live server or app was run.
