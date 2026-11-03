# NEXA Main — B600 execution report

- **Identity:** V6.2.54 B600, build 6419 (advanced by `npm run release:bump`).
- **Single focus:** harden notification-retention day parsing against JavaScript implicit coercion.
- **Source:** `server/dataRetention.js` now accepts only primitive numeric values and numeric strings; booleans, arrays, objects, boxed numbers and symbols fall back safely.
- **Regression coverage:** `server/dataRetention.test.js` covers accepted numeric strings/fractional numbers and rejected coercible non-scalar values.
- **Focused verification:** 10 passed, 0 failed, 1 skipped. The skipped case is the existing real HTTP/SQLite failure-injection test.
- **Full contract suite:** attempted with the required `NODE_OPTIONS=--experimental-strip-types CI=true` invocation, but exceeded the available command window after tests 1–645. NOT PASSED / NOT COMPLETED.
- **Not run:** full server suite, dependency-backed typecheck, device/browser/native acceptance, live provider integrations.
- **Roadmap:** M7526 retains its TESTED/PASSED source/contract status with this additional malformed-config evidence. M7527 remains BLOCKED; no runtime test was bypassed.
- **Release:** development checkpoint only; not sealed or shipped.
