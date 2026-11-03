# Local Dependency and Build Gates

These checks are local-only and read-only. They do not install packages, download browsers, contact provider APIs, or edit operating-system SDK settings.

## Commands

- `npm run deps:preflight` checks Node/npm support, root/server manifest alignment, lockfile version and package entries, installed dependency manifests, registry host, offline mode, and safe remediation hints. It exits `2` when the environment is not reproducible.
- `npm run environment:preflight` reports Node/npm, Java, Android SDK/adb/Gradle, project Gradle wrapper, Playwright/browser cache, Expo TypeScript base config, React/React Native/Node type declarations, web-export prerequisites, better-sqlite3/Node ABI/native toolchain, and iOS host prerequisites.
- `npm run web:preflight` checks Expo, React, React Native and React Native Web before an export. It does not run the export.
- `npm run preview:smoke` checks server dependencies and requires a loopback URL before invoking the smoke test. It preserves the smoke process exit code.
- `npm run walk` checks source syntax, relative imports, routes and TypeScript syntax. It does not claim a dependency-backed TypeScript typecheck.
- `npm run verify:contract` runs the local contract suite.

## Reporting rules

- Missing dependencies and unavailable build tools are reported distinctly from product-contract failures.
- A test marked skipped remains skipped; it is never counted as a pass.
- The server test runner has both per-test and whole-suite timeouts. On POSIX, timeout termination targets the runner process group and escalates from `SIGTERM` to `SIGKILL` after a grace period.
- Release-gate output separates source/contract evidence from runtime-server, typecheck, browser, device, native-build and live-provider acceptance.
- A preflight never rewrites `package-lock.json` or release identity. Restore dependencies with `npm ci` only when registry access is available and installation is authorized; no install was attempted for the B503 checkpoint.

## B503 environment observation

The current workspace is on Node 22.16.0 and npm 10.9.2. The lockfile metadata checks pass, but the dependency manifests for 34 root packages and 9 server packages are absent from the workspace. Expo/React/React Native declarations, Playwright/browser cache, Android SDK/adb/Gradle, and the better-sqlite3 native module are not available here. Java is installed. iOS native build prerequisites cannot be exercised on this Linux host. These conditions are documented rather than treated as passing runtime acceptance.
